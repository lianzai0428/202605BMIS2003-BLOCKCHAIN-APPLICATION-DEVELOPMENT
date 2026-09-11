import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  function handleLogin() {
    setError("");
    setSuccess("");

    /*
     * Blockchain registration validation
     * will later replace this mock step.
     */

    setSuccess(
      "Wallet validated successfully. User registration check will be connected to the smart contract."
    );
  }

  function handleRegister(event) {
    event.preventDefault();

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

    /*
     * Actual registerUser smart contract
     * call will be connected later.
     */

    setSuccess(
      "Registration information is valid. Smart contract registration will be integrated next."
    );
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
                  The smart contract will be
                  checked to confirm whether
                  this wallet address is already
                  registered.
                </p>
              </div>

              <button
                type="button"
                className="entry-primary-button access-main-button"
                onClick={handleLogin}
              >
                Validate Existing User
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

                  <option value="Buyer">
                    Buyer
                  </option>

                  <option value="Seller">
                    Seller
                  </option>

                  <option value="Carrier">
                    Carrier
                  </option>
                </select>
              </div>

              <div className="registration-note">
                <strong>
                  Blockchain Registration
                </strong>

                <p>
                  Your connected wallet address
                  will be used as your AgriChain
                  identity. Registration will
                  require a MetaMask transaction
                  when smart contract integration
                  is enabled.
                </p>
              </div>

              <button
                type="submit"
                className="entry-primary-button access-main-button"
              >
                Register User
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
                Validation Successful
              </strong>

              <p>
                {success}
              </p>

              <button
                type="button"
                className="access-continue-link"
                onClick={() =>
                  navigate(
                    "/dashboard"
                  )
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