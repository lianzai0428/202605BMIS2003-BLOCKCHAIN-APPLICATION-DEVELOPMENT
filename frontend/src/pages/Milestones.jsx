import { useMemo, useState } from "react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

import {
  agreements,
  milestones,
} from "../mock/mockData";

export default function Milestones() {
  const [agreementId, setAgreementId] =
    useState(agreements[0].id);

  const selectedMilestones = useMemo(
    () =>
      milestones.filter(
        (milestone) =>
          milestone.agreementId === agreementId
      ),
    [agreementId]
  );

  return (
    <>
      <PageHeader
        title="Milestones"
        description="Select an agreement to review milestone progress and proof submission status."
      />

      <section className="card">
        <div className="form-group">
          <label htmlFor="milestoneAgreement">
            Agreement
          </label>

          <select
            id="milestoneAgreement"
            value={agreementId}
            onChange={(event) =>
              setAgreementId(event.target.value)
            }
          >
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
      </section>

      <div className="milestone-list">
        {selectedMilestones.length === 0 ? (
          <section className="card empty-state">
            No milestones available for this agreement.
          </section>
        ) : (
          selectedMilestones.map((milestone, index) => (
            <section
              className="card milestone-card"
              key={milestone.id}
            >
              <div className="milestone-number">
                {index + 1}
              </div>

              <div className="milestone-content">
                <div className="milestone-heading">
                  <div>
                    <span className="eyebrow">
                      {milestone.id}
                    </span>

                    <h2>{milestone.title}</h2>
                  </div>

                  <StatusBadge
                    status={milestone.status}
                  />
                </div>

                <p>{milestone.description}</p>

                <dl className="details-list">
                  <div>
                    <dt>Required Completion Date</dt>
                    <dd>{milestone.dueDate}</dd>
                  </div>

                  <div>
                    <dt>Current Accepted / Active CID</dt>
                    <dd>
                      {milestone.currentCid ||
                        "No current CID"}
                    </dd>
                  </div>
                </dl>

                {milestone.previousSubmissions.length >
                  0 && (
                  <div className="submission-history">
                    <h3>Previous Proof Submissions</h3>

                    <p className="muted">
                      Previous rejected or replaced CIDs are
                      displayed from blockchain event logs
                      rather than the current contract state.
                    </p>

                    {milestone.previousSubmissions.map(
                      (submission) => (
                        <div
                          className="history-row"
                          key={submission.cid}
                        >
                          <div>
                            <strong>
                              {submission.cid}
                            </strong>

                            <span>
                              Submitted{" "}
                              {submission.submittedAt}
                            </span>
                          </div>

                          <div>
                            <StatusBadge
                              status={
                                submission.status
                              }
                            />

                            <small>
                              Source:{" "}
                              {submission.source}
                            </small>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}