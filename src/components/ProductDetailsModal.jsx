import { useEffect, useState } from "react";
import WatermarkedProductImage from "./WatermarkedProductImage.jsx";
import { formatMoney } from "../lib/currency.js";

export default function ProductDetailsModal({
  product,
  media = [],
  onClose,
  onAddToCart,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  if (!product) {
    return null;
  }

  const orderedMedia = [...media].sort(
    (first, second) =>
      (first.sort_order || 0) -
      (second.sort_order || 0),
  );

  const activeMedia = orderedMedia[activeIndex];

  function showPreviousMedia() {
    setActiveIndex((current) =>
      current === 0
        ? Math.max(orderedMedia.length - 1, 0)
        : current - 1,
    );
  }

  function showNextMedia() {
    setActiveIndex((current) =>
      orderedMedia.length === 0
        ? 0
        : (current + 1) % orderedMedia.length,
    );
  }

  return (
    <div
      className="product-details-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} details`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="product-details-modal">
        <button
          className="product-details-close"
          type="button"
          onClick={onClose}
          aria-label="Close product details"
        >
          ×
        </button>

        <div className="product-details-media">
          {activeMedia?.media_type === "video" ? (
            <video
              className="product-details-main-media"
              src={activeMedia.public_url}
              controls
              playsInline
              preload="metadata"
            />
          ) : activeMedia?.public_url ? (
            <WatermarkedProductImage
              src={activeMedia.public_url}
              alt={activeMedia.alt_text || product.name}
              className="product-details-main-media"
            />
          ) : (
            <div className="product-details-placeholder">
              {product.name.slice(0, 1)}
            </div>
          )}

          {orderedMedia.length > 1 && (
            <div className="product-details-media-controls">
              <button
                className="secondary-button"
                type="button"
                onClick={showPreviousMedia}
              >
                Previous
              </button>

              <span>
                {activeIndex + 1} / {orderedMedia.length}
              </span>

              <button
                className="secondary-button"
                type="button"
                onClick={showNextMedia}
              >
                Next
              </button>
            </div>
          )}

          {orderedMedia.length > 1 && (
            <div className="product-details-thumbnails">
              {orderedMedia.map((item, index) => (
                <button
                  className={
                    index === activeIndex
                      ? "product-thumbnail selected"
                      : "product-thumbnail"
                  }
                  type="button"
                  key={item.id || item.public_url}
                  onClick={() => setActiveIndex(index)}
                >
                  {item.media_type === "video" ? (
                    <span>Video</span>
                  ) : (
                    <img
                      src={item.public_url}
                      alt={item.alt_text || product.name}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-details-copy">
          <p className="eyebrow">
            {product.category}
            {product.subcategory
              ? ` / ${product.subcategory}`
              : ""}
          </p>

          <h2>{product.name}</h2>

          <p className="product-details-description">
            {product.description ||
              "Product details will be provided before ordering."}
          </p>

          <div className="product-details-pricing">
            <strong>{formatMoney(product.price)}</strong>
            <span>
              Estimated shipping:{" "}
              {formatMoney(product.shipping_cost)}
            </span>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
          >
            Add to cart
          </button>
        </div>
      </section>
    </div>
  );
}
