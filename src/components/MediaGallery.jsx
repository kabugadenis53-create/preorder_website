export default function MediaGallery({ media, selectedProductId }) {
  const items = media.filter(
    (item) => item.product_id === selectedProductId,
  );

  return (
    <section className="admin-media-section">
      <div className="admin-media-heading">
        <div>
          <p className="eyebrow">UPLOADED MEDIA</p>
          <h2>Preview before publishing</h2>
        </div>

        <span>{items.length} file(s)</span>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          No image or video has been uploaded for this product yet.
        </div>
      ) : (
        <div className="admin-media-grid">
          {items.map((item) => (
            <article className="admin-media-card" key={item.id}>
              <div className="admin-media-preview">
                {item.media_type === "video" ? (
                  <video
                    src={item.public_url}
                    controls
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.public_url}
                    alt={item.alt_text || "Uploaded product media"}
                  />
                )}
              </div>

              <div className="admin-media-meta">
                <strong>
                  {item.media_type === "video" ? "Video" : "Image"}
                </strong>

                <span>{item.alt_text || "Uploaded media"}</span>

                {item.is_primary && <em>Primary media</em>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
