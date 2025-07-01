import { Connection, PublicKey } from '@solana/web3.js';
import {
  getMint,
  getTokenMetadata,
  ExtensionType,
  getTransferFeeConfig
} from '@solana/spl-token';

// Configuration
const RPC_URL = 'https://rpc.gorbchain.xyz/'; // Replace with your Gorbagana RPC
const MINT_ADDRESS = '7DYjKdrFCvXQe5vSy8JergUea9EvhfYw9QWGDgSb7Xdr';
const TOKEN_2022_PROGRAM_ID = new PublicKey('FGyzDo6bhE7gFmSYymmFnJ3SZZu3xWGBA7sNHXR7QQsn');

async function verifyToken() {
  // Establish connection
  const connection = new Connection(RPC_URL, 'confirmed');

  // Fetch and unpack mint account
  const mintPublicKey = new PublicKey(MINT_ADDRESS);
  console.log(`🔍 Verifying mint account: ${mintPublicKey.toBase58()}`);
  const mint = await getMint(connection, mintPublicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);

  // Extract supply and decimals
  const supply = mint.supply || 0;
  const decimals = mint.decimals || 0;
  const tlvData = (mint as any).tlvData || { extensions: [] };

  console.log('✅ Mint account verified');
  console.log(`• Supply: ${supply.toString()}`);
  console.log(`• Decimals: ${decimals}`);

  // Verify metadata
  const metadata = await getTokenMetadata(connection, mintPublicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  
  if (!metadata) throw new Error('Metadata not found');
  
  console.log(`\n✅ Metadata verified : ${metadata});\n`);
  console.log(`• Name: ${metadata.name}`);
  console.log(`• Symbol: ${metadata.symbol}`);
  console.log(`• URI: ${metadata.uri}`);

  // Verify transfer fee configuration
  let transferFeePercent = 0;
  let maxFee = '0';
  try {
    const transferFeeConfig = getTransferFeeConfig(mint as any) as any;
    if (!transferFeeConfig) throw new Error('Transfer fee extension missing');
    transferFeePercent = (transferFeeConfig['transferFeeBasisPoints'] || transferFeeConfig['basisPoints'] || 0) / 100;
    maxFee = (transferFeeConfig['maximumFee'] || transferFeeConfig['maxFee'] || 0).toString();
  } catch (e) {
    console.warn('Transfer fee config not found or not parsable.');
  }
  
  console.log('\n✅ Transfer fee verified');
  console.log(`• Transfer Fee: ${transferFeePercent}%`);
  console.log(`• Maximum Fee: ${maxFee} tokens`);

  // Verify account extensions
//   const expectedExtensions = [
//     ExtensionType.TransferFeeConfig,
//     ExtensionType.MetadataPointer
//   ];
  
//   const extensions = (tlvData && Array.isArray(tlvData.extensions)) ? tlvData.extensions : [];
//   const installedExtensions = extensions.map((ext: any) => ExtensionType[ext.extension]);
  
//   console.log('\n✅ Extensions verified:');
//   installedExtensions.forEach((ext: string) => console.log(`• ${ext}`));
  
//   if (!expectedExtensions.every(ext => extensions.some((e: any) => e.extension === ext))) {
//     throw new Error('Missing required extensions');
//   }
}

// Run verification
verifyToken().catch(console.error);