import { useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { agreements, MOCK_ETH_TO_MYR } from "../mock/mockData";

export default function Agreements() {
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered =
    statusFilter === "All"
      ? agreements
      : agreements.filter(
          (agreement) => agreement.status === statusFilter
        );

  return (
    <>
      <PageHeader
        title="View Agreements"
        description="Review existing trade agreements and their current status."
      />

      <section className="card">
        <div className="form-group compact-filter">
          <label htmlFor="statusFilter">Filter by agreement status</label>

          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Active</option>
            <option>Completed</option>
          </select>
        </div>

        <div className="agreement-grid">
          {filtered.map((agreement) => (
            <article className="agreement-card" key={agreement.id}>
              <div className="agreement-card-header">
                <div>
                  <span className="eyebrow">Agreement</span>
                  <h3>{agreement.id}</h3>
                </div>

                <StatusBadge status={agreement.status} />
              </div>

              <dl className="details-list">
                <div>
                  <dt>Product</dt>
                  <dd>{agreement.product}</dd>
                </div>

                <div>
                  <dt>Buyer</dt>
                  <dd>{agreement.buyer}</dd>
                </div>

                <div>
                  <dt>Seller</dt>
                  <dd>{agreement.seller}</dd>
                </div>

                <div>
                  <dt>Carrier</dt>
                  <dd>{agreement.carrier}</dd>
                </div>

                <div>
                  <dt>Agreement Value</dt>
                  <dd>
                    {agreement.amountEth} ETH
                    <span className="secondary-value">
                      ≈ RM{" "}
                      {(
                        agreement.amountEth * MOCK_ETH_TO_MYR
                      ).toLocaleString()}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt>Required Delivery Date</dt>
                  <dd>{agreement.deliveryDate}</dd>
                </div>
              </dl>

              <div className="progress-block">
                <div>
                  <span>Agreement progress</span>
                  <strong>{agreement.progress}%</strong>
                </div>

                <progress
                  value={agreement.progress}
                  max="100"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}