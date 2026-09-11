import {
  formatUnits,
} from "ethers";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useOutletContext,
} from "react-router-dom";

import {
  Link,
} from "react-router-dom";

import PageHeader
  from "../components/PageHeader";

import StatusBadge
  from "../components/StatusBadge";

import {
  formatEthWithMyr,
} from "../utils/currency";

import {
  getDashboardOverview,
  getMilestones,
  getEscrowSummary,
  getStakeRequirement,
  acceptAgreement,
  stakeRequiredTokens,
  processExpiredAgreement,
  carrierAbandonAgreement,
  cancelAgreement,
  withdrawUnusedStake,
} from "../services/blockchain";



export default function Agreements() {
  const {
    user,
    address,
  } = useOutletContext();

  const [agreements, setAgreements] =
    useState([]);

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

    const [acceptingId, setAcceptingId] =
      useState(null);

    const [success, setSuccess] =
      useState("");

  const [processingExpiryId, setProcessingExpiryId] =
    useState(null);

  const [abandoningId, setAbandoningId] =
    useState(null);

  const [cancellingId, setCancellingId] =
    useState(null);

  const [withdrawingStakeId, setWithdrawingStakeId] =
    useState(null);

  async function loadAgreements() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getDashboardOverview();

      const enriched =
        await Promise.all(
          result.agreements.map(
            async (agreement) => {
              const milestones =
                await getMilestones(
                  agreement.id
                );

              const escrow =
                await getEscrowSummary(
                  agreement.id
                );
                
            let currentWalletStake = 0n;

            let stakeRequirement = {
              requiredStake: 0n,
              currentStake: 0n,
              availableBalance: 0n,
              missingStake: 0n,
              satisfied: true,
              hasEnoughBalance: true,
            };


            if (
              user?.role === 2 &&
              address
            ) {
              stakeRequirement =
                await getStakeRequirement(
                  agreement.id,
                  address
                );

              currentWalletStake =
                stakeRequirement.currentStake;
            }

              const progress =
                milestones.reduce(
                  (total, milestone) => {
                    if (
                      milestone.status === 2
                    ) {
                      return (
                        total +
                        milestone.paymentPercentage
                      );
                    }

                    return total;
                  },
                  0
                );

              return {
                ...agreement,
                milestones,
                progress,
                escrow,
                currentWalletStake,
                stakeRequirement,
              };
            }
          )
        );


      const wallet =
        address?.toLowerCase();

      let relevant = enriched;


      // SHIPPER
      if (user?.role === 1) {
        relevant = enriched.filter(
          (agreement) =>
            agreement.shipper
              .toLowerCase() === wallet
        );
      }


      // CARRIER
      if (user?.role === 2) {
        relevant = enriched.filter(
          (agreement) => {
            const assignedToMe =
              agreement.carrier
                ?.toLowerCase() ===
              wallet;

            const available =
              agreement.statusNumber === 1;

            const hasUnusedStake =
              agreement.currentWalletStake > 0n;

            return (
              assignedToMe ||
              available ||
              hasUnusedStake
            );
          }
        );
      }


      // WAREHOUSE / CUSTOMS
      if (
        user?.role === 3 ||
        user?.role === 4
      ) {
        relevant = enriched.filter(
          (agreement) =>
            agreement.milestones.some(
              (milestone) =>
                milestone.approver
                  .toLowerCase() ===
                wallet
            )
        );
      }


      setAgreements(relevant);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Failed to load agreements."
      );

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (user && address) {
      loadAgreements();
    }
  }, [user, address]);


  const statuses = [
    "All",
    "Draft",
    "Posted",
    "Active",
    "Pending Approval",
    "Completed",
    "Cancelled",
    "Expired",
    "Failed",
  ];


  const filtered =
    useMemo(() => {
      if (statusFilter === "All") {
        return agreements;
      }

      return agreements.filter(
        (agreement) =>
          agreement.status ===
          statusFilter
      );
    }, [
      agreements,
      statusFilter,
    ]);


  function shortenAddress(value) {
    if (
      !value ||
      value ===
        "0x0000000000000000000000000000000000000000"
    ) {
      return "Not assigned";
    }

    return `${value.slice(
      0,
      6
    )}...${value.slice(-4)}`;
  }


  function hasDeadlinePassed(
    agreement
  ) {
    const deadlineTime =
      new Date(
        agreement.deadline
      ).getTime();

    if (
      Number.isNaN(deadlineTime)
    ) {
      return false;
    }

    return Date.now() >= deadlineTime;
  }

  async function handleAccept(
    agreementId
  ) {
    try { 
      setAcceptingId(
        agreementId
      );

      setError("");
      setSuccess("");


      // Ensure any required AGRI stake
      // is locked before acceptance.
      const stakeResult =
        await stakeRequiredTokens(
          agreementId
        );


      if (
        !stakeResult.alreadySatisfied
      ) {
        setSuccess(
          `AGRI stake confirmed for Agreement #${agreementId}. ` +
          "Please confirm the acceptance transaction in MetaMask."
        );
      }


      await acceptAgreement(
        agreementId
      );


      setSuccess(
        `Agreement #${agreementId} accepted successfully.`
      );

      await loadAgreements();

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Agreement acceptance failed."
      );

    } finally {
      setAcceptingId(null);
    }
  }

