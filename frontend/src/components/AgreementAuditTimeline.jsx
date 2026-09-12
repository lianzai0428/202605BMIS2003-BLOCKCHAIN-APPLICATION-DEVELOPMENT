import "./AgreementAuditTimeline.css";


function shortHash(value) {
  if (!value) return "—";

  return (
    value.slice(0, 10) +
    "..." +
    value.slice(-8)
  );
}


export default function AgreementAuditTimeline({
  audit,
}) {
  if (!audit) return null;

  if (audit.events.length === 0) {
    return (
      <section className="aat-card">
        <h2>Audit Timeline</h2>

        <p>
          No agreement events were
          found in the configured
          blockchain scan range.
        </p>
      </section>
    );
  }


  return (
    <section className="aat-card">

      <div className="aat-header">

        <div>
          <div className="aat-eyebrow">
            ON-CHAIN AUDIT TRAIL
          </div>

          <h2>
            Agreement Activity
          </h2>

          <p>
            Chronological events
            reconstructed directly
            from Sepolia logs.
          </p>
        </div>


        <div className="aat-count">
          {audit.eventCount}
          <span>events</span>
        </div>

      </div>


      <div className="aat-timeline">

        {audit.events.map(
          (event, index) => (

            <article
              className="aat-event"
              key={
                `${event.transactionHash}-${event.logIndex}`
              }
            >

              <div className="aat-rail">

                <div className="aat-dot">
                  {index + 1}
                </div>

                {index <
                  audit.events.length -
                    1 && (
                  <div className="aat-line" />
                )}

              </div>


              <div className="aat-content">

                <div className="aat-event-head">

                  <div>
                    <span
                      className={
                        `aat-category category-${event.category.toLowerCase()}`
                      }
                    >
                      {event.category}
                    </span>

                    <h3>
                      {event.title}
                    </h3>
                  </div>


                  <time>
                    {event.time}
                  </time>

                </div>


                <p className="aat-description">
                  {event.description}
                </p>


                <div className="aat-actor">

                  <span>
                    Actor
                  </span>

                  <strong>
                    {event.actor.name}
                  </strong>

                  <small>
                    {event.actor.role}
                  </small>

                  {event.actor.address && (
                    <code>
                      {shortHash(
                        event.actor
                          .address
                      )}
                    </code>
                  )}

                </div>


                {Object.keys(
                  event.details
                ).length > 0 && (

                  <div className="aat-details">

                    {Object.entries(
                      event.details
                    ).map(
                      ([
                        label,
                        value,
                      ]) => (

                        <div
                          className="aat-detail"
                          key={label}
                        >
                          <span>
                            {label}
                          </span>

                          <strong>
                            {String(
                              value
                            )}
                          </strong>
                        </div>

                      )
                    )}

                  </div>

                )}


                <details className="aat-debug">

                  <summary>
                    Blockchain transaction details
                  </summary>


                  <div className="aat-debug-grid">

                    <div>
                      <span>
                        Smart Contract
                      </span>

                      <strong>
                        {event.source}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Solidity Event
                      </span>

                      <strong>
                        {event.eventName}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Block
                      </span>

                      <strong>
                        {event.blockNumber}
                      </strong>
                    </div>


                    <div>
                      <span>
                        Log Index
                      </span>

                      <strong>
                        {event.logIndex}
                      </strong>
                    </div>

                  </div>


                  <div className="aat-tx">

                    <span>
                      Transaction Hash
                    </span>

                    <code>
                      {
                        event.transactionHash
                      }
                    </code>

                    <a
                      href={
                        event.explorerUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Verify on Sepolia Etherscan ↗
                    </a>

                  </div>

                </details>

              </div>

            </article>

          )
        )}

      </div>


      <details className="aat-scan">

        <summary>
          Event scan information
        </summary>

        <div>
          <span>
            From block
          </span>

          <strong>
            {audit.scannedFromBlock}
          </strong>
        </div>

        <div>
          <span>
            To block
          </span>

          <strong>
            {audit.scannedToBlock}
          </strong>
        </div>

      </details>

    </section>
  );
}