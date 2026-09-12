import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";


import "./AgreementDetails.css";

import AgreementAuditTimeline
  from "../components/AgreementAuditTimeline";

import {
  getAgreementDetails,
  getAgreementAuditTrail,
} from "../services/blockchain";

import {
  ethToMyr,
  formatEthWithMyr,
} from "../utils/currency";


const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";



function shortAddress(address) {
  if (
    !address ||
    address === ZERO_ADDRESS
  ) {
    return "Not assigned";
  }

  return (
    address.slice(0, 8) +
    "..." +
    address.slice(-6)
  );
}


function Field({
  label,
  value,
  mono = false,
}) {
  return (
    <div className="agd-field">
      <span className="agd-field-label">
        {label}
      </span>

      <span
        className={
          mono
            ? "agd-field-value agd-mono"
            : "agd-field-value"
        }
      >
        {value ?? "—"}
      </span>
    </div>
  );
}


function Metric({
  label,
  value,
  sub,
}) {
  return (
    <div className="agd-metric">
      <div className="agd-metric-label">
        {label}
      </div>

      <div className="agd-metric-value">
        {value}
      </div>

      {sub && (
        <div className="agd-metric-sub">
          {sub}
        </div>
      )}
    </div>
  );
}


function SmallField({
  label,
  value,
}) {
  return (
    <div className="agd-small-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


export default function AgreementDetails() {
  const { agreementId } =
    useParams();

  const [details, setDetails] =
    useState(null);

  const [audit, setAudit] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    load();
  }, [agreementId]);


  async function load() {
    try {
      setLoading(true);
      setError("");

        const [
        result,
        auditResult,
        ] = await Promise.all([
        getAgreementDetails(
            agreementId
        ),

        getAgreementAuditTrail(
            agreementId
        ),
        ]);

        setDetails(result);
        setAudit(auditResult);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load agreement details."
      );

    } finally {
      setLoading(false);
    }
  }


  if (loading) {
    return (
      <div className="agd-page">
        <div className="agd-section">
          Loading agreement details...
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="agd-page">
        <div className="agd-section">
          {error}
        </div>
      </div>
    );
  }


    const {
    agreement,
    escrow,
    agri,
    participants,
    milestones,
    } = details;


  const approvedPercentage =
    milestones.reduce(
      (sum, milestone) =>
        milestone.status === 2
          ? sum +
            Number(
              milestone
                .paymentPercentage
            )
          : sum,
      0
    );


  const agreementStatusClass =
    agreement.status
      .toLowerCase()
      .replaceAll(" ", "-");


  const milestoneStatusNames = [
    "Pending",
    "Submitted",
    "Approved",
    "Rejected",
  ];


  return (
    <div className="agd-page">

      <Link
        to="/agreements"
        className="agd-back"
      >
        ← Back to Agreements
      </Link>


      {/* HERO */}

      <section className="agd-hero">

        <div className="agd-hero-top">

          <div>
            <div className="agd-eyebrow">
              Agreement #{agreement.id}
            </div>

            <h1>
              {agreement.product}
            </h1>

            <div className="agd-route">
              {agreement.origin}
              {"  →  "}
              {agreement.destination}
            </div>
          </div>


          <span
            className={
              `agd-status ${agreementStatusClass}`
            }
          >
            {agreement.status}
          </span>

        </div>

      </section>


      {/* QUICK SUMMARY */}

      <div className="agd-metrics">

        <Metric
            label="Escrow Required"
            value={formatEthWithMyr(
                escrow.required
            )}
            sub={`Funded: ${formatEthWithMyr(
                escrow.funded
            )}`}
            />

            <Metric
            label="Released"
            value={formatEthWithMyr(
                escrow.released
            )}
            sub="Paid to Carrier"
            />

            <Metric
            label="Remaining Escrow"
            value={formatEthWithMyr(
                escrow.remaining
            )}
            sub="Currently locked"
            />

        <Metric
          label="Milestone Progress"
          value={`${approvedPercentage}%`}
          sub={`${milestones.filter(
            m => m.status === 2
          ).length} of ${milestones.length} approved`}
        />

      </div>


      {/* SHIPMENT */}

      <section className="agd-section">

        <div className="agd-section-header">
          <div>
            <div className="agd-section-label">
              SHIPMENT
            </div>

            <h2>
              Shipment Information
            </h2>

            <p className="agd-section-description">
              Core logistics information
              recorded in the agreement.
            </p>
          </div>
        </div>


        <div className="agd-grid">

          <Field
            label="Product"
            value={agreement.product}
          />

          <Field
            label="Quantity"
            value={
              `${agreement.quantity} ${agreement.unitOfMeasurement}`
            }
          />

          <Field
            label="Deadline"
            value={agreement.deadline}
          />

          <Field
            label="Origin"
            value={agreement.origin}
          />

          <Field
            label="Destination"
            value={agreement.destination}
          />

          <Field
            label="Agreement Template"
            value={
              agreement.templateId === "0"
                ? "Custom Agreement"
                : `Template #${agreement.templateId}`
            }
          />

        </div>

      </section>


    {/* PARTICIPANTS */}

    <section className="agd-section">

    <div className="agd-section-header">
        <div>

        <div className="agd-section-label">
            PARTICIPANTS
        </div>

        <h2>
            Agreement Parties
        </h2>

        <p className="agd-section-description">
            Registered organizations
            participating in this
            logistics agreement.
        </p>

        </div>
    </div>


    <div className="agd-party-grid">

        {/* SHIPPER */}

        <div className="agd-party">

        <div className="agd-party-role">
            SHIPPER
        </div>

        <h3 className="agd-party-name">
            {
            participants
                ?.shipper
                ?.name ||
            "Unknown Shipper"
            }
        </h3>

        <div className="agd-party-subrole">
            {
            participants
                ?.shipper
                ?.role ||
            "Shipper"
            }
        </div>

        <code className="agd-wallet">
            {agreement.shipper}
        </code>

        </div>


        {/* CARRIER */}

        <div className="agd-party">

        <div className="agd-party-role">
            CARRIER
        </div>

        <h3 className="agd-party-name">
            {
            participants
                ?.carrier
                ?.name ||
            "Not Assigned"
            }
        </h3>

        <div className="agd-party-subrole">
            {
            participants
                ?.carrier
                ?.role ||
            "Carrier"
            }
        </div>

        <code className="agd-wallet">
            {
            agreement.carrier ===
            ZERO_ADDRESS
                ? "Not assigned"
                : agreement.carrier
            }
        </code>

        </div>


        {/* WAREHOUSE / CUSTOMS */}

        {participants
        ?.approvers
        ?.map(
            (
            participant,
            index
            ) => (

            <div
                className="agd-party"
                key={
                participant.address
                }
            >

                <div className="agd-party-role">
                {
                    participant.role
                }
                </div>

                <h3 className="agd-party-name">
                {
                    participant.name
                }
                </h3>

                <div className="agd-party-subrole">
                Approver for Milestone{" "}
                {
                    participant
                    .milestones
                    .join(", ")
                }
                </div>

                <code className="agd-wallet">
                {
                    participant.address
                }
                </code>

            </div>

            )
        )}

    </div>

    </section>


      {/* FINANCIAL */}

      <section className="agd-section">

        <div className="agd-section-header">
          <div>
            <div className="agd-section-label">
              ESCROW
            </div>

            <h2>
              Financial State
            </h2>

            <p className="agd-section-description">
              Current ETH escrow
              accounting from the
              EscrowManager contract.
            </p>
          </div>
        </div>


        <div className="agd-grid">

          <Field
            label="Required"
            value={formatEthWithMyr(
                escrow.required
            )}
          />

            <Field
            label="Total Funded"
            value={formatEthWithMyr(
                escrow.funded
            )}
            />

        <Field
        label="Released"
        value={formatEthWithMyr(
            escrow.released
        )}
        />

        <Field
        label="Remaining"
        value={formatEthWithMyr(
            escrow.remaining
        )}
        />

          <Field
            label="Settlement"
            value={
              Number(
                escrow.remaining
              ) === 0
                ? "Fully Settled"
                : "Funds Remaining"
            }
          />

          <Field
            label="Agreement Status"
            value={agreement.status}
          />

        </div>

      </section>


      {/* AGRI */}

      <section className="agd-section">

        <div className="agd-section-header">
          <div>
            <div className="agd-section-label">
              AGRI TOKEN
            </div>

            <h2>
              Carrier Token State
            </h2>
          </div>
        </div>


        <div className="agd-grid">

          <Field
            label="Minimum Stake"
            value={
              `${agri.minimumStake} AGRI`
            }
          />

          <Field
            label="Agreement Stake"
            value={
              `${agri.carrierStake} AGRI`
            }
          />

          <Field
            label="Completion Reward"
            value={
              `${agri.completionReward} AGRI`
            }
          />

          <Field
            label="Carrier Balance"
            value={
              `${agri.carrierBalance} AGRI`
            }
          />

        </div>

      </section>


      {/* MILESTONES */}

      <section className="agd-section">

        <div className="agd-section-header">

          <div>
            <div className="agd-section-label">
              MILESTONES
            </div>

            <h2>
              Contractual Progress
            </h2>

            <p className="agd-section-description">
              Sequential milestone,
              proof and payment state.
            </p>
          </div>

        </div>


        <div className="agd-progress-row">
          <span>
            Overall completion
          </span>

          <span className="agd-progress-value">
            {approvedPercentage}%
          </span>
        </div>


        <div className="agd-progress-track">
          <div
            className="agd-progress-fill"
            style={{
              width:
                `${approvedPercentage}%`,
            }}
          />
        </div>


        <div className="agd-milestones">

          {milestones.map(
            (milestone, index) => {

              const status =
                milestoneStatusNames[
                  milestone.status
                ];

              const proofHistory =
                (audit?.events || [])
                    .filter(
                    (event) =>
                        event.eventName ===
                        "ProofSubmitted" &&
                        Number(
                        event.details?.Milestone
                        ) ===
                        index + 1
                    );

              return (
                <article
                  className="agd-milestone"
                  key={milestone.id}
                >

                  <div className="agd-milestone-number">
                    {index + 1}
                  </div>


                  <div>

                    <div className="agd-milestone-head">

                      <div>
                        <h3 className="agd-milestone-title">
                          {
                            milestone
                              .description
                          }
                        </h3>

                        <p className="agd-milestone-proof">
                          Required proof:{" "}
                          {
                            milestone
                              .proofRequirement
                          }
                        </p>
                      </div>


                      <span
                        className={
                          `agd-mini-status ${status.toLowerCase()}`
                        }
                      >
                        {status}
                      </span>

                    </div>


                    <div className="agd-milestone-data">

                      <SmallField
                        label="Payment"
                        value={
                          `${milestone.paymentPercentage}%`
                        }
                      />

                      <SmallField
                        label="Approver"
                        value={
                          shortAddress(
                            milestone.approver
                          )
                        }
                      />

                      <SmallField
                        label="Proof Submitted"
                        value={
                          Number(
                            milestone
                              .proofSubmittedAt
                          ) > 0
                            ? new Date(
                                Number(
                                  milestone
                                    .proofSubmittedAt
                                ) *
                                  1000
                              ).toLocaleString()
                            : "Not submitted"
                        }
                      />

                    </div>


                    {(
                        milestone.proofCid ||
                        proofHistory.length > 0
                        ) && (
                        <details className="agd-details">

                            <summary>
                            Proof Evidence
                            {proofHistory.length > 1
                                ? ` & History (${proofHistory.length} submissions)`
                                : ""}
                            </summary>


                            <div className="agd-details-box">

                            <span className="agd-field-label">
                                Current Proof CID
                            </span>

                            <code className="agd-cid">
                                {milestone.proofCid ||
                                "No current CID"}
                            </code>

                            <div
                                className="form-note"
                                style={{
                                    marginTop: "14px",
                                }}
                                >
                                <strong>
                                    How proof storage works
                                </strong>

                                <p>
                                    The proof file itself is stored
                                    off-chain on IPFS. Only its Content
                                    Identifier (CID) is recorded by the
                                    smart contract.
                                </p>

                                <p>
                                    Restarting or closing this frontend
                                    does not remove the blockchain CID
                                    or the IPFS proof. File availability
                                    depends on the IPFS network and
                                    continued pinning of the content.
                                </p>
                            </div>


                            {proofHistory.length > 0 && (
                                <>
                                <div
                                    style={{
                                    marginTop: "18px",
                                    marginBottom: "10px",
                                    }}
                                >
                                    <strong>
                                    Submission History
                                    </strong>

                                    <p
                                    style={{
                                        marginTop: "4px",
                                    }}
                                    >
                                    Historical submissions are
                                    reconstructed from immutable
                                    ProofSubmitted blockchain
                                    events.
                                    </p>
                                </div>


                                {proofHistory.map(
                                    (submission, historyIndex) => (
                                    <div
                                        key={
                                        `${submission.transactionHash}-${historyIndex}`
                                        }
                                        style={{
                                        padding: "12px 0",
                                        borderTop:
                                            "1px solid rgba(0, 0, 0, 0.08)",
                                        }}
                                    >

                                        <div>
                                        <strong>
                                            Submission{" "}
                                            {historyIndex + 1}
                                        </strong>

                                        {historyIndex > 0 && (
                                            <span>
                                            {" — "}
                                            Resubmission
                                            </span>
                                        )}
                                        </div>


                                        <div
                                        style={{
                                            marginTop: "8px",
                                        }}
                                        >
                                        <span className="agd-field-label">
                                            Submitted
                                        </span>

                                        <div>
                                            {submission.time}
                                        </div>
                                        </div>


                                        <div
                                        style={{
                                            marginTop: "8px",
                                        }}
                                        >
                                        <span className="agd-field-label">
                                            IPFS CID
                                        </span>

                                        <code className="agd-cid">
                                            {
                                            submission
                                                .details[
                                                "IPFS CID"
                                                ]
                                            }
                                        </code>
                                        </div>


                                        <div
                                        style={{
                                            marginTop: "8px",
                                        }}
                                        >
                                        <a
                                            href={
                                            submission.explorerUrl
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View transaction on Etherscan
                                        </a>
                                        </div>

                                    </div>
                                    )
                                )}
                                </>
                            )}

                            </div>

                        </details>
                        )}

                  </div>

                </article>
              );
            }
          )}

        </div>

      </section>

      <AgreementAuditTimeline
        audit={audit}
        />

    </div>
  );
}