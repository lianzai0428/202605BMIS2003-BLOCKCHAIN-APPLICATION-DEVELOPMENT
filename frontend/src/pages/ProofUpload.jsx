import { useMemo, useState } from "react";

import PageHeader from "../components/PageHeader";
import ProofUploader from "../components/ProofUploader";

import {
  agreements,
  milestones,
} from "../mock/mockData";

export default function ProofUpload() {
  const [selectedAgreementId, setSelectedAgreementId] =
    useState("");

  const [selectedMilestoneId, setSelectedMilestoneId] =
    useState("");

  const [uploadedProof, setUploadedProof] =
    useState(null);

  const relevantMilestones = useMemo(() => {
    if (!selectedAgreementId) return [];

    return milestones.filter(
      (milestone) =>
        milestone.agreementId === selectedAgreementId &&
        (
          milestone.status === "Proof Required" ||
          milestone.status === "Rejected"
        )
    );
  }, [selectedAgreementId]);

  const selectedMilestone = milestones.find(
    (milestone) =>
      milestone.id === selectedMilestoneId
  );

  function handleAgreementChange(event) {
    setSelectedAgreementId(event.target.value);
    setSelectedMilestoneId("");
    setUploadedProof(null);
  }

  function handleMilestoneChange(event) {
    setSelectedMilestoneId(event.target.value);
    setUploadedProof(null);
  }

  return (
    <div>
      <PageHeader
        title="Proof Submission"
        description="Select an agreement and milestone before uploading supporting proof to IPFS."
      />

      {/* STEP 1 */}
      <section className="proof-step-card">
        <div className="proof-step-header">
          <h2>1. Select Proof Target</h2>
          <p>
            Select the agreement and milestone that this
            proof belongs to.
          </p>
        </div>

        <div className="proof-form-grid">
          <div className="form-group">
            <label htmlFor="proof-agreement">
              Agreement
            </label>

            <select
              id="proof-agreement"
              value={selectedAgreementId}
              onChange={handleAgreementChange}
            >
              <option value="">
                Select agreement
              </option>

              {agreements.map((agreement) => (
                <option
                  key={agreement.id}
                  value={agreement.id}
                >
                  {agreement.id} — {agreement.product}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="proof-milestone">
              Milestone Requiring Proof
            </label>

            <select
              id="proof-milestone"
              value={selectedMilestoneId}
              onChange={handleMilestoneChange}
              disabled={!selectedAgreementId}
            >
              <option value="">
                Select milestone
              </option>

              {relevantMilestones.map(
                (milestone) => (
                  <option
                    key={milestone.id}
                    value={milestone.id}
                  >
                    {milestone.id} —{" "}
                    {milestone.title}
                  </option>
                )
              )}
            </select>

            {selectedAgreementId &&
              relevantMilestones.length === 0 && (
                <small className="muted">
                  No milestone currently requires proof
                  for this agreement.
                </small>
              )}
          </div>
        </div>
      </section>

      {/* STEP 2 */}
      {selectedMilestone && (
        <section className="proof-step-card">
          <div className="proof-step-header">
            <h2>2. Review Proof Record</h2>

            <p>
              Review the current proof reference and
              previous proof submissions before uploading
              a new file.
            </p>
          </div>

          <div className="proof-record-layout">
            {/* Current CID */}
            <div className="proof-record-column">
              <h3>Current Active CID</h3>

              <div className="current-proof-box">
                <div className="proof-document-icon">
                  ▤
                </div>

                {selectedMilestone.currentCid ? (
                  <code className="proof-cid-text">
                    {selectedMilestone.currentCid}
                  </code>
                ) : (
                  <span className="proof-empty-text">
                    No current active proof CID.
                  </span>
                )}
              </div>
            </div>

            {/* Previous submissions */}
            <div className="proof-record-column">
              <h3>Previous Proof Submissions</h3>

              {selectedMilestone.previousSubmissions
                ?.length > 0 ? (
                <div className="proof-history-table-wrapper">
                  <table className="proof-history-table">
                    <thead>
                      <tr>
                        <th>CID</th>
                        <th>Status</th>
                        <th>Submitted At</th>
                        <th>Source</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedMilestone.previousSubmissions.map(
                        (submission, index) => (
                          <tr
                            key={`${submission.cid}-${index}`}
                          >
                            <td>
                              <code>
                                {submission.cid}
                              </code>
                            </td>

                            <td>
                              <span
                                className={`proof-history-status proof-history-${submission.status
                                  .toLowerCase()
                                  .replaceAll(" ", "-")}`}
                              >
                                {submission.status}
                              </span>
                            </td>

                            <td>
                              {submission.submittedAt}
                            </td>

                            <td>
                              {submission.source}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="proof-empty-history">
                  No previous proof submissions.
                </div>
              )}
            </div>
          </div>

          <div className="historical-proof-info">
            <div className="historical-info-icon">
              i
            </div>

            <div>
              <strong>
                Historical Proof Records
              </strong>

              <p>
                Previous rejected or replaced proof CIDs
                are historical records obtained from
                blockchain event logs.
              </p>

              <p>
                They are not treated as the current active
                proof CID stored in the smart contract
                state.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3 */}
      {selectedAgreementId &&
        selectedMilestoneId && (
          <section className="proof-step-card">
            <div className="proof-step-header">
              <h2>3. Upload Proof File</h2>

              <p>
                Upload the supporting proof file to IPFS
                through Pinata.
              </p>
            </div>

            <ProofUploader
              agreementId={selectedAgreementId}
              milestoneId={selectedMilestoneId}
              onUploaded={(result) => {
                setUploadedProof(result);
              }}
            />
          </section>
        )}

      {/* STEP 4 */}
      {selectedAgreementId &&
        selectedMilestoneId && (
          <section className="proof-step-card">
            <div className="proof-step-header">
              <h2>4. Submit CID to Blockchain</h2>

              <p>
                The proof file is stored on IPFS. The
                generated CID must be submitted separately
                to the smart contract.
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
                      {uploadedProof.cid}
                    </code>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  disabled
                >
                  Submit CID to Blockchain —
                  Integration Pending
                </button>
              </>
            ) : (
              <div className="blockchain-pending-box">
                <div className="pending-icon">
                  ◷
                </div>

                <div>
                  <strong>
                    Blockchain Integration Pending
                  </strong>

                  <p>
                    Uploading the file to IPFS does not
                    record the CID on the blockchain
                    automatically.
                  </p>

                  <p>
                    Complete the proof upload first. The
                    smart contract transaction will be
                    integrated separately.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
    </div>
  );
}