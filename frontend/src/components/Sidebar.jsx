import { NavLink } from "react-router-dom";

const links = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/agreements", label: "View Agreements" },
  { path: "/create-agreement", label: "Create Agreement" },
  { path: "/fund-agreement", label: "Fund Agreement" },
  { path: "/milestones", label: "Milestones" },
  { path: "/proof-upload", label: "Proof Submission" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>

        <div>
          <strong>AgriChain</strong>
          <span>Supply Agreement DApp</span>
        </div>
      </div>

      <div className="navigation-label">WORKSPACE</div>

      <nav>
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-info">
        <strong>Network</strong>
        <span>Sepolia Testnet</span>

        <small>
          Blockchain connection will be integrated separately.
        </small>
      </div>
    </aside>
  );
}