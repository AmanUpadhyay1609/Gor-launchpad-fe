import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    createInitializeMintInstruction,
    getAssociatedTokenAddressSync,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    createInitializeTransferHookInstruction,
    createInitializeMetadataPointerInstruction,
    getMintLen,
    ExtensionType,
    createInitializeTransferFeeConfigInstruction,
    createInitializeInstruction,
    createUpdateFieldInstruction,
    getMint,
} from "@solana/spl-token";
import * as fs from "fs";
import bs58 from "bs58";

// Configuration
const KEYPAIR_PATH = "/home/admin/.config/solana/gor-testnet.json";
const NETWORK = "https://rpc.gorbchain.xyz";
const TRANSFER_HOOK = new PublicKey("AUMawxpGPoPbXmhSyTxSFV1tqNLzyQ2Swu6Agbu1XJij");

// Gorbagana chain specific program IDs
const TOKEN22_PROGRAM = new PublicKey("FGyzDo6bhE7gFmSYymmFnJ3SZZu3xWGBA7sNHXR7QQsn");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("4YpYoLVTQ8bxcne9GneN85RUXeN7pqGTwgPcY71ZL5gX");

const DECIMALS = 9;
const SUPPLY = 690_000_000_000;
const NAME = "BIHARI";
const SYMBOL = "BHR";
const URI = "http://localhost:8080/";
const TRANSFER_FEE_BASIS_POINTS = 500; // 5% transfer fee
const MAXIMUM_FEE = BigInt(999999999999999999); // Maximum fee in token units

// Set up connection and wallet
const connection = new Connection(NETWORK, {
    commitment: "confirmed",
    wsEndpoint: "wss://rpc.gorbchain.xyz/ws/",
});
const secretKeyUint8 = bs58.decode("your_base58_encoded_secret_key_here");
const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(secretKeyUint8)
);
const payer = walletKeypair;

// Function to calculate metadata space with proper Borsh serialization and TLV overhead
function calculateMetadataSpace(name: string, symbol: string, uri: string): number {
    // TokenMetadata uses Borsh serialization
    // Structure: update_authority (32) + mint (32) + name (4 + len) + symbol (4 + len) + uri (4 + len) + additional_metadata (4 + vec_items)
    const borshMetadataSize = (
        32 + // update_authority (32 bytes)
        32 + // mint (32 bytes)  
        4 + name.length + // name with length prefix (4 bytes)
        4 + symbol.length + // symbol with length prefix (4 bytes)
        4 + uri.length + // uri with length prefix (4 bytes)
        4 // additional_metadata vector length (4 bytes for empty vec)
    );

    // Add TLV overhead: type (2 bytes) + length (2 bytes) + padding if needed
    const tlvOverhead = 2 + 2; // type + length
    const totalMetadataSpace = tlvOverhead + borshMetadataSize;

    // Add some padding for safety (account for potential alignment or other factors)
    const paddedSpace = Math.ceil(totalMetadataSpace * 1.1); // 10% padding

    return paddedSpace;
}

