import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
const secretKeyUint8 = bs58.decode("your_base58_encoded_secret_key_here");

const admin = Keypair.fromSecretKey(secretKeyUint8);
