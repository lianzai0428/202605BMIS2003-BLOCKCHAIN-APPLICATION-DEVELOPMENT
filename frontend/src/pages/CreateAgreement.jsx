import {
  useEffect,
  useState,
} from "react";

import {
  ethToMyr,
} from "../utils/currency";

import {
  Link,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";

import PageHeader
  from "../components/PageHeader";

import {
  createAgreement,
  createAgreementTemplate,
  getAgreementTemplates,
  getDraftAgreementForEdit,
  updateDraftAgreement,
} from "../services/blockchain";


const products = [
  "Fresh Mangoes",
  "Vegetables",
  "Premium Rice",
  "Organic Tomatoes",
];

const locations = [
  "Malaysia",
  "Singapore",
  "Thailand",
  "Indonesia",
  "Vietnam",
];

const units = [
  "kg",
  "tonne",
  "box",
  "crate",
  "unit",
];


export default function CreateAgreement() {
  const navigate = useNavigate();
  const {
    user,
  } = useOutletContext();
  const [searchParams] =
    useSearchParams();

  const editId =
    searchParams.get("edit");

  const isEditMode =
    editId !== null;

  const [form, setForm] =
    useState({
      product: "",
      quantity: "",
      unitOfMeasurement: "kg",
      origin: "Malaysia",
      destination: "Singapore",
      escrowEth: "",
      minimumStakeAgri: "0",
      deadline: "",
      templateId: 0,
    });

  const [templates, setTemplates] =
    useState([]);

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState("0");

  const [templateName, setTemplateName] =
  useState("");

  const [savingTemplate, setSavingTemplate] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");
  
  const [
    createdAgreementId,
    setCreatedAgreementId,
  ] = useState(null);

  const [editTemplateId, setEditTemplateId] =
    useState(0);

  const [loadingDraft, setLoadingDraft] =
    useState(false);


  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value,
    });
  }


  function getLocalDateTime(
    hoursFromNow
  ) {
    const date =
      new Date(
        Date.now() +
          hoursFromNow *
            60 *
            60 *
            1000
      );

    const timezoneOffset =
      date.getTimezoneOffset() *
      60000;

    return new Date(
      date.getTime() -
        timezoneOffset
    )
      .toISOString()
      .slice(0, 16);
  }

  function timestampToLocalDateTime(
    timestamp
  ) {
    const date =
      new Date(
        Number(timestamp) * 1000
      );

    const timezoneOffset =
      date.getTimezoneOffset() *
      60000;

    return new Date(
      date.getTime() -
        timezoneOffset
    )
      .toISOString()
      .slice(0, 16);
  }


  function setQuickDeadline(hours) {
    setForm({
      ...form,
      deadline:
        getLocalDateTime(hours),
    });
  }


  useEffect(() => {
  if (
    !isEditMode ||
    !editId
  ) {
    return;
  }

  async function loadDraft() {
    try {
      setLoadingDraft(true);
      setError("");
      setSuccess("");

      const draft =
        await getDraftAgreementForEdit(
          editId
        );

      setEditTemplateId(
        draft.templateId
      );

      setForm({
        product:
          draft.product,

        quantity:
          draft.quantity,

        unitOfMeasurement:
          draft.unitOfMeasurement,

        origin:
          draft.origin,

        destination:
          draft.destination,

        escrowEth:
          draft.escrowEth,

        minimumStakeAgri:
          draft.minimumStakeAgri,

        deadline:
          timestampToLocalDateTime(
            draft.deadlineTimestamp
          ),
      });

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Unable to load Draft agreement."
      );

    } finally {
      setLoadingDraft(false);
    }
  }

  loadDraft();

}, [
  isEditMode,
  editId,
]);


useEffect(() => {
  if (isEditMode) {
    return;
  }

  async function loadTemplates() {
    try {
      const result =
        await getAgreementTemplates();

      setTemplates(result);

    } catch (err) {
      console.error(
        "Unable to load templates:",
        err
      );
    }
  }

  loadTemplates();

}, [isEditMode]);

function handleTemplateChange(
  event
) {
  const value =
    event.target.value;

  setSelectedTemplateId(
    value
  );

  if (value === "0") {
    setForm((current) => ({
      ...current,
      templateId: 0,
    }));

    return;
  }

  const template =
    templates.find(
      (item) =>
        String(item.id) === value
    );

  if (!template) {
    return;
  }

  setForm((current) => ({
    ...current,

    product:
      template.product,

    unitOfMeasurement:
      template.unitOfMeasurement,

    origin:
      template.origin,

    destination:
      template.destination,

    minimumStakeAgri:
      template.minimumStakeAgri,

    templateId:
      template.id,
  }));
}