// Main function to create token
async function createToken() {
    try {
        console.log("Creating SPL Token-2022 on Gorbagana chain with transfer hook, transfer fee, and metadata...");
        const mintKeypair = Keypair.generate();
        const mint = mintKeypair.publicKey;

        // Step 1: Create mint account with space for extensions
        console.log("Step 1: Creating mint account with transfer hook, transfer fee, and metadata pointer extensions...");

        // Calculate space needed for mint with extensions
        const extensions = [
            // ExtensionType.TransferHook,
            ExtensionType.MetadataPointer,
            // ExtensionType.TransferFeeConfig,

        ];

        const mintLen = getMintLen(extensions);
        console.log(`Allocating ${mintLen} bytes for mint account with extensions`);

        // Calculate minimum balance for rent exemption
        const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(mintLen);

        // Create a single transaction that:
        // 1. Creates the mint account with space for extensions
        // 2. Initializes the extensions
        // 3. Initializes the mint
        const createAndInitializeTx = new Transaction().add(
            // Create mint account with space for extensions only
            SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mint,
                lamports: rentExemptionAmount,
                space: mintLen,
                programId: TOKEN22_PROGRAM,
            }),

            // // Initialize transfer fee config
            // createInitializeTransferFeeConfigInstruction(
            //     mint,
            //     payer.publicKey, // Authority to update fees
            //     payer.publicKey, // Authority to withdraw withheld fees
            //     TRANSFER_FEE_BASIS_POINTS,
            //     MAXIMUM_FEE,
            //     TOKEN22_PROGRAM
            // ),

            // Initialize metadata pointer extension (pointing to mint itself)
            createInitializeMetadataPointerInstruction(
                mint,
                payer.publicKey,
                mint, // Point to mint itself for metadata storage
                TOKEN22_PROGRAM
            ),

            // // Initialize transfer hook extension
            // createInitializeTransferHookInstruction(
            //     mint,
            //     payer.publicKey,
            //     TRANSFER_HOOK,
            //     TOKEN22_PROGRAM
            // ),

            // Initialize mint
            createInitializeMintInstruction(
                mint,
                DECIMALS,
                payer.publicKey,
                payer.publicKey,
                TOKEN22_PROGRAM
            )
        );

        const createMintSignature = await sendAndConfirmTransaction(
            connection,
            createAndInitializeTx,
            [payer, mintKeypair],
            { commitment: "confirmed" }
        );

        console.log(`Mint account created and initialized! Signature: ${createMintSignature}`);
        console.log(`Mint address: ${mint.toBase58()}`);

        // Step 2: Initialize metadata with reallocation approach
        console.log("Step 2: Initializing token metadata with account reallocation...");

        try {
            const accountInfo = await connection.getAccountInfo(mint);
            if (accountInfo) {
                // Calculate exact metadata space needed
                const metadataSpace = calculateMetadataSpace(NAME, SYMBOL, URI);
                const newSize = accountInfo.data.length + metadataSpace;
                const additionalRent = await connection.getMinimumBalanceForRentExemption(newSize) -
                    await connection.getMinimumBalanceForRentExemption(accountInfo.data.length);

                console.log(`Current account size: ${accountInfo.data.length} bytes`);
                console.log(`Metadata space needed: ${metadataSpace} bytes`);
                console.log(`Total size needed: ${newSize} bytes`);
                console.log(`Additional rent needed: ${additionalRent} lamports`);

                if (additionalRent > 0) {
                    const transferIx = SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: mint,
                        lamports: additionalRent,
                    });

                    const transferTx = new Transaction().add(transferIx);
                    await sendAndConfirmTransaction(connection, transferTx, [payer], { commitment: "confirmed" });
                    console.log("✅ Additional rent transferred successfully");
                }

                // Initialize metadata
                const initMetadataInstruction = createInitializeInstruction({
                    programId: TOKEN22_PROGRAM,
                    metadata: mint,
                    updateAuthority: payer.publicKey,
                    mint: mint,
                    mintAuthority: payer.publicKey,
                    name: NAME,
                    symbol: SYMBOL,
                    uri: URI,
                });

                const metadataTx = new Transaction().add(initMetadataInstruction);
                const metadataSignature = await sendAndConfirmTransaction(
                    connection, metadataTx, [payer], { commitment: "confirmed" }
                );

                console.log(`✅ Metadata initialized successfully! Signature: ${metadataSignature}`);
            } else {
                console.error("❌ Could not fetch mint account info");
            }
        } catch (metadataError: any) {
            console.error("❌ Metadata initialization failed:", metadataError.message);
            if (metadataError.logs) {
                console.error("Transaction logs:");
                metadataError.logs.forEach((log: string, index: number) => {
                    console.error(`  ${index + 1}: ${log}`);
                });
            }
            console.log("⚠️  Continuing with token creation without metadata...");
            console.log("The token will work but won't have on-chain metadata.");
        }

        // Step 3: Create token account and mint tokens
        console.log("Step 3: Creating token account and minting tokens...");
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            payer.publicKey,
            false,
            "confirmed",
            {
                commitment: "confirmed",
            },
            TOKEN22_PROGRAM,
            ASSOCIATED_TOKEN_PROGRAM
        );

        console.log(`Token account created: ${tokenAccount.address.toBase58()}`);

        // Mint tokens
        console.log(`Minting ${SUPPLY} tokens to ${tokenAccount.address.toBase58()}...`);
        const supplyBigInt = BigInt(SUPPLY) * BigInt(10 ** DECIMALS);

        const mintToSignature = await mintTo(
            connection,
            payer,
            mint,
            tokenAccount.address,
            payer,
            supplyBigInt,
            [],
            {
                commitment: "confirmed",
            },
            TOKEN22_PROGRAM
        );

        console.log(`Tokens minted! Signature: ${mintToSignature}`);

        // Final output
        console.log("\n✅ Token creation complete on Gorbagana chain!");
        console.log(`Mint Address: ${mint.toBase58()}`);
        console.log(`Token Account: ${tokenAccount.address.toBase58()}`);
        console.log(`Supply: ${SUPPLY} tokens`);
        console.log(`Decimals: ${DECIMALS}`);
        console.log(`Name: ${NAME}`);
        console.log(`Symbol: ${SYMBOL}`);
        console.log(`URI: ${URI}`);
        console.log(`Transfer Fee: ${TRANSFER_FEE_BASIS_POINTS / 100}%`);
        console.log(`Maximum Fee: ${MAXIMUM_FEE} tokens`);
        console.log(`Token 2022 Program: ${TOKEN22_PROGRAM.toBase58()}`);
        console.log(`Associated Token Program: ${ASSOCIATED_TOKEN_PROGRAM.toBase58()}`);

    } catch (error: any) {
        console.error("❌ Error creating token:", error);
        if (error.logs) {
            console.error("Transaction logs:", error.logs);
        }
        process.exit(1);
    }
}

// Run
createToken();
