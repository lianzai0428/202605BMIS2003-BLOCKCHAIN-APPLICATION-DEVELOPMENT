import {
  useEffect,
  useState,
} from "react";

import {
  useOutletContext,
} from "react-router-dom";

import PageHeader
  from "../components/PageHeader";

import {
  getDashboardOverview,
  getEscrowSummary,
  getMilestones,
  fundEscrow,
  postAgreement,
} from "../services/blockchain";


import {
  ethToMyr as approximateMyr,
} from "../utils/currency";

export default function FundAgreement() {
  const {
    user,
    address,
  } = useOutletContext();

  const [agreements, setAgreements] =
    useState([]);

  const [agreementId, setAgreementId] =
    useState("");

  const [escrow, setEscrow] =
    useState(null);

  const [milestoneCount, setMilestoneCount] =
    useState(0);

  const [amount, setAmount] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function loadAgreements() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getDashboardOverview();

      const wallet =
        address.toLowerCase();

      const drafts =
        result.agreements.filter(
          (agreement) =>
            agreement.statusNumber === 0 &&
            agreement.shipper
              .toLowerCase() === wallet
        );

      setAgreements(drafts);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load Draft agreements."
      );

    } finally {
      setLoading(false);
    }
  }


  async function loadSelectedAgreement(
    id
  ) {
    if (!id) {
      setEscrow(null);
      setMilestoneCount(0);
      return;
    }

    try {
      setError("");

      const [
        escrowData,
        milestones,
      ] = await Promise.all([
        getEscrowSummary(
          Number(id)
        ),

        getMilestones(
          Number(id)
        ),
      ]);

      setEscrow(escrowData);

      setMilestoneCount(
        milestones.length
      );

      setAmount("");

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load agreement funding details."
      );
    }
  }


  useEffect(() => {
    if (
      user?.role === 1 &&
      address
    ) {
      loadAgreements();
    }
  }, [user, address]);


  async function handleAgreementChange(
    event
  ) {
    const id =
      event.target.value;

    setAgreementId(id);
    setSuccess("");

    await loadSelectedAgreement(
      id
    );
  }


  async function handleFund(
    event
  ) {
    event.preventDefault();

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      if (!agreementId) {
        throw new Error(
          "Please select an agreement."
        );
      }

      if (
        !amount ||
        Number(amount) <= 0
      ) {
        throw new Error(
          "Enter an ETH amount greater than 0."
        );
      }


      await fundEscrow(
        Number(agreementId),
        amount
      );


      setSuccess(
        `Escrow funding successful for Agreement #${agreementId}.`
      );

      await loadSelectedAgreement(
        agreementId
      );

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Escrow funding failed."
      );

    } finally {
      setProcessing(false);
    }
  }


  async function handlePost() {
    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      await postAgreement(
        Number(agreementId)
      );

      setSuccess(
        `Agreement #${agreementId} posted successfully and is now available to Carriers.`
      );

      setAgreementId("");
      setEscrow(null);
      setMilestoneCount(0);

      await loadAgreements();

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Agreement posting failed."
      );

    } finally {
      setProcessing(false);
    }
  }


  if (user?.role !== 1) {
    return (
      <>
        <PageHeader
          title="Fund / Post Agreement"
          description="Fund and publish Draft agreements."
        />

        <section className="card">
          <h2>
            Shipper Access Required
          </h2>

          <p>
            Only the agreement Shipper
            can fund and post a Draft
            agreement.
          </p>
        </section>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title="Fund / Post Agreement"
        description="Fund the required escrow before publishing the agreement to Carriers."
      />


      <section className="card form-card">

        {loading ? (
          <p>
            Loading Draft agreements...
          </p>
        ) : (
          <>
            <div className="form-group">

              <label>
                Draft Agreement
              </label>

              <select
                value={agreementId}
                onChange={
                  handleAgreementChange
                }
              >
                <option value="">
                  Select agreement
                </option>

                {agreements.map(
                  (agreement) => (
                    <option
                      key={agreement.id}
                      value={agreement.id}
                    >
                      #{agreement.id}
                      {" — "}
                      {agreement.product}
                      {" — "}
                      {agreement.escrowEth}
                      {" ETH"}
                      {" (≈ "}
                      {approximateMyr(
                        agreement.escrowEth
                      )}
                      {")"}
                    </option>
                  )
                )}
              </select>

            </div>


            {escrow && (
              <>
                <div
                  className="stats-grid"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <div className="card">
                    <span>
                      Required Escrow
                    </span>

                    <h3>
                      {escrow.requiredEth}
                      {" ETH"}
                    </h3>

                    <small>
                      ≈ {approximateMyr(
                        escrow.requiredEth
                      )}
                    </small>
                  </div>


                  <div className="card">
                    <span>
                      Funded
                    </span>

                    <h3>
                      {escrow.fundedEth}
                      {" ETH"}
                    </h3>

                    <small>
                      ≈ {approximateMyr(
                        escrow.fundedEth
                      )}
                    </small>
                  </div>


                  <div className="card">
                    <span>
                      Remaining
                    </span>

                    <h3>
                      {
                        escrow.remainingToFundEth
                      }
                      {" ETH"}
                    </h3>

                    <small>
                      ≈ {approximateMyr(
                        escrow.remainingToFundEth
                      )}
                    </small>
                  </div>


                  <div className="card">
                    <span>
                      Milestones
                    </span>

                    <h3>
                      {milestoneCount}
                    </h3>
                  </div>

                </div>


                {!escrow.fullyFunded && (
                  <form
                    onSubmit={
                      handleFund
                    }
                    style={{
                      marginTop:
                        "24px",
                    }}
                  >

                    <div className="form-group">
                      <label>
                        Funding Amount
                        (ETH)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={amount}
                        onChange={(
                          event
                        ) =>
                          setAmount(
                            event.target
                              .value
                          )
                        }
                        placeholder={
                          escrow
                            .remainingToFundEth
                        }
                        required
                      />

                      <small>
                        {amount
                          ? `Approximate value: ≈ ${approximateMyr(
                              amount
                            )}. `
                          : ""}
                        Enter ETH. The frontend converts
                        it to wei automatically before
                        submitting the transaction.
                      </small>
                    </div>


                    <div className="form-actions">

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setAmount(
                            escrow
                              .remainingToFundEth
                          )
                        }
                      >
                        Fund Remaining
                      </button>


                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          processing
                        }
                      >
                        {processing
                          ? "Waiting for transaction..."
                          : "Fund Escrow"}
                      </button>

                    </div>

                  </form>
                )}


                {escrow.fullyFunded && (
                  <div
                    style={{
                      marginTop:
                        "24px",
                    }}
                  >

                    <div className="form-note">
                      <strong>
                        Escrow fully
                        funded.
                      </strong>

                      <br />

                      {milestoneCount >
                      0
                        ? `${milestoneCount} milestone(s) configured. This agreement is ready to be Posted.`
                        : "Milestones must be configured before posting."}
                    </div>


                    <div className="form-actions">

                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          processing ||
                          milestoneCount ===
                            0
                        }
                        onClick={
                          handlePost
                        }
                      >
                        {processing
                          ? "Waiting for transaction..."
                          : "Post Agreement"}
                      </button>

                    </div>

                  </div>
                )}
              </>
            )}


            {error && (
              <div
                className="form-note"
                style={{
                  color: "red",
                  marginTop: "16px",
                }}
              >
                {error}
              </div>
            )}


            {success && (
              <div
                className="form-note"
                style={{
                  marginTop: "16px",
                }}
              >
                <strong>
                  {success}
                </strong>
              </div>
            )}

          </>
        )}

      </section>
    </>
  );
}