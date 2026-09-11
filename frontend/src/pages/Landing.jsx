import { useNavigate } from "react-router-dom";
import heroImage from "../assets/hero.png";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="entry-page">
      <header className="entry-navbar">
        <div className="entry-brand">
          <div className="entry-brand-mark">
            A
          </div>

          <div>
            <strong>AgriChain</strong>
            <span>
              Supply Agreement DApp
            </span>
          </div>
        </div>

        <span className="entry-network-badge">
          Sepolia Testnet
        </span>
      </header>

      <main className="landing-main">
        <section className="landing-copy">
          <div className="landing-eyebrow">
            Blockchain-Powered Supply Agreements
          </div>

          <h1>
            Trusted agricultural agreements,
            secured on blockchain.
          </h1>

          <p className="landing-description">
            AgriChain connects buyers, sellers and
            logistics providers through transparent
            supply agreements, milestone tracking and
            verifiable proof records.
          </p>

          <div className="landing-features">
            <div>
              <span>✓</span>
              Smart contract agreements
            </div>

            <div>
              <span>✓</span>
              Milestone-based workflow
            </div>

            <div>
              <span>✓</span>
              IPFS proof storage
            </div>
          </div>

          <div className="landing-actions">
            <button
              className="entry-primary-button"
              onClick={() =>
                navigate("/connect")
              }
            >
              Get Started
            </button>

            <span className="landing-action-note">
              MetaMask is required to access
              the DApp.
            </span>
          </div>
        </section>

        <section className="landing-visual">
          <div className="hero-glow" />

          <img
            src={heroImage}
            alt="AgriChain blockchain layers"
            className="landing-hero-image"
          />

          <div className="hero-info-card hero-info-top">
            <span>Network</span>
            <strong>Sepolia Testnet</strong>
          </div>

          <div className="hero-info-card hero-info-bottom">
            <span>Proof Storage</span>
            <strong>IPFS / Pinata</strong>
          </div>
        </section>
      </main>

      <footer className="entry-footer">
        AgriChain Prototype · Blockchain Application Development
      </footer>
    </div>
  );
}