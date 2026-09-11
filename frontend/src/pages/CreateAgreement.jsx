import { useState } from "react";
import PageHeader from "../components/PageHeader";

const buyers = [
  "GreenMart Sdn Bhd",
  "Fresh Market Sdn Bhd",
  "City Grocer",
];

const sellers = [
  "Fresh Farm Sdn Bhd",
  "Kedah Agro Farm",
  "Tropical Harvest",
];

const carriers = [
  "FastAgro Logistics",
  "North Logistics",
  "Agro Express",
];

const products = [
  "Organic Tomatoes",
  "Premium Rice",
  "Fresh Mangoes",
  "Vegetables",
];

export default function CreateAgreement() {
  const [form, setForm] = useState({
    buyer: "",
    seller: "",
    carrier: "",
    product: "",
    quantity: "",
    unit: "kg",
    deliveryDate: "",
  });

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    alert(
      "UI validation successful. Blockchain agreement creation will be integrated separately."
    );
  }

  return (
    <>
      <PageHeader
        title="Create Agreement"
        description="Enter the required trade details before submitting a new agreement to the blockchain."
      />

      <section className="card form-card">
        <div className="section-title">
          <h2>Agreement Parties</h2>
          <p>Select the parties involved in this trade.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Buyer</label>
              <select
                name="buyer"
                value={form.buyer}
                onChange={updateField}
                required
              >
                <option value="">Select buyer</option>

                {buyers.map((buyer) => (
                  <option key={buyer}>{buyer}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Seller</label>
              <select
                name="seller"
                value={form.seller}
                onChange={updateField}
                required
              >
                <option value="">Select seller</option>

                {sellers.map((seller) => (
                  <option key={seller}>{seller}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Carrier</label>
              <select
                name="carrier"
                value={form.carrier}
                onChange={updateField}
                required
              >
                <option value="">Select carrier</option>

                {carriers.map((carrier) => (
                  <option key={carrier}>{carrier}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Product</label>
              <select
                name="product"
                value={form.product}
                onChange={updateField}
                required
              >
                <option value="">Select product</option>

                {products.map((product) => (
                  <option key={product}>{product}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantity</label>

              <div className="input-combination">
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={updateField}
                  placeholder="Enter quantity"
                  required
                />

                <select
                  name="unit"
                  value={form.unit}
                  onChange={updateField}
                >
                  <option value="kg">kg</option>
                  <option value="tonne">tonne</option>
                  <option value="box">box</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Required Delivery Date</label>

              <input
                name="deliveryDate"
                type="date"
                value={form.deliveryDate}
                onChange={updateField}
                required
              />
            </div>
          </div>

          <div className="form-note">
            The blockchain transaction is not submitted in this prototype
            screen. Contract integration will be connected separately.
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              Review Agreement
            </button>
          </div>
        </form>
      </section>
    </>
  );
}