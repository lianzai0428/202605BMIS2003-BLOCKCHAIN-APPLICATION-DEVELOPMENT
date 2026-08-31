import { ethers } from "ethers";

export const LOCAL_CHAIN_ID = 1337n;

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const balanceWei = await provider.getBalance(address);

  return {
    provider,
    signer,
    address,
    chainId: network.chainId,
    balance: ethers.formatEther(balanceWei),
  };
}