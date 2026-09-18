import { useState } from "react";
import { supabase } from "../lib/supabase.js";

const categories = {
  Home: ["Households", "Garden"],
  Fashion: ["Adultwear", "Kidswear"],
  Shoes: ["Kids Shoes", "Ladies Shoes", "Men Shoes"],
  Jewelry: [],
  Gadgets: [],
  Bags: [],
};

function getEditForm(product) {
  return {
    name: product.name || "",
    category: product.category || "Home",
    subcategory: product.subcategory || "",
    description: product.description || "",
    price: product.price ?? "",
    estimated_shipping: product.estimated_shipping ?? "",
    stock_status: product.stock_status || "preorder",
    featured: Boolean(product.featured),
    active: Boolean(product.active),
  };
}

export default function ProductManager({
  products,
  onUpdated,
  onDeleted,
  onMessage,
}) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function startEditing(product) {
    setEditingId(product.id);
    setForm(getEditForm(product));
    onMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(null);
  }

  function updateField(field, value) {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [field]: value,
      };

      if (field === "category") {
        nextForm.subcategory = categories[value][0] || "";
      }

      return nextForm;
    });
  }

  async function saveChanges(event) {
    event.preventDefault();

    if (!supabase || !form || !editingId) {
      return;
    }

    setSaving(true);
    onMessage("");

    const { data, error } = await supabase
      .from("products")
      .update({
        name: form.name.trim(),
        category: form.category,
        subcategory: form.subcategory || null,
        description: form.description.trim(),
        price: Number(form.price),
        estimated_shipping: Number(form.estimated_shipping),
        currency: "KES",
        stock_status: form.stock_status,
        featured: form.featured,
        active: form.active,
      })
      .eq("id", editingId)
      .select()
      .single();

    if (error) {
      onMessage(error.message);
      setSaving(false);
      return;
    }

    onUpdated(data);
    cancelEditing();
    onMessage("Product changes saved successfully.");
    setSaving(false);
  }

  async function deleteProduct(product) {
    if (!supabase) {
      onMessage("Supabase is not configured.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${product.name}" from the catalog? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(product.id);
    onMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      onMessage(error.message);
      setDeletingId(null);
      return;
    }

    onDeleted(product.id);

    if (editingId === product.id) {
      cancelEditing();
    }

    onMessage("Product deleted successfully.");
    setDeletingId(null);
  }

  return (
    <section className="product-manager-panel">
      <div className="product-manager-heading">
        <div>
          <p className="eyebrow">CATALOG MANAGEMENT</p>
          <h2>Edit or delete products</h2>
          <p className="muted">
            Product prices and estimated shipping are stored in KES.
          </p>
        </div>

        <span className="kes-badge">CURRENCY: KES</span>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          No products are available to manage.
        </div>
      ) : (
        <div className="product-manager-list">
          {products.map((product) => {
            const isEditing = editingId === product.id;

            if (isEditing && form) {
              const subcategories = categories[form.category] || [];

              return (
                <form
                  className="product-edit-form"
                  key={product.id}
                  onSubmit={saveChanges}
                >
                  <h3>Editing: {product.name}</h3>

                  <label>
                    Product name
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      required
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Main category
                      <select
                        value={form.category}
                        onChange={(event) =>
                          updateField(
                            "category",
                            event.target.value,
                          )
                        }
                      >
                        {Object.keys(categories).map((category) => (
                          <option
                            value={category}
                            key={category}
                          >
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
                          updateField(
                            "subcategory",
                            event.target.value,
                          )
                        }
                        disabled={subcategories.length === 0}
                      >
                        {subcategories.length === 0 ? (
                          <option value="">None</option>
                        ) : (
                          subcategories.map((subcategory) => (
                            <option
                              value={subcategory}
                              key={subcategory}
                            >
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
                        updateField(
                          "description",
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Price in KES
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) =>
                          updateField("price", event.target.value)
                        }
                        required
                      />
                    </label>

                    <label>
                      Estimated shipping in KES
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
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Stock status
                    <select
                      value={form.stock_status}
                      onChange={(event) =>
                        updateField(
                          "stock_status",
                          event.target.value,
                        )
                      }
                    >
                      <option value="preorder">Preorder</option>
                      <option value="available">Available</option>
                      <option value="sold_out">Sold out</option>
                    </select>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) =>
                        updateField(
                          "featured",
                          event.target.checked,
                        )
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

                  <div className="product-edit-actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancel edit
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <article className="product-manager-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>

                  <span>
                    {product.category}
                    {product.subcategory
                      ? ` / ${product.subcategory}`
                      : ""}
                  </span>

                  <small>
                    {Number(product.price).toLocaleString()} KES
                    {" + "}
                    {Number(
                      product.estimated_shipping,
                    ).toLocaleString()}{" "}
                    KES shipping
                  </small>

                  <small>
                    {product.active ? "Visible" : "Hidden"} ·{" "}
                    {product.stock_status}
                  </small>
                </div>

                <div className="product-manager-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => startEditing(product)}
                  >
                    Edit product
                  </button>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => deleteProduct(product)}
                    disabled={deletingId === product.id}
                  >
                    {deletingId === product.id
                      ? "Deleting..."
                      : "Delete product"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

