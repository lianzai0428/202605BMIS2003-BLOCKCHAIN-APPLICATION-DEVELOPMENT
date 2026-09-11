import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getUserTransactionHistory,
} from "../services/blockchain";

import "./TransactionHistory.css";


function shortHash(value) {
  if (!value) return "—";

  return (
    value.slice(0, 10) +
    "..." +
    value.slice(-8)
  );
}


export default function TransactionHistory() {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [search, setSearch] =
    useState("");


  useEffect(() => {
    load();
  }, []);


  async function load() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getUserTransactionHistory();

      setData(result);

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load transaction history."
      );

    } finally {
      setLoading(false);
    }
  }


  const filtered =
    useMemo(() => {
      if (!data) return [];

      const term =
        search
          .trim()
          .toLowerCase();

      return data.transactions.filter(
        item => {

          const matchesCategory =
            category === "All" ||
            item.category ===
              category;

          const matchesSearch =
            !term ||
            String(
              item.agreementId
            ).includes(term) ||
            item.product
              ?.toLowerCase()
              .includes(term) ||
            item.title
              ?.toLowerCase()
              .includes(term) ||
            item.actor?.name
              ?.toLowerCase()
              .includes(term);

          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );

    }, [
      data,
      category,
      search,
    ]);


  if (loading) {
    return (
      <section className="tx-page">
        Loading transaction history...
      </section>
    );
  }


  if (error) {
    return (
      <section className="tx-page">
        <div className="tx-error">
          {error}
        </div>
      </section>
    );
  }


  const categories = [
    "All",
    "Agreement",
    "Milestone",
    "Proof",
    "Escrow",
    "AGRI",
    "Failure",
  ];


  return (
    <div className="tx-page">

      <header className="tx-header">

        <div>
          <div className="tx-eyebrow">
            BLOCKCHAIN ACTIVITY
          </div>

          <h1>
            Transaction History
          </h1>

          <p>
            On-chain activity relevant
            to your {data.role} account.
          </p>
        </div>


        <div className="tx-summary">

          <div>
            <strong>
              {
                data
                  .agreementCount
              }
            </strong>

            <span>
              Agreements
            </span>
          </div>


          <div>
            <strong>
              {
                data
                  .transactionCount
              }
            </strong>

            <span>
              Events
            </span>
          </div>

        </div>

      </header>


      <section className="tx-toolbar">

        <input
          type="text"
          placeholder="Search agreement, product, event or participant..."
          value={search}
          onChange={
            event =>
              setSearch(
                event.target.value
              )
          }
        />


        <div className="tx-filters">

          {categories.map(
            item => (

              <button
                key={item}
                className={
                  category === item
                    ? "active"
                    : ""
                }
                onClick={
                  () =>
                    setCategory(
                      item
                    )
                }
              >
                {item}
              </button>

            )
          )}

        </div>

      </section>


      <section className="tx-list">

        {filtered.length === 0 ? (

          <div className="tx-empty">
            No matching blockchain
            activity found.
          </div>

        ) : (

          filtered.map(
            event => (

              <article
                className="tx-card"
                key={
                  `${event.transactionHash}-${event.logIndex}`
                }
              >

                <div className="tx-top">

                  <div>

                    <div className="tx-context">
                      Agreement #
                      {
                        event
                          .agreementId
                      }
                      {" · "}
                      {
                        event.product
                      }
                    </div>


                    <h3>
                      {event.title}
                    </h3>

                  </div>


                  <div className="tx-time">
                    {event.time}
                  </div>

                </div>


                <div className="tx-body">

                  <div className="tx-main">

                    <span
                      className={
                        `tx-category tx-${event.category.toLowerCase()}`
                      }
                    >
                      {
                        event.category
                      }
                    </span>


                    <p>
                      {
                        event.description
                      }
                    </p>

                  </div>


                  <div className="tx-actor">

                    <span>
                      Participant
                    </span>

                    <strong>
                      {
                        event.actor
                          ?.name
                      }
                    </strong>

                    <small>
                      {
                        event.actor
                          ?.role
                      }
                    </small>

                  </div>

                </div>


                {Object.keys(
                  event.details || {}
                ).length > 0 && (

                  <div className="tx-details">

                    {Object.entries(
                      event.details
                    ).map(
                      ([
                        label,
                        value,
                      ]) => (

                        <div
                          key={label}
                        >
                          <span>
                            {label}
                          </span>

                          <strong>
                            {
                              String(
                                value
                              )
                            }
                          </strong>
                        </div>

                      )
                    )}

                  </div>

                )}


                <details className="tx-chain">

                  <summary>
                    Blockchain verification
                  </summary>


                  <div className="tx-chain-grid">

                    <div>
                      <span>
                        Contract
                      </span>

                      <strong>
                        {
                          event.source
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        Solidity Event
                      </span>

                      <strong>
                        {
                          event.eventName
                        }
                      </strong>
                    </div>


                    <div>
                      <span>
                        Block
                      </span>

                      <strong>
                        {
                          event
                            .blockNumber
                        }
                      </strong>
                    </div>

                  </div>


                  <div className="tx-hash">

                    <span>
                      Transaction Hash
                    </span>

                    <code>
                      {
                        event
                          .transactionHash
                      }
                    </code>


                    <a
                      href={
                        event
                          .explorerUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Verify on Sepolia
                      Etherscan ↗
                    </a>

                  </div>

                </details>

              </article>

            )
          )

        )}

      </section>

    </div>
  );
}