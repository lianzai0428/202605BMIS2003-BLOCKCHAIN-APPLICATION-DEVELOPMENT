import { useMemo, useState } from "react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

import {
  agreements,
  MOCK_ETH_TO_MYR,
} from "../mock/mockData";

export default function FundAgreement() {
  const fundableAgreements = agreements.filter(
    (agreement) => agreement.status !== "Completed"
  );

  const [selectedId, setSelectedId] = useState(
    fundableAgreements[0]?.id || ""
  );

  const selectedAgreement = useMemo(
    () =>
      fundableAgreements.find(
        (agreement) => agreement.id === selectedId
      ),
    [selectedId]
  );

  return (
    <>
      <PageHeader
        title="Fund Agreement"
        description="Select an agreement and review the required funding amount before initiating a blockchain payment."
      />

      <section className="card">
        <div className="form-group">
          <label htmlFor="fundAgreement">
            Agreement to fund
          </label>

          <select
            id="fundAgreement"
            value={selectedId}
            onChange={(event) =>
              setSelectedId(event.target.value)
            }
          >
            {fundableAgreements.map((agreement) => (
              <option value={agreement.id} key={agreement.id}>
                {agreement.id} — {agreement.product}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedAgreement && (
        <section className="card">
          <div className="card-header">
            <div>
              <span className="eyebrow">
                Selected Agreement
              </span>
              <h2>{selectedAgreement.id}</h2>
            </div>

            <StatusBadge status={selectedAgreement.status} />
          </div>

          <dl className="details-list details-two-column">
            <div>
              <dt>Product</dt>
              <dd>{selectedAgreement.product}</dd>
            </div>

            <div>
              <dt>Seller</dt>
              <dd>{selectedAgreement.seller}</dd>
            </div>

            <div>
              <dt>Required Funding</dt>
              <dd>{selectedAgreement.amountEth} ETH</dd>
            </div>

            <div>
              <dt>Indicative MYR Equivalent</dt>
              <dd>
                ≈ RM{" "}
                {(
                  selectedAgreement.amountEth *
                  MOCK_ETH_TO_MYR
                ).toLocaleString()}
              </dd>
            </div>
          </dl>

          <div className="info-banner">
            <div>
              <strong>Payment information</strong>
              <p>
                Funding will be executed through the smart
                contract after wallet integration.
              </p>
            </div>

            <small>
              ETH/MYR shown here is mock presentation data.
            </small>
          </div>

          <button
            disabled
            className="primary-button"
          >
            Fund via Wallet — Integration Pending
          </button>
        </section>
      )}
    </>
  );
}