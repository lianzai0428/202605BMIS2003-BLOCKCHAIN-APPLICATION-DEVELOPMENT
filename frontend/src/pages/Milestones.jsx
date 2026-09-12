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
  createMilestones,
  getDashboardOverview,
  getMilestones,
} from "../services/blockchain";


function emptyMilestone() {
  return {
    description: "",
    proofRequirement: "",
    paymentPercentage: "",
    approver: "",
  };
}


export default function Milestones() {
  const {
    user,
    address,
  } = useOutletContext();

  const [draftAgreements, setDraftAgreements] =
    useState([]);

  const [agreementId, setAgreementId] =
    useState("");

  const [milestones, setMilestones] =
    useState([
      emptyMilestone(),
      emptyMilestone(),
    ]);

  const [loadingPage, setLoadingPage] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function loadDraftAgreements() {
    try {
      setLoadingPage(true);
      setError("");

      const result =
        await getDashboardOverview();

      const wallet =
        address.toLowerCase();

      const ownDrafts =
        result.agreements.filter(
          (agreement) =>
            agreement.statusNumber === 0 &&
            agreement.shipper
              .toLowerCase() === wallet
        );


      const usableDrafts = [];

      for (const agreement of ownDrafts) {
        const existingMilestones =
          await getMilestones(
            agreement.id
          );

        usableDrafts.push({
          ...agreement,
          milestoneCount:
            existingMilestones.length,
        });
      }

      setDraftAgreements(
        usableDrafts
      );

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load Draft agreements."
      );

    } finally {
      setLoadingPage(false);
    }
  }


  useEffect(() => {
    if (
      user?.role === 1 &&
      address
    ) {
      loadDraftAgreements();
    }
  }, [user, address]);


  function updateMilestone(
    index,
    field,
    value
  ) {
    setMilestones(
      milestones.map(
        (milestone, i) =>
          i === index
            ? {
                ...milestone,
                [field]: value,
              }
            : milestone
      )
    );
  }


  function addMilestone() {
    setMilestones([
      ...milestones,
      emptyMilestone(),
    ]);
  }


  function removeMilestone(index) {
    if (
      milestones.length === 1
    ) {
      return;
    }

    setMilestones(
      milestones.filter(
        (_, i) => i !== index
      )
    );
  }


  function getTotalPercentage() {
    return milestones.reduce(
      (total, milestone) =>
        total +
        Number(
          milestone.paymentPercentage ||
          0
        ),
      0
    );
  }


  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!agreementId) {
        throw new Error(
          "Please select a Draft agreement."
        );
      }


      const selectedAgreement =
        draftAgreements.find(
          (agreement) =>
            agreement.id ===
            Number(agreementId)
        );

      if (
        selectedAgreement
          ?.milestoneCount > 0
      ) {
        throw new Error(
          "This agreement already has milestones."
        );
      }


      if (
        getTotalPercentage() !== 100
      ) {
        throw new Error(
          "Milestone payment percentages must total exactly 100%."
        );
      }


      for (
        let i = 0;
        i < milestones.length;
        i++
      ) {
        const milestone =
          milestones[i];

        if (
          !milestone.description.trim() ||
          !milestone.proofRequirement.trim() ||
          !milestone.approver.trim()
        ) {
          throw new Error(
            `Please complete all fields for Milestone ${i + 1}.`
          );
        }

        if (
          Number(
            milestone.paymentPercentage
          ) <= 0
        ) {
          throw new Error(
            `Milestone ${i + 1} must have a payment percentage greater than 0.`
          );
        }
      }


      await createMilestones({
        agreementId:
          Number(agreementId),

        descriptions:
          milestones.map(
            (milestone) =>
              milestone.description.trim()
          ),

        proofRequirements:
          milestones.map(
            (milestone) =>
              milestone.proofRequirement.trim()
          ),

        paymentPercentages:
          milestones.map(
            (milestone) =>
              Number(
                milestone.paymentPercentage
              )
          ),

        approvers:
          milestones.map(
            (milestone) =>
              milestone.approver.trim()
          ),
      });


      setSuccess(
        `Milestones created successfully for Agreement #${agreementId}.`
      );

      await loadDraftAgreements();

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Milestone creation failed."
      );

    } finally {
      setSubmitting(false);
    }
  }


  if (user?.role !== 1) {
    return (
      <>
        <PageHeader
          title="Milestones"
          description="Configure agreement milestones."
        />

        <section className="card">
          <h2>
            Shipper Access Required
          </h2>

          <p>
            Only the Shipper can configure
            milestones for a Draft agreement.
          </p>
        </section>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title="Configure Milestones"
        description="Define sequential proof requirements, approvers and payment distribution."
      />


      <section className="card form-card">

        {loadingPage ? (
          <p>
            Loading Draft agreements...
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
          >

            <div className="form-group">
              <label>
                Draft Agreement
              </label>

              <select
                value={agreementId}
                onChange={(event) =>
                  setAgreementId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select agreement
                </option>

                {draftAgreements.map(
                  (agreement) => (
                    <option
                      key={agreement.id}
                      value={agreement.id}
                      disabled={
                        agreement.milestoneCount >
                        0
                      }
                    >
                      #{agreement.id}
                      {" — "}
                      {agreement.product}
                      {" — "}
                      {agreement.origin}
                      {" → "}
                      {agreement.destination}
                      {agreement.milestoneCount >
                      0
                        ? " — milestones already configured"
                        : ""}
                    </option>
                  )
                )}
              </select>

              <small>
                Only your Draft agreements
                are shown.
              </small>
            </div>


            <div
              style={{
                marginTop: "24px",
              }}
            >

              {milestones.map(
                (
                  milestone,
                  index
                ) => (
                  <div
                    className="card"
                    key={index}
                    style={{
                      marginBottom:
                        "16px",
                    }}
                  >

                    <div className="card-header">
                      <div>
                        <h3>
                          Milestone{" "}
                          {index + 1}
                        </h3>

                        <p>
                          Milestones are
                          completed
                          sequentially.
                        </p>
                      </div>

                      {milestones.length >
                        1 && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            removeMilestone(
                              index
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>


                    <div className="form-grid">

                      <div className="form-group">
                        <label>
                          Description
                        </label>

                        <input
                          type="text"
                          value={
                            milestone.description
                          }
                          onChange={(
                            event
                          ) =>
                            updateMilestone(
                              index,
                              "description",
                              event.target
                                .value
                            )
                          }
                          placeholder="e.g. Cargo collected"
                          required
                        />
                      </div>


                      <div className="form-group">
                        <label>
                          Proof Requirement
                        </label>

                        <input
                          type="text"
                          value={
                            milestone.proofRequirement
                          }
                          onChange={(
                            event
                          ) =>
                            updateMilestone(
                              index,
                              "proofRequirement",
                              event.target
                                .value
                            )
                          }
                          placeholder="e.g. Pickup document"
                          required
                        />
                      </div>


                      <div className="form-group">
                        <label>
                          Payment
                          Percentage
                        </label>

                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={
                            milestone.paymentPercentage
                          }
                          onChange={(
                            event
                          ) =>
                            updateMilestone(
                              index,
                              "paymentPercentage",
                              event.target
                                .value
                            )
                          }
                          placeholder="50"
                          required
                        />
                      </div>


                      <div className="form-group">
                        <label>
                          Approver Wallet
                        </label>

                        <input
                          type="text"
                          value={
                            milestone.approver
                          }
                          onChange={(
                            event
                          ) =>
                            updateMilestone(
                              index,
                              "approver",
                              event.target
                                .value
                            )
                          }
                          placeholder="Warehouse or Customs wallet address"
                          required
                        />

                        <small>
                          Must be an active
                          Warehouse or
                          Customs account.
                        </small>
                      </div>

                    </div>

                  </div>
                )
              )}

            </div>


            <div className="form-note">
              <strong>
                Payment distribution:
              </strong>
              {" "}
              {getTotalPercentage()}%
              {" / "}
              100%
            </div>


            <div
              className="form-actions"
              style={{
                justifyContent:
                  "space-between",
              }}
            >

              <button
                type="button"
                className="secondary-button"
                onClick={addMilestone}
              >
                + Add Milestone
              </button>


              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Waiting for transaction..."
                  : "Create Milestones"}
              </button>

            </div>


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

          </form>
        )}

      </section>
    </>
  );
}