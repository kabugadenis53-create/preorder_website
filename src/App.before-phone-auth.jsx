import { useEffect, useState } from "react";
import { supabase, supabaseConfig } from "./lib/supabase";

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

const categories = {
  Home: ["Households", "Garden"],
  Fashion: ["Adultwear", "Kidswear"],
  Shoes: ["Kids Shoes", "Ladies Shoes", "Men Shoes"],
  Jewelry: [],
  Gadgets: [],
  Bags: [],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [media, setMedia] = useState([]);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState("catalog");

  const [authMode, setAuthMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      if (!supabaseConfig.isConfigured || !supabase) {
        setMessage(
          "Supabase is not configured. Check your .env.local file.",
        );
        setLoading(false);
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
          const { data: currentProfile, error: profileError } =
            await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (mounted) {
            setProfile(currentProfile);
          }
        }

        const { data: productData, error: productError } =
          await supabase
            .from("products")
            .select("*")
            .eq("active", true)
            .order("created_at", { ascending: false });

        if (productError) {
          throw productError;
        }

        const { data: mediaData, error: mediaError } =
          await supabase
            .from("product_media")
            .select("*")
            .order("sort_order", { ascending: true });

        if (mediaError) {
          throw mediaError;
        }

        if (mounted) {
          setProducts(productData || []);
          setMedia(mediaData || []);

          if (productData && productData.length > 0) {
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

    loadPage();

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

    setAuthLoading(true);
    setMessage("");

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          throw error;
        }

        setMessage(
          "Account created. Check your email if confirmation is enabled.",
        );
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          throw error;
        }

        setUser(data.user);
        setMessage("Signed in successfully.");
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

  function addToCart(product) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === product.id,
      );

      if (existing) {
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

  function updateQuantity(productId, change) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
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
      setMessage(
        error instanceof Error
          ? error.message
          : "Media upload failed.",
      );
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
            Sign in to browse and order imported preorders.
          </p>

          <form onSubmit={handleAuth}>
            {authMode === "signup" && (
              <label>
                Full name
                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </label>

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
        <div>
          <p className="eyebrow">GLOBAL PREORDER MARKETPLACE</p>
          <h1>IMPORT PRE_ORDERS</h1>
        </div>

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
        <section className="upload-panel">
          <div>
            <p className="eyebrow">ADMIN MEDIA DESK</p>
            <h2>Add product media</h2>
            <p className="muted">
              Upload multiple product images or a product video.
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
      ) : (
        <>
          <section className="hero-panel">
            <p className="eyebrow">CURATED FROM CHINA & BEYOND</p>

            <h2>Find your next must-have.</h2>

            <p>
              Browse the updated preorder list, compare prices,
              and see estimated shipping before ordering.
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

                  const image = productMedia.find(
                    (item) =>
                      item.media_type === "image" &&
                      item.is_primary,
                  ) || productMedia.find(
                    (item) =>
                      item.media_type === "image",
                  );

                  return (
                    <article
                      className="product-card"
                      key={product.id}
                    >
                      <div className="product-visual">
                        {image?.public_url ? (
                          <img
                            src={image.public_url}
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
                          {formatMoney(item.price)} each
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
                    {formatMoney(cartSubtotal)}
                  </strong>
                </div>

                <div>
                  <span>Estimated shipping</span>
                  <strong>
                    {formatMoney(cartShipping)}
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
