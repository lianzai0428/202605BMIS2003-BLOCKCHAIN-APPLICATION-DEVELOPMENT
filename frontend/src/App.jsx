import { useState } from "react";
import { ethers } from "ethers";

function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [balance, setBalance] = useState("");

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const network = await provider.getNetwork();

      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);

      setAccount(address);
      setChainId(network.chainId.toString());
      setBalance(balanceEth);

      console.log("Wallet:", address);
      console.log("Chain ID:", network.chainId.toString());
      console.log("Balance:", balanceEth, "ETH");
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  }

  return (
    <div>
      <h1>AGRI Logistics Platform</h1>

      <button onClick={connectWallet}>
        Connect MetaMask
      </button>

      {account && (
        <>
          <p>Wallet: {account}</p>
          <p>Chain ID: {chainId}</p>
          <p>Balance: {balance} ETH</p>
        </>
      )}
    </div>
  );
}

export default App;