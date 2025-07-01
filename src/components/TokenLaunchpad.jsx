import { Connection } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { usePreviousTokens } from "../hooks/usePreviousTokens";
import { Table } from "./Table";
import { storeTokenLaunch } from "../hooks/storeTokenData";
import { mintGorbToken } from "../gorb/mintGorbToken";

export function TokenLaunchpad() {
  // const httpsConnection = new Connection("https://rpc.gorbchain.xyz")
  const RPC_ENDPOINT = "https://rpc.gorbchain.xyz";
  const WS_ENDPOINT = "wss://rpc.gorbchain.xyz/ws/";
  const httpsConnection = new Connection(RPC_ENDPOINT, {
    commitment: "confirmed",
    wsEndpoint: WS_ENDPOINT,
    disableRetryOnRateLimit: false,
  });
  const { connection } = useConnection();
  const wallet = useWallet();

  const [network, setNetwork] = useState("solana-devnet");
  // Use the custom hook to get previous tokens
  const { previousTokens, loading, error } = usePreviousTokens(wallet);

  const [balance, setBalance] = useState(0); // Add state for balance

  async function fetchBalance() {
    if (wallet.publicKey) {
      const balance = await connection.getBalance(wallet.publicKey);
      setBalance(balance / 1e9); // Convert lamports to SOL
    }
  }

  // Call fetchBalance when the network changes or wallet changes
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
      if (!name) {
        return alert("Name is required..!");
      }
      if (!symbol) {
        return alert("Symbole is required..!");
      }
      if (!supply) {
        return alert("Supply is required..!");
      }
      if (!img) {
        return alert("Image is required..!");
      }
      if (!decimal) {
        return alert("Decimal is required..!");
      }
      // Use the new Gorb mint function
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

return (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
      padding: "20px",
      overflowY: "auto",
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
        padding: "40px 30px",
        width: "100%",
        maxWidth: "500px",
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          marginBottom: "25px",
          color: "#2c3e50",
          fontSize: "2.2rem",
          fontWeight: "700",
          textShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        Solana Token Launchpad
      </h1>

      <div style={{ position: "relative", marginBottom: "20px" }}>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "12px",
            border: "2px solid #e0e7ff",
            backgroundColor: "#f8faff",
            fontSize: "16px",
            fontWeight: "500",
            color: "#2c3e50",
            appearance: "none",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="solana-devnet">solana-devnet</option>
        </select>
        <div
          style={{
            position: "absolute",
            right: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "#2c3e50",
            fontSize: "16px",
          }}
        >
          ▼
        </div>
      </div>

      {[
        { id: "name", placeholder: "Token Name", required: true },
        { id: "symbol", placeholder: "Token Symbol", required: true },
        { id: "img", placeholder: "Image URL" },
        { id: "supply", placeholder: "Initial Supply" },
        { id: "decimal", placeholder: "Token Decimal" },
      ].map((input) => (
        <input
          key={input.id}
          id={input.id}
          className="inputText"
          type="text"
          placeholder={input.placeholder}
          required={input.required}
          style={{
            width: "90%",
            padding: "14px 20px",
            margin: "10px 0",
            borderRadius: "12px",
            border: "2px solid #e0e7ff",
            backgroundColor: "#f8faff",
            fontSize: "16px",
            transition: "all 0.3s ease",
            outline: "none",
            color: "#2c3e50",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#4d79ff";
            e.target.style.boxShadow = "0 0 0 3px rgba(77, 121, 255, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e0e7ff";
            e.target.style.boxShadow = "none";
          }}
        />
      ))}

      <button
        id="btn"
        onClick={createToken}
        className="btn"
        style={{
          background: "linear-gradient(to right, #6a11cb, #2575fc)",
          color: "white",
          border: "none",
          padding: "16px 32px",
          margin: "25px 0 15px",
          borderRadius: "12px",
          fontSize: "18px",
          fontWeight: "600",
          cursor: "pointer",
          width: "100%",
          boxShadow: "0 4px 15px rgba(37, 117, 252, 0.4)",
          transition: "all 0.3s ease",
          transform: "translateY(0)",
        }}
        onMouseOver={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 6px 20px rgba(37, 117, 252, 0.6)";
        }}
        onMouseOut={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 4px 15px rgba(37, 117, 252, 0.4)";
        }}
      >
        Create a token
      </button>

      {wallet.publicKey && (
        <p
          style={{
            margin: "15px 0",
            fontSize: "16px",
            fontWeight: "500",
            color: "#2c3e50",
            backgroundColor: "#e8f4ff",
            padding: "12px",
            borderRadius: "10px",
          }}
        >
          Wallet Balance: {balance} SOL
        </p>
      )}

      {/* Status Messages */}
      <div style={{ marginTop: "20px" }}>
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "3px solid rgba(37, 117, 252, 0.2)",
                borderTop: "3px solid #2575fc",
                borderRadius: "50%",
                marginRight: "10px",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p>Loading previous tokens...</p>
          </div>
        )}

        {error && (
          <p
            style={{
              color: "#ff4757",
              backgroundColor: "#fff0f0",
              padding: "12px",
              borderRadius: "10px",
              fontWeight: "500",
              margin: "10px 0",
            }}
          >
            Error: {error}
          </p>
        )}

        {wallet?.publicKey &&
          !loading &&
          !error &&
          previousTokens.length > 0 && (
            <div
              style={{
                marginTop: "25px",
                borderTop: "1px solid #eee",
                paddingTop: "25px",
              }}
            >
              <Table tokens={previousTokens} />
            </div>
          )}

        {!loading && !error && previousTokens?.length === 0 && (
          <p
            style={{
              color: "#7f8c8d",
              fontStyle: "italic",
              margin: "15px 0",
            }}
          >
            No token launch happened for this wallet address.
          </p>
        )}
      </div>
    </div>

    <style>{`
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 768px) {
        div > div {
          padding: 30px 20px !important;
        }

        h1 {
          font-size: 1.8rem !important;
        }

        input,
        select,
        button {
          padding: 12px 15px !important;
          font-size: 15px !important;
        }
      }

      @media (max-width: 480px) {
        div > div {
          padding: 25px 15px !important;
          border-radius: 16px !important;
        }

        h1 {
          font-size: 1.6rem !important;
          margin-bottom: 20px !important;
        }
      }
    `}</style>
  </div>
);
}
