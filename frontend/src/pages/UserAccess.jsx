import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  checkRegistration,
  getCurrentUser,
  registerUser,
  getRoleName,
  getConnectedAddress,
} from "../services/blockchain";

import {
  setAuthenticatedWallet,
} from "../services/session";

export default function UserAccess() {
  const navigate = useNavigate();

  const [mode, setMode] =
    useState("login");

  const [name, setName] =
    useState("");

  const [role, setRole] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleLogin() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const registered =
        await checkRegistration();

      if (!registered) {
        setError(
          "This wallet is not registered. Please register first."
        );
        return;
      }

      const user =
        await getCurrentUser();

      const walletAddress =
        await getConnectedAddress();

      setAuthenticatedWallet(
        walletAddress
      );

      setSuccess(
        `Wallet validated as ${user.name} (${getRoleName(
          user.role
        )}).`
      );

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to validate user."
      );

    } finally {
      setLoading(false);
    }
  }


  async function handleRegister(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!name.trim()) {
        setError(
          "Please enter a display name."
        );
        return;
      }

      if (!role) {
        setError(
          "Please select a user role."
        );
        return;
      }

      const alreadyRegistered =
        await checkRegistration();

      if (alreadyRegistered) {
        setError(
          "This wallet is already registered."
        );
        return;
      }

      await registerUser(
        name.trim(),
        Number(role)
      );

      const user =
        await getCurrentUser();

      const walletAddress =
        await getConnectedAddress();

      setAuthenticatedWallet(
        walletAddress
      );

      setSuccess(
        `Registration successful as ${getRoleName(
          user.role
        )}.`
      );

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Registration failed."
      );

    } finally {
      setLoading(false);
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
          Step 2 of 2
        </span>

      </header>


      <main className="access-page-main">
        <div className="access-card user-access-card">

          <div className="access-heading">
            <h1>
              Access AgriChain
            </h1>

            <p>
              Continue as an existing user
              or register this wallet for
              the first time.
            </p>
          </div>


          <div className="access-tabs">

            <button
              type="button"
              className={
                mode === "login"
                  ? "access-tab active"
                  : "access-tab"
              }
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
            >
              Existing User
            </button>

            <button
              type="button"
              className={
                mode === "register"
                  ? "access-tab active"
                  : "access-tab"
              }
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
              }}
            >
              Register New User
            </button>

          </div>


          {mode === "login" && (
            <div className="access-panel">

              <div className="wallet-identity-box">
                <span>
                  Authentication Method
                </span>

                <strong>
                  Connected MetaMask Wallet
                </strong>

                <p>
                  AgriChain uses the connected
                  wallet address as the user's
                  blockchain identity.
                </p>
              </div>


              <div className="access-validation-info">
                <strong>
                  Existing User Validation
                </strong>

                <p>
                  UserRegistry will verify
                  whether the connected wallet
                  is registered on-chain.
                </p>
              </div>


              <button
                type="button"
                className="entry-primary-button access-main-button"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading
                  ? "Validating..."
                  : "Validate Existing User"}
              </button>

            </div>
          )}


          {mode === "register" && (
            <form
              className="access-panel"
              onSubmit={handleRegister}
            >

              <div className="entry-form-group">
                <label htmlFor="register-name">
                  Display Name
                </label>

                <input
                  id="register-name"
                  type="text"
                  value={name}
                  placeholder="Enter your name"
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                />
              </div>


              <div className="entry-form-group">
                <label htmlFor="register-role">
                  User Role
                </label>

                <select
                  id="register-role"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select role
                  </option>

                  <option value="1">
                    Shipper
                  </option>

                  <option value="2">
                    Carrier
                  </option>

                  <option value="3">
                    Warehouse
                  </option>

                  <option value="4">
                    Customs
                  </option>

                </select>
              </div>


              <div className="registration-note">
                <strong>
                  Blockchain Registration
                </strong>

                <p>
                  Your connected wallet address
                  will be registered through
                  UserRegistry on Sepolia.
                </p>
              </div>


              <button
                type="submit"
                className="entry-primary-button access-main-button"
                disabled={loading}
              >
                {loading
                  ? "Registering..."
                  : "Register User"}
              </button>

            </form>
          )}


          {error && (
            <div className="access-error">
              {error}
            </div>
          )}


          {success && (
            <div className="access-success">
              <strong>
                Success
              </strong>

              <p>
                {success}
              </p>

              <button
                type="button"
                className="access-continue-link"
                onClick={() =>
                  navigate("/dashboard")
                }
              >
                Continue to Dashboard →
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}