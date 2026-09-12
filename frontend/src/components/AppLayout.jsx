import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useNavigate,
} from "react-router-dom";

import Sidebar from "./Sidebar";

import {
  checkRegistration,
  getCurrentUser,
  getConnectedAddress,
  getRoleName,
  getAgriTotalSupply,
} from "../services/blockchain";

import {
  clearAuthenticatedWallet,
  getAuthenticatedWallet,
} from "../services/session";


export default function AppLayout() {
  const navigate =
    useNavigate();

  const [address, setAddress] =
    useState("");

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    agriTotalSupply,
    setAgriTotalSupply,
  ] = useState("—");


  async function loadWalletUser() {
    const currentAddress =
      await getConnectedAddress();

    setAddress(currentAddress);

    try {
      const supply =
        await getAgriTotalSupply();

      setAgriTotalSupply(
        supply
      );
    } catch (err) {
      console.error(
        "Failed to load AGRI supply:",
        err
      );

      setAgriTotalSupply("—");
    }

    const registration =
      await checkRegistration();

    if (!registration.registered) {
      setUser(null);

      clearAuthenticatedWallet();

      navigate(
        "/access",
        { replace: true }
      );

      return;
    }

    const currentUser =
      await getCurrentUser();

    setUser(currentUser);
  }


  useEffect(() => {
    let active = true;


    async function initializeSession() {
      try {
        setLoading(true);


        // MetaMask unavailable
        if (!window.ethereum) {
          clearAuthenticatedWallet();

          navigate(
            "/access",
            { replace: true }
          );

          return;
        }


        // Read currently selected MetaMask account
        // without opening the MetaMask popup.
        const accounts =
          await window.ethereum.request({
            method: "eth_accounts",
          });


        const currentWallet =
          accounts?.[0]
            ?.toLowerCase() ||
          null;

        const authenticatedWallet =
          getAuthenticatedWallet();


        // No connected account,
        // no authenticated session,
        // or wallet changed.
        if (
          !currentWallet ||
          !authenticatedWallet ||
          currentWallet !==
            authenticatedWallet
        ) {
          clearAuthenticatedWallet();

          navigate(
            "/access",
            { replace: true }
          );

          return;
        }


        // Session is valid.
        if (active) {
          await loadWalletUser();
        }

      } catch (err) {
        console.error(
          "Failed to initialize session:",
          err
        );

        clearAuthenticatedWallet();

        navigate(
          "/access",
          { replace: true }
        );

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }


    function handleAccountsChanged(
      accounts
    ) {
      const authenticatedWallet =
        getAuthenticatedWallet();

      const newWallet =
        accounts?.[0]
          ?.toLowerCase() ||
        null;


      // Account disconnected OR
      // switched to another wallet.
      if (
        !newWallet ||
        !authenticatedWallet ||
        newWallet !==
          authenticatedWallet
      ) {
        clearAuthenticatedWallet();

        setAddress("");
        setUser(null);

        navigate(
          "/access",
          { replace: true }
        );
      }
    }


    function handleChainChanged() {
      // Changing network invalidates
      // the current frontend session too.
      clearAuthenticatedWallet();

      setAddress("");
      setUser(null);

      navigate(
        "/access",
        { replace: true }
      );
    }


    initializeSession();


    window.ethereum?.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum?.on(
      "chainChanged",
      handleChainChanged
    );


    return () => {
      active = false;

      window.ethereum?.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum?.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };

  }, [navigate]);


  function shortenAddress(value) {
    if (!value) {
      return "";
    }

    return `${value.slice(
      0,
      6
    )}...${value.slice(-4)}`;
  }


  if (loading) {
    return (
      <div className="app-shell">
        <main className="main-content">
          <div className="page-content">
            Loading account...
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="app-shell">

      <Sidebar user={user} />

      <main className="main-content">

        <header className="topbar">

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <span className="environment-badge">
              Sepolia Testnet
            </span>

            <strong>
              AGRI Supply:{" "}
              {agriTotalSupply} AGRI
            </strong>
          </div>


          <div className="wallet-placeholder">

            {user ? (
              <>
                <strong>
                  {user.name}
                </strong>

                {" · "}

                {getRoleName(
                  user.role
                )}

                {" · "}

                {shortenAddress(
                  address
                )}
              </>
            ) : (
              shortenAddress(
                address
              ) ||
              "Wallet not connected"
            )}

          </div>

        </header>


        <div className="page-content">

          <Outlet
            context={{
              user,
              address,
              refreshUser:
                loadWalletUser,
            }}
          />

        </div>

      </main>

    </div>
  );
}