async function handleProcessExpiry(
  agreementId
) {
  const confirmed =
    window.confirm(
      `Process Agreement #${agreementId} as expired?\n\n` +
      "The smart contract will determine whether it becomes Expired or Failed and will apply the corresponding refund/stake rules."
    );

  if (!confirmed) {
    return;
  }

  try {
    setProcessingExpiryId(
      agreementId
    );

    setError("");
    setSuccess("");

    await processExpiredAgreement(
      agreementId
    );

    setSuccess(
      `Agreement #${agreementId} expiry processed successfully.`
    );

    await loadAgreements();

  } catch (err) {
    console.error(err);

    setError(
      err.reason ||
      err.shortMessage ||
      err.message ||
      "Failed to process agreement expiry."
    );

  } finally {
    setProcessingExpiryId(
      null
    );
  }
}


async function handleAbandon(
  agreementId
) {
  const confirmed =
    window.confirm(
      `Abandon Agreement #${agreementId}?\n\n` +
      "This will mark the agreement as Failed, refund unreleased escrow, and may burn your AGRI stake. This action cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  try {
    setAbandoningId(
      agreementId
    );

    setError("");
    setSuccess("");

    await carrierAbandonAgreement(
      agreementId
    );

    setSuccess(
      `Agreement #${agreementId} abandoned.`
    );

    await loadAgreements();

  } catch (err) {
    console.error(err);

    setError(
      err.reason ||
      err.shortMessage ||
      err.message ||
      "Agreement abandonment failed."
    );

  } finally {
    setAbandoningId(
      null
    );
  }
}


async function handleCancel(
  agreementId
) {
  const confirmed =
    window.confirm(
      `Cancel Agreement #${agreementId}?\n\n` +
      "Any remaining escrow will be refunded according to the smart contract rules. " +
      "If a Carrier has already accepted and no milestone payment has been released, its AGRI stake will be returned."
    );

  if (!confirmed) {
    return;
  }

  try {
    setCancellingId(
      agreementId
    );

    setError("");
    setSuccess("");

    await cancelAgreement(
      agreementId
    );

    setSuccess(
      `Agreement #${agreementId} cancelled successfully.`
    );

    await loadAgreements();

  } catch (err) {
    console.error(err);

    setError(
      err.reason ||
      err.shortMessage ||
      err.message ||
      "Agreement cancellation failed."
    );

  } finally {
    setCancellingId(
      null
    );
  }
}


