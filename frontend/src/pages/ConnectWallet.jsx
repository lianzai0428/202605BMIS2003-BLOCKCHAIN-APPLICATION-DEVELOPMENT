import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

export default function ConnectWallet() {
  const navigate = useNavigate();

  const [connecting, setConnecting] =
    useState(false);

  const [switchingNetwork, setSwitchingNetwork] =
    useState(false);

  const [walletAddress, setWalletAddress] =
    useState("");

  const [isSepolia, setIsSepolia] =
    useState(false);

  const [error, setError] =
    useState("");

  const walletConnected =
    Boolean(walletAddress);

  const canContinue =
    walletConnected && isSepolia;

  function shortenAddress(address) {
    if (!address) return "";

    return `${address.slice(
      0,
      6
    )}...${address.slice(-4)}`;
  }

  async function checkCurrentWallet() {
    if (!window.ethereum) {
      return;
    }

    try {
      const accounts =
        await window.ethereum.request({
          method: "eth_accounts",
        });

      const chainId =
        await window.ethereum.request({
          method: "eth_chainId",
        });

      if (
        accounts &&
        accounts.length > 0
      ) {
        setWalletAddress(
          accounts[0]
        );
      } else {
        setWalletAddress("");
      }

      setIsSepolia(
        chainId === "0xaa36a7"
      );
    } catch (err) {
      console.error(
        "Unable to check current wallet:",
        err
      );
    }
  }

  useEffect(() => {
    checkCurrentWallet();

    if (!window.ethereum) {
      return;
    }

    function handleAccountsChanged(
      accounts
    ) {
      if (
        !accounts ||
        accounts.length === 0
      ) {
        setWalletAddress("");
        setError("");
        return;
      }

      setWalletAddress(
        accounts[0]
      );
    }

    function handleChainChanged(
      chainId
    ) {
      const sepolia =
        chainId === "0xaa36a7";

      setIsSepolia(sepolia);

      if (sepolia) {
        setError("");
      } else if (walletConnected) {
        setError(
          "Wallet connected, but the selected network is not Sepolia Testnet."
        );
      }
    }

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      window.ethereum?.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum?.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [walletConnected]);

  async function handleConnect() {
    setError("");

    if (!window.ethereum) {
      setError(
        "MetaMask is not detected. Please install MetaMask before continuing."
      );

      return;
    }

    try {
      setConnecting(true);

      const accounts =
        await window.ethereum.request({
          method:
            "eth_requestAccounts",
        });

      if (
        !accounts ||
        accounts.length === 0
      ) {
        throw new Error(
          "No wallet account was selected."
        );
      }

      const chainId =
        await window.ethereum.request({
          method: "eth_chainId",
        });

      const sepolia =
        chainId === "0xaa36a7";

      setWalletAddress(
        accounts[0]
      );

      setIsSepolia(sepolia);

      if (!sepolia) {
        setError(
          "Wallet connected, but the selected network is not Sepolia Testnet."
        );
      }
    } catch (err) {
      console.error(
        "Wallet connection failed:",
        err
      );

      if (err?.code === 4001) {
        setError(
          "MetaMask connection request was cancelled."
        );
      } else {
        setError(
          err?.message ||
            "Unable to connect MetaMask."
        );
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleSwitchToSepolia() {
    setError("");

    if (!window.ethereum) {
      setError(
        "MetaMask is not detected."
      );
      return;
    }

    try {
      setSwitchingNetwork(true);

      await window.ethereum.request({
        method:
          "wallet_switchEthereumChain",
        params: [
          {
            chainId: "0xaa36a7",
          },
        ],
      });

      const chainId =
        await window.ethereum.request({
          method: "eth_chainId",
        });

      const sepolia =
        chainId === "0xaa36a7";

      setIsSepolia(sepolia);

      if (!sepolia) {
        setError(
          "Unable to verify Sepolia Testnet."
        );
      }
    } catch (err) {
      console.error(
        "Sepolia network switch failed:",
        err
      );

      if (err?.code === 4001) {
        setError(
          "Network switch was cancelled in MetaMask."
        );
      } else if (err?.code === 4902) {
        setError(
          "Sepolia Testnet is not available in MetaMask."
        );
      } else {
        setError(
          err?.message ||
            "Unable to switch to Sepolia Testnet."
        );
      }
    } finally {
      setSwitchingNetwork(false);
    }
  }

  return (
    <div className="entry-page">
      <header className="entry-navbar">
        <div
          className="entry-brand clickable"
          onClick={() =>
            navigate("/")
          }
        >
          <div className="entry-brand-mark">
            A
          </div>

          <div>
            <strong>
              AgriChain
            </strong>

            <span>
              Supply Agreement DApp
            </span>
          </div>
        </div>

        <span className="entry-step">
          Step 1 of 2
        </span>
      </header>

      <main className="access-page-main">
        <div className="access-card">
          <div className="access-heading">
            <div className="access-icon">
              ◇
            </div>

            <h1>
              Connect Your Wallet
            </h1>

            <p>
              Connect MetaMask to access
              AgriChain securely.
            </p>
          </div>

          <div className="validation-list">

            {/* MetaMask */}
            <div className="validation-row">
              <div
                className={
                  window.ethereum
                    ? "validation-status success"
                    : "validation-status pending"
                }
              >
                {window.ethereum
                  ? "✓"
                  : "1"}
              </div>

              <div>
                <strong>
                  MetaMask
                </strong>

                <span>
                  {window.ethereum
                    ? "MetaMask detected"
                    : "MetaMask extension required"}
                </span>
              </div>
            </div>

            {/* Wallet */}
            <div className="validation-row">
              <div
                className={
                  walletConnected
                    ? "validation-status success"
                    : "validation-status pending"
                }
              >
                {walletConnected
                  ? "✓"
                  : "2"}
              </div>

              <div>
                <strong>
                  Wallet Connection
                </strong>

                <span>
                  {walletConnected
                    ? shortenAddress(
                        walletAddress
                      )
                    : "Connect a wallet account"}
                </span>
              </div>
            </div>

            {/* Network */}
            <div className="validation-row">
              <div
                className={
                  isSepolia
                    ? "validation-status success"
                    : "validation-status pending"
                }
              >
                {isSepolia
                  ? "✓"
                  : "3"}
              </div>

              <div>
                <strong>
                  Network Validation
                </strong>

                <span>
                  {isSepolia
                    ? "Connected to Sepolia Testnet"
                    : "Sepolia Testnet required"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="access-error">
              <strong>
                Connection Requirement
              </strong>

              <p>
                {error}
              </p>
            </div>
          )}

          {!walletConnected && (
            <button
              type="button"
              className="entry-primary-button access-main-button"
              onClick={
                handleConnect
              }
              disabled={
                connecting
              }
            >
              {connecting
                ? "Connecting..."
                : "Connect MetaMask"}
            </button>
          )}

          {walletConnected &&
            !isSepolia && (
              <button
                type="button"
                className="entry-primary-button access-main-button"
                onClick={
                  handleSwitchToSepolia
                }
                disabled={
                  switchingNetwork
                }
              >
                {switchingNetwork
                  ? "Switching Network..."
                  : "Switch to Sepolia"}
              </button>
            )}

          {canContinue && (
            <button
              type="button"
              className="entry-primary-button access-main-button"
              onClick={() =>
                navigate(
                  "/access"
                )
              }
            >
              Continue
            </button>
          )}

          <p className="access-security-note">
            AgriChain will never
            request your wallet
            private key or seed
            phrase.
          </p>
        </div>
      </main>
    </div>
  );
}