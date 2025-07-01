const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
// const fs = require('fs');
import fs from 'fs';

// Gorbagana chain specific program IDs
const TOKEN22_PROGRAM = new PublicKey('FGyzDo6bhE7gFmSYymmFnJ3SZZu3xWGBA7sNHXR7QQsn');
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('4YpYoLVTQ8bxcne9GneN85RUXeN7pqGTwgPcY71ZL5gX');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = ASSOCIATED_TOKEN_PROGRAM;

// Helper function to find associated token address
function findAssociatedTokenAddress(walletAddress:any, tokenMintAddress:any) {
    const [address] = PublicKey.findProgramAddressSync(
        [
            walletAddress.toBuffer(),
            TOKEN22_PROGRAM.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM
    );
    return address;
}

// Helper function to create associated token account instruction
function createAssociatedTokenAccountInstruction(
    payer:any,
    associatedToken:any,
    owner:any,
    mint:any
) {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN22_PROGRAM, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,
        programId: ASSOCIATED_TOKEN_PROGRAM,
        data: Buffer.alloc(0),
    });
}

// Helper function to get token account info
async function getTokenAccountInfo(connection:any, tokenAccount:any) {
    try {
        const accountInfo = await connection.getAccountInfo(tokenAccount);
        if (!accountInfo) {
            return null;
        }

        // Token account structure: mint(32) + owner(32) + amount(8) + ...
        const mint = new PublicKey(accountInfo.data.slice(0, 32));
        const owner = new PublicKey(accountInfo.data.slice(32, 64));
        const amount = accountInfo.data.readBigUInt64LE(64);

        return {
            mint: mint.toString(),
            owner: owner.toString(),
            amount: amount,
            exists: true
        };
    } catch (error) {
        return null;
    }
}

// Helper function to get mint info
async function getMintInfo(connection:any, mintAddress:any) {
    try {
        const accountInfo = await connection.getAccountInfo(mintAddress);
        if (!accountInfo) {
            throw new Error(`Mint account not found: ${mintAddress.toString()}`);
        }

        // Basic mint info - decimals at offset 44
        const decimals = accountInfo.data[44];

        return {
            decimals: decimals,
            exists: true
        };
    } catch (error:any) {
        throw new Error(`Failed to get mint info: ${error.message}`);
    }
}

