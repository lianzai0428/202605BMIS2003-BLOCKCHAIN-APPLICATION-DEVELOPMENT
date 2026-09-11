import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

import {
  agreements,
  dashboardStats,
  MOCK_ETH_TO_MYR,
} from "../mock/mockData";

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of agricultural trade agreements and milestone progress."
      />

      <section className="stats-grid">
        <StatCard
          title="Total Agreements"
          value={dashboardStats.totalAgreements}
          description="All agreements created"
        />

        <StatCard
          title="Active Agreements"
          value={dashboardStats.activeAgreements}
          description="Currently in progress"
        />

        <StatCard
          title="Completed Agreements"
          value={dashboardStats.completedAgreements}
          description="Successfully completed"
        />

        <StatCard
          title="Pending Milestones"
          value={dashboardStats.pendingMilestones}
          description="Require further action"
        />
      </section>

      <section className="info-banner">
        <div>
          <strong>Indicative ETH conversion</strong>
          <p>
            1 ETH ≈ RM {MOCK_ETH_TO_MYR.toLocaleString()}
          </p>
        </div>

        <small>
          Prototype display only. Live ETH/MYR conversion will be integrated
          separately.
        </small>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Recent Agreements</h2>
            <p>Latest agreement activity.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Agreement ID</th>
                <th>Product</th>
                <th>Buyer</th>
                <th>Value</th>
                <th>MYR Equivalent</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {agreements.map((agreement) => (
                <tr key={agreement.id}>
                  <td>
                    <strong>{agreement.id}</strong>
                  </td>

                  <td>{agreement.product}</td>
                  <td>{agreement.buyer}</td>

                  <td>{agreement.amountEth} ETH</td>

                  <td>
                    ≈ RM{" "}
                    {(
                      agreement.amountEth * MOCK_ETH_TO_MYR
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  <td>
                    <StatusBadge status={agreement.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}