async function handleSaveTemplate() {
  try {
    setSavingTemplate(true);
    setError("");

    if (!templateName.trim()) {
      throw new Error(
        "Template name is required."
      );
    }

    const result =
      await createAgreementTemplate({
        name:
          templateName.trim(),

        product:
          form.product,

        unitOfMeasurement:
          form.unitOfMeasurement,

        origin:
          form.origin,

        destination:
          form.destination,

        minimumStakeAgri:
          form.minimumStakeAgri,
      });

    const updatedTemplates =
      await getAgreementTemplates();

    setTemplates(
      updatedTemplates
    );

    if (
      result.templateId !== null
    ) {
      setSelectedTemplateId(
        String(
          result.templateId
        )
      );

      setForm((current) => ({
        ...current,
        templateId:
          result.templateId,
      }));

      setSuccess(
        `Reusable template #${result.templateId} created successfully.`
      );
    } else {
      setSuccess(
        "Reusable template created successfully."
      );
    }

    setTemplateName("");

  } catch (err) {
    console.error(err);

    setError(
      err.reason ||
      err.shortMessage ||
      err.message ||
      "Template creation failed."
    );

  } finally {
    setSavingTemplate(false);
  }
}

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (
        form.origin ===
        form.destination
      ) {
        throw new Error(
          "Origin and destination must be different."
        );
      }

      if (isEditMode) {
        await updateDraftAgreement(
          editId,
          {
            ...form,
            templateId:
              editTemplateId,
          }
        );

        navigate(
          `/agreements/${editId}`,
          { replace: true }
        );

        return;
      }

      const result =
        await createAgreement(
          form
        );

      if (
        result.agreementId !== null
      ) {
        setCreatedAgreementId(
          result.agreementId
        );

        setSuccess(
          `Agreement #${result.agreementId} created successfully as Draft.`
        );
      } else {
        setSuccess(
          "Agreement created successfully."
        );
      }

    } catch (err) {
      console.error(err);

      setError(
        err.reason ||
        err.shortMessage ||
        err.message ||
        "Agreement creation failed."
      );

    } finally {
      setLoading(false);
    }
  }


  if (user?.role !== 1) {
    return (
      <>
        <PageHeader
          title="Create Agreement"
          description="Create a new agricultural logistics agreement."
        />

        <section className="card">
          <h2>
            Shipper Access Required
          </h2>

          <p>
            Only a registered Shipper
            can create agreements.
          </p>
        </section>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title={
          isEditMode
            ? `Edit Draft Agreement #${editId}`
            : "Create Agreement"
        }
        description={
          isEditMode
            ? "Update shipment, escrow, stake and deadline requirements before posting the agreement."
            : "Define shipment, escrow and deadline requirements for a new agreement."
        }
      />


      <section className="card form-card">

        {!isEditMode && (
          <div className="form-group">
            <label>
              Agreement Setup
            </label>

            <select
              value={selectedTemplateId}
              onChange={
                handleTemplateChange
              }
            >
              <option value="0">
                Custom Agreement
              </option>

              {templates.map(
                (template) => (
                  <option
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                  </option>
                )
              )}
            </select>

            <small>
              Choose a reusable platform
              template to prefill common
              shipment settings, or keep
              Custom Agreement.
            </small>
          </div>
        )}

        <div className="section-title">
          <h2>
            Shipment Details
          </h2>

          <p>
            The connected Shipper wallet
            will automatically become the
            agreement creator.
          </p>
        </div>


        <form
          onSubmit={handleSubmit}
        >

          <div className="form-grid">

            <div className="form-group">
              <label>
                Product
              </label>

              <input
                name="product"
                type="text"
                list="product-options"
                value={form.product}
                onChange={updateField}
                placeholder="Select or enter product"
                required
              />

              <datalist id="product-options">
                {products.map(
                  (product) => (
                    <option
                      key={product}
                      value={product}
                    />
                  )
                )}
              </datalist>

              <small>
                Select a common product or enter
                another agricultural product.
              </small>
            </div>


            <div className="form-group">
              <label>
                Quantity
              </label>

              <div className="input-combination">

                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={updateField}
                  placeholder="100"
                  required
                />

                <select
                  name="unitOfMeasurement"
                  value={
                    form.unitOfMeasurement
                  }
                  onChange={updateField}
                >
                  {units.map(
                    (unit) => (
                      <option
                        key={unit}
                        value={unit}
                      >
                        {unit}
                      </option>
                    )
                  )}
                </select>

              </div>
            </div>


            <div className="form-group">
              <label>
                Origin
              </label>

              <input
                name="origin"
                type="text"
                list="origin-options"
                value={form.origin}
                onChange={updateField}
                placeholder="Select or enter origin"
                required
              />

              <datalist id="origin-options">
                {locations.map(
                  (location) => (
                    <option
                      key={location}
                      value={location}
                    />
                  )
                )}
              </datalist>
            </div>


            <div className="form-group">
              <label>
                Destination
              </label>

              <input
                name="destination"
                type="text"
                list="destination-options"
                value={form.destination}
                onChange={updateField}
                placeholder="Select or enter destination"
                required
              />

              <datalist id="destination-options">
                {locations.map(
                  (location) => (
                    <option
                      key={location}
                      value={location}
                    />
                  )
                )}
              </datalist>
            </div>


            <div className="form-group">
              <label>
                Required Escrow
                (ETH)
              </label>

              <input
                name="escrowEth"
                type="number"
                min="0"
                step="0.0001"
                value={form.escrowEth}
                onChange={updateField}
                placeholder="0.01"
                required
              />

              <small>
                {form.escrowEth && (
                  <>
                    Approximate value:{" "}
                    <strong>
                      ≈ {ethToMyr(
                        form.escrowEth
                      )}
                    </strong>
                    <br />
                  </>
                )}

                Enter ETH. Conversion to
                wei is handled automatically.
                MYR is for reference only.
              </small>
            </div>


            <div className="form-group">
              <label>
                Minimum Carrier Stake
                (AGRI)
              </label>

              <input
                name="minimumStakeAgri"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.minimumStakeAgri
                }
                onChange={updateField}
              />

              <small>
                Use 0 if no carrier
                staking requirement is
                needed.
              </small>
            </div>


            <div className="form-group">
              <label>
                Agreement Deadline
              </label>

              <input
                name="deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={updateField}
                required
              />

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setQuickDeadline(1)
                  }
                >
                  +1 Hour
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setQuickDeadline(24)
                  }
                >
                  +1 Day
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setQuickDeadline(
                      24 * 7
                    )
                  }
                >
                  +7 Days
                </button>
              </div>
            </div>

          </div>

          {!isEditMode && (
            <div className="form-note">
              <strong>
                Reusable Template
              </strong>

              <p>
                Save the current product, unit,
                route and minimum AGRI stake for
                reuse in future agreements.
              </p>

              <div className="form-group">
                <label>
                  Template Name
                </label>

                <input
                  type="text"
                  value={templateName}
                  onChange={(event) =>
                    setTemplateName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Malaysia–Singapore Produce"
                />
              </div>

              <button
                type="button"
                className="secondary-button"
                disabled={
                  savingTemplate ||
                  !form.product ||
                  !form.origin ||
                  !form.destination
                }
                onClick={
                  handleSaveTemplate
                }
              >
                {savingTemplate
                  ? "Saving Template..."
                  : "Save as Reusable Template"}
              </button>
            </div>
          )}

          {isEditMode && (
            <div className="form-note">
              <strong>
                Important:
              </strong>
              {" "}
              Editing shipment details does not
              automatically change the required
              escrow amount. Please review the
              escrow amount before saving.

              {" "}

              If you change the required escrow
              amount after funding has started,
              the existing Draft escrow will be
              refunded and the agreement must be
              funded again.
            </div>
          )}


          <div className="form-note">
            <strong>
              Agreement lifecycle:
            </strong>
            {" "}
            This creates a Draft only.
            The Carrier is not selected
            here. Milestones and escrow
            funding must be completed
            before the agreement can be
            Posted for Carrier
            acceptance.
          </div>


          {error && (
            <div
              className="form-note"
              style={{
                color: "red",
              }}
            >
              {error}
            </div>
          )}


          {success && (
            <div
              className="form-note"
            >
              <strong>
                {success}
              </strong>

              <br />

              Next, configure the
              agreement's milestones and
              fund its escrow.
            </div>
          )}


          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={
                loading ||
                loadingDraft ||
                (
                  !isEditMode &&
                  createdAgreementId !== null
                )
              }
            >
              {loading
                ? "Waiting for transaction..."
                : loadingDraft
                  ? "Loading Draft..."
                  : isEditMode
                    ? "Save Draft Changes"
                    : createdAgreementId !== null
                      ? "Draft Created"
                      : "Create Draft Agreement"}
            </button>
            {createdAgreementId !== null && (
              <>
                <Link
                  to={`/agreements/${createdAgreementId}`}
                  className="secondary-button"
                >
                  View Agreement
                </Link>

                <Link
                  to="/milestones"
                  className="primary-button"
                >
                  Configure Milestones
                </Link>
              </>
            )}
          </div>

        </form>

      </section>
    </>
  );
} 