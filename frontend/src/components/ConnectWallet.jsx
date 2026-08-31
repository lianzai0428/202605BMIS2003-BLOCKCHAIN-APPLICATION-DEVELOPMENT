import { useState } from "react";
import {
  connectWallet,
  LOCAL_CHAIN_ID,
} from "../services/blockchain";

function ConnectWallet() {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState("");

  async function handleConnect() {
    try {
      setError("");

      const result = await connectWallet();

      setWallet(result);

      if (result.chainId !== LOCAL_CHAIN_ID) {
        setError(
          `Wrong network. Please switch MetaMask to AGRI Logistics Local (Chain ID 1337).`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  return (
    <div>
      <button onClick={handleConnect}>
        Connect MetaMask
      </button>

      {wallet && (
        <div>
          <p>Wallet: {wallet.address}</p>
          <p>Chain ID: {wallet.chainId.toString()}</p>
          <p>Balance: {wallet.balance} ETH</p>
        </div>
      )}

      {error && (
        <p>{error}</p>
      )}
    </div>
  );
}

export default ConnectWallet;