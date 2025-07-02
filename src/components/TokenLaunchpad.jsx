import { Connection } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { usePreviousTokens } from "../hooks/usePreviousTokens";
import { Table } from "./Table";
import { storeTokenLaunch } from "../hooks/storeTokenData";
import { mintGorbToken } from "../gorb/mintGorbToken";

export function TokenLaunchpad() {
  const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
  const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
  const httpsConnection = new Connection(RPC_ENDPOINT, {
    commitment: "confirmed",
    wsEndpoint: WS_ENDPOINT,
    disableRetryOnRateLimit: false,
  });
  const { connection } = useConnection();
  const wallet = useWallet();

  const [network, setNetwork] = useState("gorbagana-devnet");
  const { previousTokens, loading, error } = usePreviousTokens(wallet);
  const [balance, setBalance] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      // If no preference, use system
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState("token");

  // Sync with system preference on mount
  useEffect(() => {
    if (!localStorage.getItem('theme')) {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemDark);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  async function fetchBalance() {
    if (wallet.publicKey) {
      const balance = await connection.getBalance(wallet.publicKey);
      setBalance(balance / 1e9);
    }
  }

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, wallet.publicKey]);

  async function createToken() {
    try {
      const name = document.getElementById("name").value;
      const symbol = document.getElementById("symbol").value;
      const supply = document.getElementById("supply").value;
      const img = document.getElementById("img").value;
      const decimal = document.getElementById("decimal").value;
      if (!name) return alert("Name is required..!");
      if (!symbol) return alert("Symbole is required..!");
      if (!supply) return alert("Supply is required..!");
      if (!img) return alert("Image is required..!");
      if (!decimal) return alert("Decimal is required..!");
      const result = await mintGorbToken({
        connection: httpsConnection,
        wallet,
        name,
        symbol,
        supply,
        decimals: decimal,
        uri: img,
      });
      await storeTokenLaunch(
        result.tokenAccount,
        result.mintAddress,
        wallet.publicKey,
        name,
        symbol,
        img,
        supply,
        decimal,
        network
      );
      alert(`Token minted! Mint address: ${result.mintAddress}`);
      window.location.reload();
    } catch (error) {
      console.log("Error while minting... ", error);
      alert("Error while minting: " + (error?.message || error));
    }
  }

  // Dummy NFT launch function
  function launchNFT() {
    alert("NFT Launch function will be implemented here.");
  }

  return (
    <div className={`min-h-screen w-full bg-gorb-bg dark:bg-gorb-bg-dark transition-colors duration-300 flex flex-col items-center justify-center`}>
      <div className="flex flex-col items-center w-full max-w-2xl px-4 pt-10">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full mb-6 gap-4">
          <div className="flex items-center gap-4">
            <img src="https://www.gorbchain.xyz/images/logo.png" alt="Gorbagana Mascot" className="w-16 h-16 rounded-full bg-gorb-green-light shadow object-contain" style={{maxHeight: '64px', maxWidth: '64px'}} />
            {/* <button
              className="px-4 py-2 rounded-lg font-bold text-white bg-gorb-green dark:bg-gorb-green-dark shadow hover:bg-gorb-green-dark dark:hover:bg-gorb-green"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle dark mode"
            >
              {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button> */}
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              className={`px-4 py-2 rounded-lg font-bold shadow ${activeTab === 'token' ? 'bg-gorb-green text-white' : 'bg-white dark:bg-gorb-bg-dark text-gorb-green-dark dark:text-gorb-green border-2 border-gorb-green'}`}
              onClick={() => setActiveTab('token')}
            >
              Token Launchpad
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-bold shadow ${activeTab === 'nft' ? 'bg-gorb-green text-white' : 'bg-white dark:bg-gorb-bg-dark text-gorb-green-dark dark:text-gorb-green border-2 border-gorb-green'}`}
              onClick={() => setActiveTab('nft')}
            >
              NFT Launchpad
            </button>
          </div>
        </div>
        <div className="gorb-card w-full max-w-xl flex flex-col items-center">
          {activeTab === 'token' ? (
            <>
              <h1 className="text-3xl font-extrabold text-gorb-green-dark dark:text-gorb-green mb-4 text-center">Gorbagana Token Launchpad</h1>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="border-2 border-gorb-green rounded-gorb px-4 py-2 mb-4 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white w-full"
              >
                <option value="gorbagana-devnet">gorbagana-devnet</option>
                {/* <option value="solana-mainnet">solana-mainnet</option> */}
              </select>
              <input
                id="name"
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="Name"
                required
              />
              <input
                id="symbol"
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="Symbol"
                required
              />
              <input
                id="img"
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="Image URL"
              />
              <input
                id="supply"
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="Initial Supply"
              />
              <input
                id="decimal"
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="Token decimal"
              />
              <button
                id="btn"
                onClick={createToken}
                className="btn w-full bg-gorb-green dark:bg-gorb-green-dark text-white font-bold py-3 px-6 rounded-gorb mt-2 mb-2 shadow hover:bg-gorb-green-dark dark:hover:bg-gorb-green"
              >
                Create a token
              </button>
              {wallet.publicKey && (
                <p className="text-gorb-green-dark dark:text-gorb-green font-semibold mt-2 mb-2">Wallet Balance: {balance} SOL</p>
              )}
              {loading && <p>Loading previous tokens...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {wallet?.publicKey && !loading && !error && previousTokens.length > 0 && <Table tokens={previousTokens} />}
              {!loading && !error && previousTokens?.length === 0 && (
                <p>No token launch happened for this wallet address.</p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold text-gorb-green-dark dark:text-gorb-green mb-4 text-center">Gorbagana NFT Launchpad</h1>
              <input
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="NFT Name"
                required
              />
              <input
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="NFT Image URL"
                required
              />
              <input
                className="inputText block w-full border-2 border-gorb-green rounded-gorb px-4 py-3 mb-3 bg-white dark:bg-gorb-bg-dark text-gorb-accent dark:text-white"
                type="text"
                placeholder="NFT Description"
                required
              />
              <button
                onClick={launchNFT}
                className="btn w-full bg-gorb-green dark:bg-gorb-green-dark text-white font-bold py-3 px-6 rounded-gorb mt-2 mb-2 shadow hover:bg-gorb-green-dark dark:hover:bg-gorb-green"
              >
                Launch NFT (Dummy)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
