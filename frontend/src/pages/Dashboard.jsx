import {
  useEffect,
  useState,
} from "react";

import {
  formatEthWithMyr,
} from "../utils/currency";

import PageHeader
  from "../components/PageHeader";

import StatCard
  from "../components/StatCard";

import StatusBadge
  from "../components/StatusBadge";

import {
  getDashboardOverview,
  getMilestones,
  getMilestoneEventAnalytics,
} from "../services/blockchain";

import {
  Link,
  useOutletContext,
} from "react-router-dom";


export default function Dashboard() {

  const {
    user,
    address,
  } = useOutletContext();

  const [agreements, setAgreements] =
    useState([]);

  const [statCards, setStatCards] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getDashboardOverview();

      const enriched =
        await Promise.all(
          result.agreements.map(
            async (agreement) => ({
              ...agreement,

              milestones:
                await getMilestones(
                  agreement.id
                ),
            })
          )
        );

      const wallet =
        address?.toLowerCase();

      let relevant = enriched;
      let cards = [];


      // SHIPPER
      if (user?.role === 1) {
        relevant =
          enriched.filter(
            (agreement) =>
              agreement.shipper
                ?.toLowerCase() ===
              wallet
          );

        cards = [
          {
            title: "My Agreements",
            value: relevant.length,
            description:
              "Agreements created by this Shipper",
          },
          {
            title: "In Progress",
            value:
              relevant.filter(
                (agreement) =>
                  [2, 3].includes(
                    agreement.statusNumber
                  )
              ).length,
            description:
              "Active or awaiting milestone approval",
          },
          {
            title: "Completed",
            value:
              relevant.filter(
                (agreement) =>
                  agreement.statusNumber === 4
              ).length,
            description:
              "Successfully completed agreements",
          },
          {
            title: "Posted",
            value:
              relevant.filter(
                (agreement) =>
                  agreement.statusNumber === 1
              ).length,
            description:
              "Open agreements awaiting a Carrier",
          },
        ];
      }


      // CARRIER
      else if (user?.role === 2) {
        const myAgreements =
          enriched.filter(
            (agreement) =>
              agreement.carrier
                ?.toLowerCase() ===
              wallet
          );

        const carrierAnalytics =
          await getMilestoneEventAnalytics(
            myAgreements.map(
              (agreement) =>
                agreement.id
            )
          );

        const available =
          enriched.filter(
            (agreement) =>
              agreement.statusNumber === 1
          );

        const combined =
          new Map();

        [
          ...myAgreements,
          ...available,
        ].forEach(
          (agreement) =>
            combined.set(
              agreement.id,
              agreement
            )
        );

        relevant =
          Array.from(
            combined.values()
          );

        cards = [
          {
            title: "My Agreements",
            value: myAgreements.length,
            description:
              "Agreements assigned to this Carrier",
          },
          {
            title: "Available Agreements",
            value: available.length,
            description:
              "Posted agreements available to accept",
          },
          {
            title: "Completed",
            value:
              myAgreements.filter(
                (agreement) =>
                  agreement.statusNumber === 4
              ).length,
            description:
              "Successfully completed agreements",
          },
          {
            title: "Proof Rejections",
            value:
              carrierAnalytics.rejections,
            description:
              "Historical rejected proof submissions",
          },
          {
            title: "Proof Resubmissions",
            value:
              carrierAnalytics.resubmissions,
            description:
              "Proofs submitted again after an earlier submission",
          },
          {
            title: "Approval Rate",
            value:
              carrierAnalytics.approvalRate ===
              null
                ? "—"
                : `${carrierAnalytics.approvalRate}%`,
            description:
              "Approved versus reviewed milestone proofs",
          },
        ];
      }


      // WAREHOUSE / CUSTOMS
      else if (
        user?.role === 3 ||
        user?.role === 4
      ) {
        relevant =
          enriched.filter(
            (agreement) =>
              agreement.milestones.some(
                (milestone) =>
                  milestone.approver
                    ?.toLowerCase() ===
                  wallet
              )
          );

        const assignedMilestones =
          relevant.flatMap(
            (agreement) =>
              agreement.milestones.filter(
                (milestone) =>
                  milestone.approver
                    ?.toLowerCase() ===
                  wallet
              )
          );

        const approverAnalytics =
          await getMilestoneEventAnalytics(
            relevant.map(
              (agreement) =>
                agreement.id
            ),
            address
          );

        cards = [
          {
            title: "Assigned Agreements",
            value: relevant.length,
            description:
              "Agreements requiring this organization",
          },
          {
            title: "Awaiting Review",
            value:
              assignedMilestones.filter(
                (milestone) =>
                  milestone.status === 1
              ).length,
            description:
              "Submitted proofs awaiting your decision",
          },
          {
            title: "Historical Approvals",
            value:
              approverAnalytics.approvals,
            description:
              "Milestones approved by this wallet",
          },
          {
            title: "Historical Rejections",
            value:
              approverAnalytics.rejections,
            description:
              "Milestones rejected by this wallet",
          },
          {
            title: "Approval Rate",
            value:
              approverAnalytics.approvalRate ===
              null
                ? "—"
                : `${approverAnalytics.approvalRate}%`,
            description:
              "Approval share of reviewed proofs",
          },
        ];
      }


      setAgreements(
        relevant
          .slice()
          .reverse()
          .slice(0, 10)
      );

      setStatCards(cards);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Failed to load dashboard."
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && address) {
      loadDashboard();
    }
  }, [user, address]);


  function shortenAddress(address) {
    if (!address) {
      return "-";
    }

    return `${address.slice(
      0,
      6
    )}...${address.slice(-4)}`;
  }

  function getAssignedMilestone(
    agreement
  ) {
    if (
      user?.role !== 3 &&
      user?.role !== 4
    ) {
      return null;
    }

    const wallet =
      address?.toLowerCase();

    const matches =
      agreement.milestones
        ?.map(
          (milestone, index) => ({
            ...milestone,
            index,
          })
        )
        .filter(
          (milestone) =>
            milestone.approver
              ?.toLowerCase() ===
            wallet
        ) || [];

    if (matches.length === 0) {
      return null;
    }

    return (
      matches.find(
        (milestone) =>
          milestone.status !== 2
      ) ||
      matches[
        matches.length - 1
      ]
    );
  }


  const dashboardMeta = {
    1: {
      description:
        "Manage your logistics agreements, funding and contract progress.",
      sectionTitle:
        "My Recent Agreements",
      sectionDescription:
        "Latest agreements created by this Shipper.",
    },

    2: {
      description:
        "Review available work and monitor your current Carrier commitments.",
      sectionTitle:
        "Carrier Agreements",
      sectionDescription:
        "Available agreements and agreements assigned to you.",
    },

    3: {
      description:
        "Review warehouse verification responsibilities and submitted milestone proofs.",
      sectionTitle:
        "Warehouse Assignments",
      sectionDescription:
        "Agreements containing milestones assigned to this Warehouse.",
    },

    4: {
      description:
        "Review customs verification responsibilities and submitted milestone proofs.",
      sectionTitle:
        "Customs Assignments",
      sectionDescription:
        "Agreements containing milestones assigned to this Customs Authority.",
    },
  }[user?.role] || {
    description:
      "Live overview of agricultural logistics agreements on Sepolia.",
    sectionTitle:
      "Recent Agreements",
    sectionDescription:
      "Latest on-chain agreement activity.",
  };


  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          dashboardMeta.description
        }
      />


      <section className="stats-grid">

        {loading ? (
          <>
            <StatCard
              title="Loading"
              value="..."
              description="Reading blockchain state"
            />

            <StatCard
              title="Loading"
              value="..."
              description="Reading blockchain state"
            />

            <StatCard
              title="Loading"
              value="..."
              description="Reading blockchain state"
            />

            <StatCard
              title="Loading"
              value="..."
              description="Reading blockchain state"
            />
          </>
        ) : (
          statCards.map(
            (card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                description={
                  card.description
                }
              />
            )
          )
        )}

      </section>


      <section className="info-banner">
        <div>
          <strong>
            Ethereum Sepolia Testnet
          </strong>

          <p>
            Dashboard information is read
            directly from deployed smart
            contracts.
          </p>
        </div>

        <small>
          Live blockchain data
        </small>
      </section>


      <section className="card">

        <div className="card-header">

  <div>
    <h2>
      {dashboardMeta.sectionTitle}
    </h2>

    <p>
      {dashboardMeta.sectionDescription}
    </p>
  </div>


  <div className="form-actions">

      {user?.role === 1 && (
        <>
          <Link
            to="/create-agreement"
            className="primary-button"
          >
            Create Agreement
          </Link>

          <Link
            to="/milestones"
            className="secondary-button"
          >
            Configure Milestones
          </Link>
        </>
      )}


      {user?.role === 2 && (
        <Link
          to="/agreements"
          className="primary-button"
        >
          Browse Agreements
        </Link>
      )}


      {(user?.role === 3 ||
        user?.role === 4) && (
        <Link
          to="/agreements"
          className="primary-button"
        >
          View Assigned Agreements
        </Link>
      )}

    </div>

  </div>


        {error && (
          <p
            style={{
              color: "red",
              padding: "16px",
            }}
          >
            {error}
          </p>
        )}


        {loading ? (
          <p
            style={{
              padding: "16px",
            }}
          >
            Loading agreements...
          </p>
        ) : (
          <div className="table-wrapper">
            <table>

              <thead>
                {user?.role === 1 && (
                  <tr>
                    <th>Agreement</th>
                    <th>Product</th>
                    <th>Carrier</th>
                    <th>Escrow</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                )}

                {user?.role === 2 && (
                  <tr>
                    <th>Agreement</th>
                    <th>Product</th>
                    <th>Shipper</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                )}

                {(user?.role === 3 ||
                  user?.role === 4) && (
                  <tr>
                    <th>Agreement</th>
                    <th>Product</th>
                    <th>Carrier</th>
                    <th>Assigned Milestone</th>
                    <th>Review State</th>
                    <th>Action</th>
                  </tr>
                )}
              </thead>


              <tbody>

                {agreements.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      No relevant agreements found.
                    </td>
                  </tr>
                ) : (
                  agreements.map(
                    (agreement) => {

                      const assignedMilestone =
                        getAssignedMilestone(
                          agreement
                        );

                      return (
                        <tr
                          key={agreement.id}
                        >

                          <td>
                            <strong>
                              #{agreement.id}
                            </strong>
                          </td>


                          <td>
                            {agreement.product}
                          </td>


                          {/* SHIPPER */}
                          {user?.role === 1 && (
                            <>
                              <td>
                                {shortenAddress(
                                  agreement.carrier
                                )}
                              </td>

                              <td>
                                {formatEthWithMyr(
                                  agreement.escrowEth
                                )}
                              </td>
                            </>
                          )}


                          {/* CARRIER */}
                          {user?.role === 2 && (
                            <>
                              <td>
                                {shortenAddress(
                                  agreement.shipper
                                )}
                              </td>

                              <td>
                                {agreement.origin}
                                {" → "}
                                {agreement.destination}
                              </td>
                            </>
                          )}


                          {/* WAREHOUSE / CUSTOMS */}
                          {(user?.role === 3 ||
                            user?.role === 4) && (
                            <>
                              <td>
                                {shortenAddress(
                                  agreement.carrier
                                )}
                              </td>

                              <td>
                                {assignedMilestone
                                  ? `Milestone ${
                                      assignedMilestone.index +
                                      1
                                    } — ${
                                      assignedMilestone.description
                                    }`
                                  : "—"}
                              </td>
                            </>
                          )}


                          <td>
                            {(user?.role === 3 ||
                              user?.role === 4) &&
                            assignedMilestone ? (
                              <StatusBadge
                                status={
                                  [
                                    "Pending",
                                    "Submitted",
                                    "Approved",
                                    "Rejected",
                                  ][
                                    assignedMilestone
                                      .status
                                  ]
                                }
                              />
                            ) : (
                              <StatusBadge
                                status={
                                  agreement.status
                                }
                              />
                            )}
                          </td>


                          <td>
                            <Link
                              to={`/agreements/${agreement.id}`}
                              className="secondary-button"
                            >
                              View
                            </Link>
                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>
          </div>
        )}

      </section>
    </>
  );
}