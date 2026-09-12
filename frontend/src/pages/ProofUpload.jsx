import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useOutletContext,
} from "react-router-dom";

import PageHeader
  from "../components/PageHeader";

import ProofUploader
  from "../components/ProofUploader";

import {
  getCarrierProofTargets,
  submitProof,
} from "../services/blockchain";


export default function ProofUpload() {
  const {
    user,
  } = useOutletContext();

  const [targets, setTargets] =
    useState([]);

  const [
    selectedAgreementId,
    setSelectedAgreementId,
  ] = useState("");

  const [uploadedProof, setUploadedProof] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function loadTargets() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getCarrierProofTargets();

      setTargets(result);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load proof tasks."
      );

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (user?.role === 2) {
      loadTargets();
    }
  }, [user]);


  const selectedTarget =
    useMemo(
      () =>
        targets.find(
          (target) =>
            target.agreement.id ===
            Number(
              selectedAgreementId
            )
        ),
      [
        targets,
        selectedAgreementId,
      ]
    );


  function handleAgreementChange(
    event
  ) {
    setSelectedAgreementId(
      event.target.value
    );

    setUploadedProof(null);
    setSuccess("");
    setError("");
  }


  async function handleBlockchainSubmit() {
    try {
      if (
        !selectedTarget ||
        !uploadedProof?.cid
      ) {
        throw new Error(
          "Upload a proof file before submitting its CID."
        );
      }

      setSubmitting(true);
      setError("");
      setSuccess("");


      await submitProof(
        selectedTarget.agreement.id,
        selectedTarget
          .currentMilestone.id,
        uploadedProof.cid
      );


      setSuccess(
        `Proof CID submitted successfully for Agreement #${selectedTarget.agreement.id}, Milestone ${selectedTarget.currentMilestone.id + 1}.`
      );

      setUploadedProof(null);

      await loadTargets();

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Proof submission failed."
      );

    } finally {
      setSubmitting(false);
    }
  }


  if (user?.role !== 2) {
    return (
      <>
        <PageHeader
          title="Proof Submission"
          description="Upload and submit milestone proof."
        />

        <section className="card">
          <h2>
            Carrier Access Required
          </h2>

          <p>
            Only the assigned Carrier
            submits milestone proof.
          </p>
        </section>
      </>
    );
  }


  return (
    <div>

      <PageHeader
        title="Proof Submission"
        description="Upload supporting evidence to IPFS and submit its CID to the blockchain."
      />


      {/* STEP 1 */}
      <section className="proof-step-card">

        <div className="proof-step-header">
          <h2>
            1. Select Agreement
          </h2>

          <p>
            Only agreements assigned to
            this Carrier are shown.
          </p>
        </div>


        {loading ? (
          <p>
            Loading proof tasks from
            Sepolia...
          </p>
        ) : (
          <div className="proof-form-grid">

            <div className="form-group">

              <label
                htmlFor="proof-agreement"
              >
                Agreement
              </label>

              <select
                id="proof-agreement"
                value={
                  selectedAgreementId
                }
                onChange={
                  handleAgreementChange
                }
              >
                <option value="">
                  Select agreement
                </option>

                {targets.map(
                  (target) => (
                    <option
                      key={
                        target
                          .agreement.id
                      }
                      value={
                        target
                          .agreement.id
                      }
                    >
                      #
                      {
                        target
                          .agreement.id
                      }
                      {" — "}
                      {
                        target
                          .agreement
                          .product
                      }
                    </option>
                  )
                )}

              </select>

            </div>

          </div>
        )}

      </section>


      {selectedTarget && (
        <>
          {/* STEP 2 */}
          <section className="proof-step-card">

            <div className="proof-step-header">
              <h2>
                2. Current Milestone
              </h2>

              <p>
                Milestones must be
                completed sequentially.
              </p>
            </div>

            <div
              style={{
                marginBottom: "24px",
              }}
            >
              <h3>Agreement Milestones</h3>

              {selectedTarget.milestones.map(
                (milestone) => {

                  const statusNames = [
                    "Pending",
                    "Submitted",
                    "Approved",
                    "Rejected",
                  ];

                  const isCurrent =
                    milestone.id ===
                    selectedTarget.currentMilestone.id;

                  return (
                    <div
                      key={milestone.id}
                      className="current-proof-box"
                      style={{
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <strong>
                          Milestone {milestone.id + 1}
                          {isCurrent
                            ? " — Current"
                            : ""}
                        </strong>

                        <p>
                          {milestone.description}
                        </p>

                        <p>
                          Proof required:{" "}
                          {milestone.proofRequirement}
                        </p>

                        <p>
                          Payment:{" "}
                          {milestone.paymentPercentage}%
                        </p>

                        <p>
                          Status:{" "}
                          <strong>
                            {
                              statusNames[
                                milestone.status
                              ]
                            }
                          </strong>
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>


            <div className="proof-record-layout">

              <div className="proof-record-column">

                <h3>
                  Milestone{" "}
                  {selectedTarget
                    .currentMilestone
                    .id + 1}
                </h3>

                <div className="current-proof-box">

                  <div>
                    <strong>
                      {
                        selectedTarget
                          .currentMilestone
                          .description
                      }
                    </strong>

                    <p>
                      Proof required:
                      {" "}
                      {
                        selectedTarget
                          .currentMilestone
                          .proofRequirement
                      }
                    </p>
                  </div>

                </div>

              </div>


              <div className="proof-record-column">

                <h3>
                  Current Active CID
                </h3>

                <div className="current-proof-box">

                  {selectedTarget
                    .currentMilestone
                    .proofCid ? (
                    <code className="proof-cid-text">
                      {
                        selectedTarget
                          .currentMilestone
                          .proofCid
                      }
                    </code>
                  ) : (
                    <span className="proof-empty-text">
                      No proof CID has
                      been submitted.
                    </span>
                  )}

                </div>

              </div>

            </div>


            <div
              style={{
                marginTop: "24px",
              }}
            >

              <h3>
                Previous Proof
                Submissions
              </h3>


              {selectedTarget.history
                .length > 0 ? (
                <div className="proof-history-table-wrapper">

                  <table className="proof-history-table">

                    <thead>
                      <tr>
                        <th>
                          CID
                        </th>

                        <th>
                          Submitted At
                        </th>

                        <th>
                          Source
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {selectedTarget
                        .history.map(
                          (
                            submission,
                            index
                          ) => (
                            <tr
                              key={`${submission.cid}-${index}`}
                            >

                              <td>
                                <code>
                                  {
                                    submission.cid
                                  }
                                </code>
                              </td>

                              <td>
                                {
                                  submission.submittedAt
                                }
                              </td>

                              <td>
                                Blockchain
                                Event Log
                              </td>

                            </tr>
                          )
                        )}

                    </tbody>

                  </table>

                </div>
              ) : (
                <div className="proof-empty-history">
                  No previous proof
                  submissions.
                </div>
              )}

            </div>


            <div className="historical-proof-info">

              <div className="historical-info-icon">
                i
              </div>

              <div>
                <strong>
                  Historical Proof
                  Records
                </strong>

                <p>
                  The smart contract
                  stores the latest CID.
                  Earlier submissions
                  remain traceable
                  through blockchain
                  event logs.
                </p>
              </div>

            </div>

          </section>


          {/* Only Pending / Rejected can submit */}
          {(
            selectedTarget
              .currentMilestone
              .status === 0 ||
            selectedTarget
              .currentMilestone
              .status === 3
          ) ? (
            <>
              {/* STEP 3 */}
              <section className="proof-step-card">

                <div className="proof-step-header">
                  <h2>
                    3. Upload Proof File
                  </h2>

                  <p>
                    The file is stored
                    on IPFS through
                    Pinata.
                  </p>
                </div>


                <ProofUploader
                  agreementId={
                    selectedTarget
                      .agreement.id
                  }
                  milestoneId={
                    selectedTarget
                      .currentMilestone
                      .id
                  }
                  onUploaded={(
                    result
                  ) =>
                    setUploadedProof(
                      result
                    )
                  }
                />

              </section>


              {/* STEP 4 */}
              <section className="proof-step-card">

                <div className="proof-step-header">
                  <h2>
                    4. Submit CID to
                    Blockchain
                  </h2>

                  <p>
                    IPFS upload and
                    blockchain
                    submission are two
                    separate operations.
                  </p>
                </div>


                {uploadedProof ? (
                  <>
                    <div className="blockchain-ready-box">

                      <div>
                        <span className="blockchain-ready-label">
                          Generated CID
                        </span>

                        <code>
                          {
                            uploadedProof.cid
                          }
                        </code>
                      </div>

                    </div>


                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        submitting
                      }
                      onClick={
                        handleBlockchainSubmit
                      }
                    >
                      {submitting
                        ? "Waiting for MetaMask..."
                        : "Submit CID to Blockchain"}
                    </button>
                  </>
                ) : (
                  <div className="blockchain-pending-box">

                    <div className="pending-icon">
                      ◷
                    </div>

                    <div>
                      <strong>
                        Proof file not
                        uploaded yet
                      </strong>

                      <p>
                        Upload the file
                        to IPFS first.
                        Its generated
                        CID can then be
                        recorded on
                        Sepolia.
                      </p>
                    </div>

                  </div>
                )}

              </section>
            </>
          ) : (
            <section className="proof-step-card">

              <div className="form-note">
                <strong>
                  Proof already
                  submitted.
                </strong>

                <br />

                This milestone is
                waiting for its
                designated approver.
              </div>

            </section>
          )}
        </>
      )}


      {error && (
        <div
          className="proof-error-box"
          style={{
            marginTop: "16px",
          }}
        >
          {error}
        </div>
      )}


      {success && (
        <div
          className="proof-upload-success"
          style={{
            marginTop: "16px",
          }}
        >
          <strong>
            {success}
          </strong>
        </div>
      )}

    </div>
  );
}