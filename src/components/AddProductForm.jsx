import { useState } from "react";
import { supabase } from "../lib/supabase";

const categories = {
  Home: ["Households", "Garden"],
  Fashion: ["Adultwear", "Kidswear"],
  Shoes: ["Kids Shoes", "Ladies Shoes", "Men Shoes"],
  Jewelry: [],
  Gadgets: [],
  Bags: [],
};

const initialForm = {
  name: "",
  category: "Home",
  subcategory: "Households",
  description: "",
  price: "",
  estimated_shipping: "",
  currency: "USD",
  stock_status: "preorder",
  featured: false,
  active: true,
};

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AddProductForm({ userId, onCreated, onMessage }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "category") {
        next.subcategory = categories[value][0] || "";
      }

      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      onMessage("Supabase is not configured.");
      return;
    }

    if (!form.name.trim()) {
      onMessage("Enter a product name.");
      return;
    }

    setSaving(true);
    onMessage("");

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: form.name.trim(),
        slug: `${createSlug(form.name)}-${Date.now()}`,
        category: form.category,
        subcategory: form.subcategory || null,
        description: form.description.trim(),
        price: Number(form.price),
        estimated_shipping: Number(form.estimated_shipping),
        currency: form.currency,
        stock_status: form.stock_status,
        featured: form.featured,
        active: form.active,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      onMessage(error.message);
      setSaving(false);
      return;
    }

    onCreated(data);
    setForm(initialForm);
    setOpen(false);
    onMessage("Product added successfully.");
    setSaving(false);
  }

  const subcategories = categories[form.category] || [];

  return (
    <section className="add-product-panel">
      <div className="add-product-heading">
        <div>
          <p className="eyebrow">CATALOG MANAGEMENT</p>
          <h2>Add products</h2>
          <p className="muted">
            Add a preorder item with its estimated shipping cost.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close form" : "+ Add product"}
        </button>
      </div>

      {open && (
        <form className="add-product-form" onSubmit={handleSubmit}>
          <label>
            Product name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              placeholder="Example: Foldable kitchen organizer"
              required
            />
          </label>

          <div className="form-row">
            <label>
              Main category
              <select
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
              >
                {Object.keys(categories).map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Subcategory
              <select
                value={form.subcategory}
                onChange={(event) =>
                  updateField("subcategory", event.target.value)
                }
                disabled={subcategories.length === 0}
              >
                {subcategories.length === 0 ? (
                  <option value="">None</option>
                ) : (
                  subcategories.map((subcategory) => (
                    <option value={subcategory} key={subcategory}>
                      {subcategory}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Describe the item for customers."
              required
            />
          </label>

          <div className="form-row">
            <label>
              Product price
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  updateField("price", event.target.value)
                }
                placeholder="0.00"
                required
              />
            </label>

            <label>
              Estimated shipping
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_shipping}
                onChange={(event) =>
                  updateField(
                    "estimated_shipping",
                    event.target.value,
                  )
                }
                placeholder="0.00"
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
  Currency
  <select
    value={form.currency}
    onChange={(event) =>
      updateField("currency", event.target.value)
    }
  >
    <option value="KES">Kenyan Shilling (KES)</option>
  </select>
</label>

            <label>
              Stock status
              <select
                value={form.stock_status}
                onChange={(event) =>
                  updateField("stock_status", event.target.value)
                }
              >
                <option value="preorder">Preorder</option>
                <option value="available">Available</option>
                <option value="sold_out">Sold out</option>
              </select>
            </label>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                updateField("featured", event.target.checked)
              }
            />
            Featured product
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                updateField("active", event.target.checked)
              }
            />
            Show product in storefront
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving product..." : "Save product"}
          </button>
        </form>
      )}
    </section>
  );
}



