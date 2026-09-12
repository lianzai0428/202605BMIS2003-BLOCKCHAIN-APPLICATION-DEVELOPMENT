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
  getApprovalTasks,
  approveMilestone,
  rejectMilestone,
} from "../services/blockchain";


export default function ApprovalTasks() {
  const {
    user,
  } = useOutletContext();

  const [tasks, setTasks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function loadTasks() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getApprovalTasks();

      setTasks(result);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load approval tasks."
      );

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    if (
      user?.role === 3 ||
      user?.role === 4
    ) {
      loadTasks();
    }
  }, [user]);


  async function handleApprove(
    agreementId,
    milestoneId
  ) {
    try {
      setProcessing(
        `${agreementId}-${milestoneId}`
      );

      setError("");
      setSuccess("");

      await approveMilestone(
        agreementId,
        milestoneId
      );

      setSuccess(
        `Milestone ${
          milestoneId + 1
        } for Agreement #${agreementId} approved successfully.`
      );

      await loadTasks();

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Milestone approval failed."
      );

    } finally {
      setProcessing(null);
    }
  }


  async function handleReject(
    agreementId,
    milestoneId
  ) {
    try {
      setProcessing(
        `${agreementId}-${milestoneId}`
      );

      setError("");
      setSuccess("");

      await rejectMilestone(
        agreementId,
        milestoneId
      );

      setSuccess(
        `Milestone ${
          milestoneId + 1
        } for Agreement #${agreementId} rejected.`
      );

      await loadTasks();

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Milestone rejection failed."
      );

    } finally {
      setProcessing(null);
    }
  }


  if (
    user?.role !== 3 &&
    user?.role !== 4
  ) {
    return (
      <>
        <PageHeader
          title="Approval Tasks"
          description="Review submitted milestone proof."
        />

        <section className="card">
          <h2>
            Approver Access Required
          </h2>

          <p>
            Only designated Warehouse
            or Customs approvers can
            review submitted proof.
          </p>
        </section>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title="Approval Tasks"
        description="Review proof submitted for milestones assigned to your wallet."
      />


      {error && (
        <div className="form-note">
          {error}
        </div>
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
        <section className="card">
          Loading approval tasks...
        </section>
      ) : tasks.length === 0 ? (
        <section className="card">
          <h2>
            No Pending Approvals
          </h2>

          <p>
            No submitted milestones
            are currently assigned to
            this wallet.
          </p>
        </section>
      ) : (
        tasks.map(
          ({
            agreement,
            milestone,
          }) => {

            const key =
              `${agreement.id}-${milestone.id}`;

            const gateway =
              import.meta.env
                .VITE_PINATA_GATEWAY;

            const proofUrl =
              gateway &&
              milestone.proofCid
                ? `https://${gateway}/ipfs/${milestone.proofCid}`
                : null;

            return (
              <section
                key={key}
                className="card"
                style={{
                  marginBottom:
                    "20px",
                }}
              >

                <div className="card-header">

                  <div>
                    <h2>
                      Agreement #
                      {agreement.id}
                    </h2>

                    <p>
                      {agreement.product}
                    </p>
                  </div>

                  <strong>
                    Milestone{" "}
                    {milestone.id + 1}
                  </strong>

                </div>


                <div
                  className="form-grid"
                  style={{
                    marginTop:
                      "20px",
                  }}
                >

                  <div>
                    <span>
                      Description
                    </span>

                    <p>
                      {
                        milestone.description
                      }
                    </p>
                  </div>


                  <div>
                    <span>
                      Proof Requirement
                    </span>

                    <p>
                      {
                        milestone
                          .proofRequirement
                      }
                    </p>
                  </div>


                  <div>
                    <span>
                      Payment
                    </span>

                    <p>
                      {
                        milestone
                          .paymentPercentage
                      }
                      %
                    </p>
                  </div>


                  <div>
                    <span>
                      Submitted At
                    </span>

                    <p>
                      {
                        milestone
                          .proofSubmittedAt
                          ? new Date(
                              milestone
                                .proofSubmittedAt *
                                1000
                            ).toLocaleString()
                          : "—"
                      }
                    </p>
                  </div>

                </div>


                <div
                  className="form-note"
                  style={{
                    marginTop:
                      "20px",
                  }}
                >
                  <strong>
                    Submitted IPFS CID
                  </strong>

                  <br />

                  <code>
                    {
                      milestone.proofCid
                    }
                  </code>
                </div>


                {proofUrl && (
                  <div
                    style={{
                      marginTop:
                        "16px",
                    }}
                  >
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="secondary-button"
                    >
                      View Proof File
                    </a>
                  </div>
                )}


                <div
                  className="form-actions"
                  style={{
                    marginTop:
                      "24px",
                  }}
                >

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      processing ===
                      key
                    }
                    onClick={() =>
                      handleReject(
                        agreement.id,
                        milestone.id
                      )
                    }
                  >
                    {processing === key
                        ? "Waiting for transaction..."
                        : "Reject Proof"}
                  </button>


                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      processing ===
                      key
                    }
                    onClick={() =>
                      handleApprove(
                        agreement.id,
                        milestone.id
                      )
                    }
                  >
                    {processing ===
                    key
                      ? "Waiting for MetaMask..."
                      : "Approve Milestone"}
                  </button>

                </div>

              </section>
            );
          }
        )
      )}
    </>
  );
}