async function transferTokens(mintAddress:any, recipientWalletAddress:string, amount:any, senderKeypairPath = '/home/admin/.config/solana/gor-testnet.json') {
    console.log('🔄 Token Transfer on Gorbagana Chain');
    console.log('====================================');

    const connection = new Connection('https://rpc.gorbchain.xyz', {
        commitment: 'confirmed',
        wsEndpoint: 'wss://rpc.gorbchain.xyz/ws/'
    });

    // Load the payer/sender
    const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(senderKeypairPath, 'utf8'))));

    // Convert inputs to PublicKeys
    const mint = new PublicKey(mintAddress);
    const recipientWallet = new PublicKey(recipientWalletAddress);

    console.log('📋 Transfer Details:');
    console.log('Mint Address:', mint.toString());
    console.log('Sender Wallet:', payer.publicKey.toString());
    console.log('Recipient Wallet:', recipientWallet.toString());
    console.log('Amount:', amount.toLocaleString(), 'tokens');
    console.log('Token22 Program:', TOKEN22_PROGRAM.toString());
    console.log('Associated Token Program:', ASSOCIATED_TOKEN_PROGRAM.toString());

    try {
        // Step 1: Get mint information
        console.log('\n📋 Getting mint information...');
        const mintInfo = await getMintInfo(connection, mint);
        console.log('✅ Mint decimals:', mintInfo.decimals);

        // Calculate transfer amount with decimals
        const transferAmount = BigInt(amount) * BigInt(10 ** mintInfo.decimals);
        console.log('Transfer Amount (raw):', transferAmount.toString());

        // Step 2: Calculate associated token addresses
        console.log('\n🔍 Calculating associated token addresses...');
        const senderTokenAccount = findAssociatedTokenAddress(payer.publicKey, mint);
        const recipientTokenAccount = findAssociatedTokenAddress(recipientWallet, mint);

        console.log('Sender Token Account:', senderTokenAccount.toString());
        console.log('Recipient Token Account:', recipientTokenAccount.toString());

        // Step 3: Check if accounts exist and get balances
        console.log('\n💰 Checking account balances...');

        const senderAccountInfo = await getTokenAccountInfo(connection, senderTokenAccount);
        if (!senderAccountInfo) {
            throw new Error('Sender token account does not exist. Please create it first or ensure you have tokens.');
        }

        const senderBalance = Number(senderAccountInfo.amount) / (10 ** mintInfo.decimals);
        console.log('✅ Sender balance:', senderBalance.toLocaleString(), 'tokens');

        if (senderAccountInfo.amount < transferAmount) {
            throw new Error(`Insufficient balance! Need ${amount.toLocaleString()} but only have ${senderBalance.toLocaleString()}`);
        }

        const recipientAccountInfo = await getTokenAccountInfo(connection, recipientTokenAccount);
        let recipientBalance = 0;
        let needToCreateRecipientAccount = false;

        if (recipientAccountInfo) {
            recipientBalance = Number(recipientAccountInfo.amount) / (10 ** mintInfo.decimals);
            console.log('✅ Recipient current balance:', recipientBalance.toLocaleString(), 'tokens');
        } else {
            console.log('⚠️  Recipient token account does not exist - will create it');
            needToCreateRecipientAccount = true;
        }

        // Step 4: Build transaction
        console.log('\n🔧 Building transaction...');
        const transaction = new Transaction();

        // Add create account instruction if needed
        if (needToCreateRecipientAccount) {
            console.log('📝 Adding create associated token account instruction...');
            const createAccountIx = createAssociatedTokenAccountInstruction(
                payer.publicKey,
                recipientTokenAccount,
                recipientWallet,
                mint
            );
            transaction.add(createAccountIx);
        }

        // Add transfer instruction
        console.log('📝 Adding transfer instruction...');

        // Transfer instruction data: instruction_type (3) + amount (8 bytes)
        const transferData = Buffer.alloc(9);
        transferData[0] = 3; // Transfer instruction

        // Write the amount as little-endian 64-bit integer
        const amountBuffer = Buffer.alloc(8);
        amountBuffer.writeBigUInt64LE(transferAmount, 0);
        amountBuffer.copy(transferData, 1);

        const transferIx = new TransactionInstruction({
            programId: TOKEN22_PROGRAM,
            keys: [
                { pubkey: senderTokenAccount, isSigner: false, isWritable: true },     // source
                { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },  // destination
                { pubkey: payer.publicKey, isSigner: true, isWritable: false },        // authority
            ],
            data: transferData,
        });

        transaction.add(transferIx);

        // Step 5: Execute transaction
        console.log('\n🚀 Executing transfer...');
        const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
        console.log('✅ Transfer Successful! Transaction:', signature);

        // Step 6: Verify the transfer
        console.log('\n🔍 Verifying transfer...');

        const newSenderAccountInfo = await getTokenAccountInfo(connection, senderTokenAccount);
        const newRecipientAccountInfo = await getTokenAccountInfo(connection, recipientTokenAccount);

        if (newSenderAccountInfo) {
            const newSenderBalance = Number(newSenderAccountInfo.amount) / (10 ** mintInfo.decimals);
            console.log('✅ Sender new balance:', newSenderBalance.toLocaleString(), 'tokens');
        }

        if (newRecipientAccountInfo) {
            const newRecipientBalance = Number(newRecipientAccountInfo.amount) / (10 ** mintInfo.decimals);
            console.log('✅ Recipient new balance:', newRecipientBalance.toLocaleString(), 'tokens');

            // Calculate the difference to confirm transfer amount
            const transferredAmount = newRecipientBalance - recipientBalance;
            console.log('✅ Amount transferred:', transferredAmount.toLocaleString(), 'tokens');
        }

        console.log('\n🎉 TOKEN TRANSFER COMPLETED!');
        console.log('============================');
        console.log('✅ Amount:', amount.toLocaleString(), 'tokens');
        console.log('✅ From:', payer.publicKey.toString());
        console.log('✅ To:', recipientWallet.toString());
        console.log('✅ Transaction:', signature);

        return {
            success: true,
            amount: amount,
            transferTransaction: signature,
            senderTokenAccount: senderTokenAccount.toString(),
            recipientTokenAccount: recipientTokenAccount.toString()
        };

    } catch (error:any) {
        console.log('\n❌ Error:', error.message);

        if (error.logs) {
            console.log('📜 Transaction Logs:');
            error.logs.forEach((log:any) => console.log('  ', log));
        }

        return {
            success: false,
            error: error.message
        };
    }
}

// Main execution function
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('Usage: node transfer.js <mint_address> <recipient_wallet> <amount> [sender_keypair_path]');
        console.log('');
        console.log('Parameters:');
        console.log('  mint_address        - The token mint address');
        console.log('  recipient_wallet    - The recipient wallet address');
        console.log('  amount             - Amount of tokens to transfer (in human readable format)');
        console.log('  sender_keypair_path - Optional: Path to sender keypair (default: /home/admin/.config/solana/gor-testnet.json)');
        console.log('');
        console.log('Examples:');
        console.log('  node transfer.js CkLAsfkygiduy49hDXw7RuivgUYJUJG5RTcP6et9y2uv 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 1000');
        console.log('  node transfer.js CkLAsfkygiduy49hDXw7RuivgUYJUJG5RTcP6et9y2uv 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 1000 /path/to/keypair.json');
        process.exit(1);
    }

    const [mintAddress, recipientWallet, amountStr, senderKeypairPath] = args;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
        console.error('❌ Amount must be a positive number');
        process.exit(1);
    }

    console.log('🌐 Connected to Gorbagana chain: https://rpc.gorbchain.xyz');
    console.log('🔧 Using Token 2022 Program:', TOKEN22_PROGRAM.toString());
    console.log('🔗 Using Associated Token Program:', ASSOCIATED_TOKEN_PROGRAM.toString());

    try {
        const result = await transferTokens(mintAddress, recipientWallet, amount, senderKeypairPath);

        if (result.success) {
            console.log('\n🎊 Transfer completed successfully!');
            process.exit(0);
        } else {
            console.error('\n❌ Transfer failed:', result.error);
            process.exit(1);
        }
    } catch (error:any) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Export the function for use in other scripts
module.exports = { transferTokens };

// Run if this file is executed directly
if (require.main === module) {
    main();
}
