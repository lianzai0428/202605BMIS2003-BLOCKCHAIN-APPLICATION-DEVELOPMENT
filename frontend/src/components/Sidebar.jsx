import { NavLink } from "react-router-dom";


const commonLinks = [
  {
    path: "/dashboard",
    label: "Dashboard",
  },
  {
    path: "/agreements",
    label: "Agreements",
  },
  {
    path: "/transactions",
    label: "Transaction History",
  },
];


const shipperLinks = [
  {
    path: "/create-agreement",
    label: "Create Agreement",
  },
  {
    path: "/milestones",
    label: "Milestones",
  },
  {
    path: "/fund-agreement",
    label: "Fund & Post",
  },
];


const carrierLinks = [
  {
    path: "/proof-upload",
    label: "Proof Submission",
  },
];


const approverLinks = [
  {
    path: "/approval-tasks",
    label: "Approval Tasks",
  },
];


function getRoleNumber(user) {
  if (!user) {
    return 0;
  }

  return Number(
    user.role ??
    user[1] ??
    0
  );
}


export default function Sidebar({
  user,
}) {
  const role =
    getRoleNumber(user);

  let roleLinks = [];


  // Shipper
  if (role === 1) {
    roleLinks =
      shipperLinks;
  }

  // Carrier
  else if (role === 2) {
    roleLinks =
      carrierLinks;
  }

  // Warehouse / Customs
  else if (
    role === 3 ||
    role === 4
  ) {
    roleLinks =
      approverLinks;
  }


  const links = [
    ...commonLinks,
    ...roleLinks,
  ];


  return (
    <aside className="sidebar">

      <div className="brand">

        <div className="brand-mark">
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


      <div className="navigation-label">
        WORKSPACE
      </div>


      <nav>

        {links.map(
          link => (

            <NavLink
              key={link.path}
              to={link.path}
              className={({
                isActive,
              }) =>
                `nav-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
            >
              {link.label}
            </NavLink>

          )
        )}

      </nav>


      <div className="sidebar-info">

        <strong>
          Network
        </strong>

        <span>
          Sepolia Testnet
        </span>

        <small>
          Connected to Ethereum
          Sepolia
        </small>

      </div>

    </aside>
  );
}