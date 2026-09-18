import { useEffect, useState } from "react";
import { supabase, supabaseConfig } from "./lib/supabase";
import { formatMoney } from "./lib/currency.js";
import AddProductForm from "./components/AddProductForm.jsx";
import MediaGallery from "./components/MediaGallery.jsx";
import CurrencyConverter from "./components/CurrencyConverter.jsx";
import ProductManager from "./components/ProductManager.jsx";
import OrdersReport from "./components/OrdersReport.jsx";
import BrandingSettings from "./components/BrandingSettings.jsx";
import SiteBranding from "./components/SiteBranding.jsx";
import WatermarkedProductImage from "./components/WatermarkedProductImage.jsx";
const WHATSAPP_BUSINESS_NUMBER = "254710924081";


export default function App() {


  const [showOrdersReport, setShowOrdersReport] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [media, setMedia] = useState([]);
  const [cart, setCart] = useState([]);

  const [view, setView] = useState("catalog");
  const [selectedProductId, setSelectedProductId] = useState("");

  const [authMode, setAuthMode] = useState("signin");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mediaType, setMediaType] = useState("image");
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadApplication() {
      if (!supabaseConfig.isConfigured || !supabase) {
        if (mounted) {
          setMessage(
            "Supabase is not configured. Check your .env.local file.",
          );
          setLoading(false);
        }
        return;
      }

      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        if (currentUser) {
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

          if (mounted) {
            setProfile(currentProfile || null);
          }
        }

        const {
          data: productData,
          error: productError,
        } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false });

        if (productError) {
          throw productError;
        }

        let mediaData = [];

        const { data: loadedMedia, error: mediaError } =
          await supabase
            .from("product_media")
            .select("*")
            .order("sort_order", { ascending: true });

        if (!mediaError) {
          mediaData = loadedMedia || [];
        }

        if (mounted) {
          setProducts(productData || []);
          setMedia(mediaData);

          if (productData?.length > 0) {
            setSelectedProductId(productData[0].id);
          }
        }
      } catch (error) {
        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load the website.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadApplication();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleAuth(event) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    if (authMode === "signup") {

    
  if (!phone.trim()) {
    setMessage("WhatsApp number is required.");
    return;
  }

  if (!fullName.trim()) {
    setMessage("Name is required.");
    return;
  }

  if (!email.trim()) {
    setMessage("Email is required for account sign in.");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("Passwords do not match.");
    return;
  }
}
 

    setAuthLoading(true);
    setMessage("");

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              whatsapp_number: phone.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        setMessage(
          "Account created. Check your phone or email if confirmation is enabled.",
        );
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) {
          throw error;
        }

        window.location.reload();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setUser(null);
    setProfile(null);
    setView("catalog");
    setMessage("You have been signed out.");
  }

  function handleProductUpdated(updatedProduct) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === updatedProduct.id
          ? updatedProduct
          : product,
      ),
    );
  }

  function handleProductDeleted(productId) {
    setProducts((currentProducts) =>
      currentProducts.filter(
        (product) => product.id !== productId,
      ),
    );

    setMedia((currentMedia) =>
      currentMedia.filter(
        (item) => item.product_id !== productId,
      ),
    );

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId,
      ),
    );

    if (selectedProductId === productId) {
      setSelectedProductId("");
    }
  }

  function handleProductCreated(product) {
    setProducts((currentProducts) => [
      product,
      ...currentProducts,
    ]);

    setSelectedProductId(product.id);
  }

  function addToCart(product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id,
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });

    setMessage(`${product.name} added to cart.`);
  }

  function updateQuantity(productId, amount) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function checkoutOnWhatsApp() {
    if (cart.length === 0) {
      setMessage("Add at least one product before checkout.");
      return;
    }

    if (!user?.id) {
      setMessage("Please sign in before placing an order.");
      return;
    }

    const customerName =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      "Not provided";

    const customerWhatsApp =
      profile?.whatsapp_number ||
      user?.user_metadata?.whatsapp_number ||
      "Not provided";

    const customerEmail =
      profile?.email ||
      user?.email ||
      "Not provided";

    if (customerWhatsApp === "Not provided") {
      setMessage(
        "Your WhatsApp number is missing from your profile.",
      );
      return;
    }

    const orderNumber =
      `IPO-${Date.now()}-${Math.floor(
        Math.random() * 1000,
      ).toString().padStart(3, "0")}`;

    const orderPayload = {
      order_number: orderNumber,
      user_id: user.id,
      customer_name: customerName,
      client_name: customerName,
      customer_email: customerEmail,
      whatsapp_number: customerWhatsApp,
      contact: customerWhatsApp,
      destination: "To be confirmed",
      subtotal: Number(cartSubtotal.toFixed(2)),
      shipping_total: Number(cartShipping.toFixed(2)),
      grand_total: Number(
        (cartSubtotal + cartShipping).toFixed(2),
      ),
      status: "new",
    };

    setMessage("Saving your order...");

    const { data: savedOrder, error: orderError } =
      await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

    if (orderError) {
      setMessage(
        `Order could not be saved: ${orderError.message}`,
      );
      return;
    }

    const orderItems = cart.map((item) => {
      const unitPrice = Number(item.price || 0);
      const estimatedShipping = Number(
        item.estimated_shipping || 0,
      );
      const quantity = Number(item.quantity || 1);

      return {
        order_id: savedOrder.id,
        product_id: String(item.id),
        product_name: item.name,
        quantity,
        unit_price: Number(unitPrice.toFixed(2)),
        estimated_shipping: Number(
          estimatedShipping.toFixed(2),
        ),
        line_total: Number(
          (unitPrice * quantity).toFixed(2),
        ),
      };
    });

    const { error: itemError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemError) {
      await supabase
        .from("orders")
        .delete()
        .eq("id", savedOrder.id);

      setMessage(
        `Order items could not be saved: ${itemError.message}`,
      );
      return;
    }

    const orderLines = cart
      .map((item) => {
        const itemTotal =
          Number(item.price || 0) * item.quantity;

        const itemShipping =
          Number(item.estimated_shipping || 0) *
          item.quantity;

        return [
          `Product: ${item.name}`,
          `Quantity: ${item.quantity}`,
          `Item total: ${formatMoney(itemTotal, "KES")}`,
          `Estimated shipping: ${formatMoney(
            itemShipping,
            "KES",
          )}`,
        ].join("\n");
      })
      .join("\n\n");

    const message = [
      "Hello, I would like to place a preorder.",
      "",
      "ORDER NUMBER",
      orderNumber,
      "",
      "CUSTOMER DETAILS",
      `Name: ${customerName}`,
      `WhatsApp number: ${customerWhatsApp}`,
      `Email: ${customerEmail}`,
      "",
      "ORDER ITEMS",
      orderLines,
      "",
      `Subtotal: ${formatMoney(cartSubtotal, "KES")}`,
      `Estimated shipping: ${formatMoney(
        cartShipping,
        "KES",
      )}`,
      `Estimated total: ${formatMoney(
        cartSubtotal + cartShipping,
        "KES",
      )}`,
      "",
      "Please confirm availability and the next payment steps.",
    ].join("\n");

    const whatsappUrl =
      `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}` +
      `?text=${encodeURIComponent(message )}`;

    setMessage(
      `Order ${orderNumber} saved successfully.`,
    );

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadMedia(event) {
    event.preventDefault();

    if (!supabase || profile?.role !== "admin") {
      setMessage("Only administrators can upload media.");
      return;
    }

    if (!selectedProductId) {
      setMessage("Select a product first.");
      return;
    }

    if (files.length === 0) {
      setMessage("Choose at least one file.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const bucket =
        mediaType === "image"
          ? "product-images"
          : "product-videos";

      const records = [];

      for (const file of files) {
        const safeName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "-");

        const storagePath =
          `${selectedProductId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath);

        records.push({
          product_id: selectedProductId,
          media_type: mediaType,
          storage_path: storagePath,
          public_url: publicUrlData.publicUrl,
          alt_text: file.name,
          sort_order: media.length + records.length,
          is_primary:
            media.length === 0 && records.length === 0,
        });
      }

      const { data: savedMedia, error: saveError } =
        await supabase
          .from("product_media")
          .insert(records)
          .select();

      if (saveError) {
        throw saveError;
      }

      setMedia((currentMedia) => [
        ...currentMedia,
        ...(savedMedia || []),
      ]);

      setFiles([]);
      setMessage("Media uploaded successfully.");
    } catch (error) {
      const details = [
        error?.message || "Media upload failed.",
        error?.status ? `Status: ${error.status}` : "",
        error?.code ? `Code: ${error.code}` : "",
        error?.details ? `Details: ${error.details}` : "",
        error?.hint ? `Hint: ${error.hint}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      setMessage(details);
      console.error("Media upload error:", error);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="center-page">
        <h1>IMPORT PRE_ORDERS</h1>
        <p>Loading your marketplace...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="eyebrow">GLOBAL PREORDER MARKETPLACE</p>

          <h1>
            {authMode === "signin"
              ? "Welcome back"
              : "Create an account"}
          </h1>

          <p className="muted">
            {authMode === "signin"
              ? "Sign in to browse and order preorders."
              : "Create an account using your phone number."}
          </p>

          <form onSubmit={handleAuth}>
            {authMode === "signup" ? (
              <>
                <label>
                  WhatsApp number
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="+254 700 000 000"
                    required
                  />
                </label>

                <label>
                  One name
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Your name"
                    required
                  />
                </label>

                <label>
                  Email address
                  <span className="required-label">
                    Required for sign in
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </>
            ) : (
              <label>
                Phone number or email
                <input
                  type="text"
                  value={phone || email}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (value.includes("@")) {
                      setEmail(value);
                      setPhone("");
                    } else {
                      setPhone(value);
                      setEmail("");
                    }
                  }}
                  placeholder="+254 700 000 000 or email"
                  required
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                minLength="6"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </label>

            {authMode === "signup" && (
              <label>
                Confirm password
                <input
                  type="password"
                  minLength="6"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  required
                />
              </label>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {message && <p className="notice">{message}</p>}

          <button
            className="link-button"
            type="button"
            onClick={() => {
              setAuthMode(
                authMode === "signin"
                  ? "signup"
                  : "signin",
              );
              setMessage("");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            {authMode === "signin"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </section>
      </main>
    );
  }

  const isAdmin = profile?.role === "admin";

  const cartSubtotal = cart.reduce(
    (total, item) =>
      total + Number(item.price || 0) * item.quantity,
    0,
  );

  const cartShipping = cart.reduce(
    (total, item) =>
      total +
      Number(item.estimated_shipping || 0) * item.quantity,
    0,
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <SiteBranding />

        <div className="topbar-actions">
          {isAdmin && (
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                setView(
                  view === "catalog"
                    ? "admin"
                    : "catalog",
                )
              }
            >
              {view === "catalog"
                ? "Admin dashboard"
                : "View catalog"}
            </button>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      {message && <div className="notice">{message}</div>}

      {view === "admin" && isAdmin ? (
        <>
          <AddProductForm
            userId={user.id}
            onCreated={handleProductCreated}
            onMessage={setMessage}
          />

          <ProductManager
            products={products}
            onUpdated={handleProductUpdated}
            onDeleted={handleProductDeleted}
            onMessage={setMessage}
          />

          <CurrencyConverter />

          <section className="upload-panel">
            <div>
              <p className="eyebrow">ADMIN MEDIA DESK</p>
              <h2>Upload product media</h2>
              <p className="muted">
                Upload one or more images or a product video.
              </p>
            </div>

            <form className="upload-form" onSubmit={uploadMedia}>
              <label>
                Product
                <select
                  value={selectedProductId}
                  onChange={(event) =>
                    setSelectedProductId(event.target.value)
                  }
                >
                  {products.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Media type
                <select
                  value={mediaType}
                  onChange={(event) => {
                    setMediaType(event.target.value);
                    setFiles([]);
                  }}
                >
                  <option value="image">Images</option>
                  <option value="video">Video</option>
                </select>
              </label>

              <label>
                Choose media
                <input
                  type="file"
                  accept={
                    mediaType === "image"
                      ? "image/*"
                      : "video/*"
                  }
                  multiple={mediaType === "image"}
                  onChange={(event) =>
                    setFiles(
                      Array.from(event.target.files || []),
                    )
                  }
                />
              </label>

              <button
                className="primary-button"
                type="submit"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload media"}
              </button>

              {files.length > 0 && (
                <small className="file-count">
                  {files.length} file(s) selected
                </small>
              )}
            </form>
          </section>

          <div
            className="orders-report-control"
            data-orders-report-control="true"
          >
            <button
              className="orders-report-button"
              type="button"
              onClick={() =>
                setShowOrdersReport(
                  (current) => !current,
                )
              }
            >
              {showOrdersReport
                ? "Hide orders report"
                : "Orders report"}
            </button>
          </div>

          {showOrdersReport && <OrdersReport />}

          <BrandingSettings />
          <MediaGallery
            media={media}
            selectedProductId={selectedProductId}
          />
        </>
      ) : (
        <>
          <div className="customer-currency-converter">
            <CurrencyConverter />
          </div>

          <section className="hero-panel">
            <p className="eyebrow">CURATED FROM CHINA & BEYOND</p>

            <h2>Find your next must-have.</h2>

            <p>
              Browse updated products, check estimated shipping,
              and build your cart before ordering.
            </p>
          </section>

          <section className="storefront-layout">
            <div className="product-grid">
              {products.length === 0 ? (
                <div className="empty-state">
                  No products have been added yet.
                </div>
              ) : (
                products.map((product) => {
                  const productMedia = media.filter(
                    (item) =>
                      item.product_id === product.id,
                  );

                  const primaryImage =
                    productMedia.find(
                      (item) =>
                        item.media_type === "image" &&
                        item.is_primary,
                    ) ||
                    productMedia.find(
                      (item) =>
                        item.media_type === "image",
                    );

                  return (
                    <article
                      className="product-card"
                      key={product.id}
                    >
                      <div className="product-visual">
                        {primaryImage?.public_url ? (
                          <WatermarkedProductImage
                            src={primaryImage.public_url}
                            alt={product.name}
                          />
                        ) : (
                          <b>{product.name.slice(0, 1)}</b>
                        )}

                        <span>{product.stock_status}</span>
                      </div>

                      <div className="product-content">
                        <small className="product-category">
                          {product.category}
                          {product.subcategory
                            ? ` / ${product.subcategory}`
                            : ""}
                        </small>

                        <h3>{product.name}</h3>

                        <p>{product.description}</p>

                        <strong>
                          {formatMoney(
                            product.price,
                            product.currency,
                          )}
                        </strong>

                        <small className="shipping-line">
                          Estimated shipping:{" "}
                          {formatMoney(
                            product.estimated_shipping,
                            product.currency,
                          )}
                        </small>

                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => addToCart(product)}
                        >
                          Add to cart
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <aside className="cart-panel">
              <p className="eyebrow">ORDER BUILDER</p>
              <h3>Your cart</h3>

              {cart.length === 0 ? (
                <p className="muted">
                  Add a product to calculate shipping.
                </p>
              ) : (
                <div className="cart-list">
                  {cart.map((item) => (
                    <div className="cart-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {formatMoney(item.price, "KES")} each
                        </small>
                      </div>

                      <div className="quantity-controls">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, -1)
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="summary">
                <div>
                  <span>Subtotal</span>
                  <strong>
                    {formatMoney(cartSubtotal, "KES")}
                  </strong>
                </div>

                <div>
                  <span>Estimated shipping</span>
                  <strong>
                    {formatMoney(cartShipping, "KES")}
                  </strong>
                </div>

                <div className="total">
                  <span>Estimated total</span>
                  <strong>
                    {formatMoney(
                      cartSubtotal + cartShipping,
                    )}
                  </strong>
                </div>
              </div>

              <button
                className="whatsapp-button"
                type="button"
                disabled={cart.length === 0}
                onClick={checkoutOnWhatsApp}
              >
                Continue on WhatsApp
              </button>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}







