async function handleWithdrawStake(
  agreementId
) {
  const confirmed =
    window.confirm(
      `Withdraw your unused AGRI stake from Agreement #${agreementId}?`
    );

  if (!confirmed) {
    return;
  }

  try {
    setWithdrawingStakeId(
      agreementId
    );

    setError("");
    setSuccess("");

    await withdrawUnusedStake(
      agreementId
    );

    setSuccess(
      `Unused AGRI stake withdrawn from Agreement #${agreementId}.`
    );

    await loadAgreements();

  } catch (err) {
    console.error(err);

    setError(
      err.reason ||
      err.shortMessage ||
      err.message ||
      "Failed to withdraw unused stake."
    );

  } finally {
    setWithdrawingStakeId(
      null
    );
  }
}
  

  return (
    <>
      <PageHeader
        title="View Agreements"
        description="Review agreements relevant to your current blockchain role."
      />


      <section className="card">

        <div className="form-group compact-filter">

          <label htmlFor="statusFilter">
            Filter by agreement status
          </label>

          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            {statuses.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>

        </div>


        {error && (
          <p
            style={{
              color: "red",
              marginBottom: "16px",
            }}
          >
            {error}
          </p>
        )}

        {success && (
          <div
            className="form-note"
            style={{
              marginBottom: "16px",
            }}
          >
            <strong>
              {success}
            </strong>
          </div>
        )}


        {loading ? (
          <p>
            Loading agreements from
            Sepolia...
          </p>
        ) : (
          <div className="agreement-grid">

            {filtered.length === 0 ? (
              <p>
                No agreements match the
                selected status.
              </p>
            ) : (
              filtered.map(
                (agreement) => (
                  <article
                    className="agreement-card"
                    key={agreement.id}
                  >

                    <div className="agreement-card-header">

                      <div>
                        <span className="eyebrow">
                          Agreement
                        </span>

                        <h3>
                          #{agreement.id}
                        </h3>
                      </div>

                      <StatusBadge
                        status={
                          agreement.status
                        }
                      />

                    </div>


                    <dl className="details-list">

                      <div>
                        <dt>
                          Product
                        </dt>

                        <dd>
                          {
                            agreement.product
                          }
                        </dd>
                      </div>


                      <div>
                        <dt>
                          Shipper
                        </dt>

                        <dd>
                          {shortenAddress(
                            agreement.shipper
                          )}
                        </dd>
                      </div>


                      <div>
                        <dt>
                          Carrier
                        </dt>

                        <dd>
                          {shortenAddress(
                            agreement.carrier
                          )}
                        </dd>
                      </div>


                      <div>
                        <dt>
                          Route
                        </dt>

                        <dd>
                          {
                            agreement.origin
                          }
                          {" → "}
                          {
                            agreement.destination
                          }
                        </dd>
                      </div>


                      <div>
                        <dt>
                          Escrow Amount
                        </dt>

                        <dd>
                          {formatEthWithMyr(
                            agreement.escrowEth
                          )}
                        </dd>
                      </div>


                      <div>
                        <dt>
                          Deadline
                        </dt>

                        <dd>
                          {
                            agreement.deadline
                          }
                        </dd>
                      </div>

                    </dl>


                    <div className="progress-block">

                      <div>
                        <span>
                          Milestone progress
                        </span>

                        <strong>
                          {
                            agreement.progress
                          }
                          %
                        </strong>
                      </div>

                      <progress
                        value={
                          agreement.progress
                        }
                        max="100"
                      />

                    </div>

                    <Link
                        to={`/agreements/${agreement.id}`}
                        className="secondary-button"
                      >
                        View Full Details
                      </Link>
                    {user?.role === 1 &&
                      agreement.statusNumber === 0 && (
                        <Link
                          to={`/create-agreement?edit=${agreement.id}`}
                          className="secondary-button"
                        >
                          Edit Draft
                        </Link>
                      )}

                    {/* SHIPPER CANCELLATION */}

                    {user?.role === 1 &&
                      !hasDeadlinePassed(
                        agreement
                      ) &&
                      (
                        agreement.statusNumber === 0 ||
                        agreement.statusNumber === 1 ||
                        (
                          agreement.statusNumber === 2 &&
                          agreement.progress === 0
                        )
                      ) && (
                        <div
                          className="form-actions"
                          style={{
                            marginTop: "12px",
                          }}
                        >
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={
                              cancellingId ===
                              agreement.id
                            }
                            onClick={() =>
                              handleCancel(
                                agreement.id
                              )
                            }
                          >
                            {cancellingId ===
                            agreement.id
                              ? "Cancelling..."
                              : "Cancel Agreement"}
                          </button>
                        </div>
                      )}

                      {/* AGRI STAKE REQUIREMENT */}

                      {user?.role === 2 &&
                        (
                          agreement.statusNumber === 1 ||
                          agreement.currentWalletStake > 0n ||
                          (
                            agreement.statusNumber === 2 &&
                            agreement.carrier
                              ?.toLowerCase() ===
                              address?.toLowerCase()
                          )
                        ) && (
                          <div
                            className="form-note"
                            style={{
                              marginTop: "14px",
                              marginBottom: "12px",
                            }}
                          >
                            <strong>
                              AGRI Token Position
                            </strong>

                            <div
                              style={{
                                marginTop: "6px",
                              }}
                            >
                              Available Balance:{" "}
                              {formatUnits(
                                agreement.stakeRequirement
                                  .availableBalance,
                                18
                              )}{" "}
                              AGRI
                            </div>

                            <div>
                              Required Stake:{" "}
                              {formatUnits(
                                agreement.stakeRequirement
                                  .requiredStake,
                                18
                              )}{" "}
                              AGRI
                            </div>

                            <div>
                              Currently Locked:{" "}
                              {formatUnits(
                                agreement.stakeRequirement
                                  .currentStake,
                                18
                              )}{" "}
                              AGRI
                            </div>

                            {!agreement.stakeRequirement
                              .satisfied && (
                              <div>
                                Still Required:{" "}
                                {formatUnits(
                                  agreement.stakeRequirement
                                    .missingStake,
                                  18
                                )}{" "}
                                AGRI
                              </div>
                            )}

                            {!agreement.stakeRequirement
                              .hasEnoughBalance && (
                              <div
                                style={{
                                  marginTop: "8px",
                                  fontWeight: 600,
                                }}
                              >
                                Insufficient AGRI balance to
                                satisfy this agreement&apos;s
                                stake.
                              </div>
                            )}
                          </div>
                        )}


                      {/* CARRIER ACCEPTANCE */}

                      {user?.role === 2 &&
                        agreement.statusNumber === 1 && (
                          <div
                            className="form-actions"
                            style={{
                              marginTop: "16px",
                            }}
                          >
                            <button
                              type="button"
                              className="primary-button"
                              disabled={
                                acceptingId === agreement.id ||
                                !agreement.stakeRequirement
                                  .hasEnoughBalance
                              }
                              onClick={() =>
                                handleAccept(
                                  agreement.id
                                )
                              }
                            >
                              {acceptingId === agreement.id
                                ? "Waiting for transaction..."
                                : agreement.stakeRequirement
                                    .missingStake > 0n
                                  ? "Stake & Accept Agreement"
                                  : "Accept Agreement"}
                            </button>
                          </div>
                        )}
                      {/* EXPIRED AGREEMENT PROCESSING */}

                      {hasDeadlinePassed(
                        agreement
                      ) &&
                        [0, 1, 2].includes(
                          agreement.statusNumber
                        ) && (
                          <div
                            className="form-actions"
                            style={{
                              marginTop: "12px",
                            }}
                          >
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                processingExpiryId ===
                                agreement.id
                              }
                              onClick={() =>
                                handleProcessExpiry(
                                  agreement.id
                                )
                              }
                            >
                              {processingExpiryId ===
                              agreement.id
                                ? "Processing expiry..."
                                : "Process Expired Agreement"}
                            </button>
                          </div>
                        )}


                      {/* CARRIER ABANDONMENT */}

                      {user?.role === 2 &&
                        agreement.statusNumber === 2 &&
                        agreement.carrier
                          ?.toLowerCase() ===
                          address?.toLowerCase() && (
                          <div
                            className="form-actions"
                            style={{
                              marginTop: "12px",
                            }}
                          >
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                abandoningId ===
                                agreement.id
                              }
                              onClick={() =>
                                handleAbandon(
                                  agreement.id
                                )
                              }
                            >
                              {abandoningId ===
                              agreement.id
                                ? "Waiting for transaction..."
                                : "Abandon Agreement"}
                            </button>
                          </div>
                        )}

                        {/* WITHDRAW UNUSED AGRI STAKE */}

                        {user?.role === 2 &&
                          agreement.currentWalletStake > 0n &&
                          agreement.carrier
                            ?.toLowerCase() !==
                            address?.toLowerCase() && (
                            <div
                              className="form-actions"
                              style={{
                                marginTop: "12px",
                              }}
                            >
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={
                                  withdrawingStakeId ===
                                  agreement.id
                                }
                                onClick={() =>
                                  handleWithdrawStake(
                                    agreement.id
                                  )
                                }
                              >
                                {withdrawingStakeId ===
                                agreement.id
                                  ? "Withdrawing..."
                                  : "Withdraw Unused Stake"}
                              </button>
                            </div>
                          )}

                  </article>
                )
              )
            )}

          </div>
        )}

      </section>
    </>
  );
}