import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  ExtensionType,
  createInitializeInstruction,
} from "@solana/spl-token";

// Gorbagan chain specific program IDs
const TOKEN22_PROGRAM = new PublicKey("FGyzDo6bhE7gFmSYymmFnJ3SZZu3xWGBA7sNHXR7QQsn");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("4YpYoLVTQ8bxcne9GneN85RUXeN7pqGTwgPcY71ZL5gX");

// Helper to calculate metadata space
function calculateMetadataSpace(name: string, symbol: string, uri: string): number {
  const borshMetadataSize =
    32 + // update_authority
    32 + // mint
    4 + name.length +
    4 + symbol.length +
    4 + uri.length +
    4; // additional_metadata vec
  const tlvOverhead = 2 + 2;
  const totalMetadataSpace = tlvOverhead + borshMetadataSize;
  return Math.ceil(totalMetadataSpace * 1.1); // 10% padding
}

export async function mintGorbToken({
  connection,
  wallet,
  name,
  symbol,
  supply,
  decimals,
  uri,
}: {
  connection: Connection;
  wallet: any; // Wallet adapter
  name: string;
  symbol: string;
  supply: string | number;
  decimals: string | number;
  uri: string;
}) {
  const payer = wallet;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const extensions = [ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);
  const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(mintLen);

  // 1. Create mint account and initialize
  const createAndInitializeTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      lamports: rentExemptionAmount,
      space: mintLen,
      programId: TOKEN22_PROGRAM,
    }),
    createInitializeMetadataPointerInstruction(
      mint,
      payer.publicKey,
      mint,
      TOKEN22_PROGRAM
    ),
    createInitializeMintInstruction(
      mint,
      Number(decimals),
      payer.publicKey,
      payer.publicKey,
      TOKEN22_PROGRAM
    )
  );
  createAndInitializeTx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  createAndInitializeTx.recentBlockhash = blockhash;
  createAndInitializeTx.partialSign(mintKeypair);
  const signedTx = await wallet.signTransaction(createAndInitializeTx);
  const createMintSignature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
  await connection.confirmTransaction(createMintSignature, "confirmed");

  // 2. Initialize metadata
  const accountInfo = await connection.getAccountInfo(mint);
  if (accountInfo) {
    const metadataSpace = calculateMetadataSpace(name, symbol, uri);
    const newSize = accountInfo.data.length + metadataSpace;
    const additionalRent =
      (await connection.getMinimumBalanceForRentExemption(newSize)) -
      (await connection.getMinimumBalanceForRentExemption(accountInfo.data.length));
    if (additionalRent > 0) {
      const transferIx = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: mint,
        lamports: additionalRent,
      });
      const transferTx = new Transaction().add(transferIx);
      transferTx.feePayer = payer.publicKey;
      const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
      transferTx.recentBlockhash = blockhash2;
      const signedTx2 = await wallet.signTransaction(transferTx);
      const sig2 = await connection.sendRawTransaction(signedTx2.serialize(), { skipPreflight: true });
      await connection.confirmTransaction(sig2, "confirmed");
    }
    const initMetadataInstruction = createInitializeInstruction({
      programId: TOKEN22_PROGRAM,
      metadata: mint,
      updateAuthority: payer.publicKey,
      mint: mint,
      mintAuthority: payer.publicKey,
      name,
      symbol,
      uri,
    });
    const metadataTx = new Transaction().add(initMetadataInstruction);
    metadataTx.feePayer = payer.publicKey;
    const { blockhash: blockhash3 } = await connection.getLatestBlockhash();
    metadataTx.recentBlockhash = blockhash3;
    const signedTx3 = await wallet.signTransaction(metadataTx);
    const sig3 = await connection.sendRawTransaction(signedTx3.serialize(), { skipPreflight: true });
    await connection.confirmTransaction(sig3, "confirmed");
  }

  // 3. Create associated token account and mint tokens
  const associatedToken = getAssociatedTokenAddressSync(
    mint,
    payer.publicKey,
    false,
    TOKEN22_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM
  );
  const createATAIx = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    false,
    "confirmed",
    { commitment: "confirmed" },
    TOKEN22_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM
  );
  const supplyBigInt = BigInt(supply) * BigInt(10 ** Number(decimals));
  const mintToSig = await mintTo(
    connection,
    payer,
    mint,
    createATAIx.address,
    payer,
    supplyBigInt,
    [],
    { commitment: "confirmed" },
    TOKEN22_PROGRAM
  );
  return {
    mintAddress: mint.toBase58(),
    tokenAccount: createATAIx.address.toBase58(),
    supply: supply,
    decimals: decimals,
    name,
    symbol,
    uri,
    mintToSig,
  };
}
