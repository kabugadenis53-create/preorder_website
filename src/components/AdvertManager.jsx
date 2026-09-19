import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const DEFAULT_FONT = "Inter, Arial, sans-serif";

function normaliseAdvert(advert) {
  return {
    ...advert,
    title: advert.title || "",
    caption: advert.caption || "",
    message_font_family:
      advert.message_font_family || DEFAULT_FONT,
    message_font_size:
      Number(advert.message_font_size) || 18,
    video_width_percent:
      Number(advert.video_width_percent) || 100,
    replacementFile: null,
    replacementPreviewUrl: "",
  };
}

function safeFileName(file) {
  return file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-");
}

export default function AdvertManager() {
  const [adverts, setAdverts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [messageFontFamily, setMessageFontFamily] =
    useState(DEFAULT_FONT);
  const [messageFontSize, setMessageFontSize] = useState(18);
  const [videoWidthPercent, setVideoWidthPercent] = useState(100);
  const [editingId, setEditingId] = useState(null);

  async function loadAdverts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("adverts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setAdverts((data || []).map(normaliseAdvert));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAdverts();
  }, []);

  useEffect(() => {
    if (!videoFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(videoFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [videoFile]);

  function updateAdvertDraft(id, changes) {
    setAdverts((current) =>
      current.map((advert) =>
        advert.id === id
          ? { ...advert, ...changes }
          : advert,
      ),
    );
  }

  function chooseReplacementVideo(id, file) {
    const advert = adverts.find((item) => item.id === id);

    if (advert?.replacementPreviewUrl) {
      URL.revokeObjectURL(advert.replacementPreviewUrl);
    }

    updateAdvertDraft(id, {
      replacementFile: file || null,
      replacementPreviewUrl: file
        ? URL.createObjectURL(file)
        : "",
    });
  }

  async function createAdvert(event) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Enter an advert title.");
      return;
    }

    if (!videoFile) {
      setMessage("Choose an advert video.");
      return;
    }

    setSaving(true);
    setMessage("");

    const storagePath =
      `adverts/${Date.now()}-${safeFileName(videoFile)}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("advert-videos")
        .upload(storagePath, videoFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: videoFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("advert-videos")
        .getPublicUrl(storagePath);

      const { data: createdAdvert, error: insertError } =
        await supabase
          .from("adverts")
          .insert({
            title: title.trim(),
            caption: caption.trim() || null,
            video_url: publicUrlData.publicUrl,
            video_storage_path: storagePath,
            message_font_family: messageFontFamily,
            message_font_size: Number(messageFontSize),
            video_width_percent: Number(videoWidthPercent),
            is_active: false,
          })
          .select()
          .single();

      if (insertError) {
        await supabase.storage
          .from("advert-videos")
          .remove([storagePath]);

        throw insertError;
      }

      setAdverts((current) => [
        normaliseAdvert(createdAdvert),
        ...current,
      ]);

      setTitle("");
      setCaption("");
      setVideoFile(null);
      setPreviewUrl("");
      setMessage("Advert created. Click Make active when ready.");
      event.target.reset();
    } catch (error) {
      setMessage(error?.message || "Advert upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAdvertChanges(advert) {
    setSaving(true);
    setMessage("");

    let newStoragePath = null;

    try {
      let videoUrl = advert.video_url;
      let storagePath = advert.video_storage_path;

      if (advert.replacementFile) {
        newStoragePath =
          `adverts/${Date.now()}-${safeFileName(
            advert.replacementFile,
          )}`;

        const { error: uploadError } = await supabase.storage
          .from("advert-videos")
          .upload(newStoragePath, advert.replacementFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: advert.replacementFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("advert-videos")
          .getPublicUrl(newStoragePath);

        videoUrl = publicUrlData.publicUrl;
        storagePath = newStoragePath;
      }

      const { data: updatedAdvert, error: updateError } =
        await supabase
          .from("adverts")
          .update({
            title: advert.title.trim(),
            caption: advert.caption.trim() || null,
            video_url: videoUrl,
            video_storage_path: storagePath,
            message_font_family:
              advert.message_font_family,
            message_font_size:
              Number(advert.message_font_size),
            video_width_percent:
              Number(advert.video_width_percent),
            updated_at: new Date().toISOString(),
          })
          .eq("id", advert.id)
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      if (
        newStoragePath &&
        advert.video_storage_path &&
        advert.video_storage_path !== newStoragePath
      ) {
        await supabase.storage
          .from("advert-videos")
          .remove([advert.video_storage_path]);
      }

      updateAdvertDraft(advert.id, {
        ...normaliseAdvert(updatedAdvert),
        replacementFile: null,
        replacementPreviewUrl: "",
      });

      setEditingId(null);
      setMessage("Advert changes saved.");
    } catch (error) {
      if (newStoragePath) {
        await supabase.storage
          .from("advert-videos")
          .remove([newStoragePath]);
      }

      setMessage(
        error?.message ||
          "Advert changes could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeActive(advertId) {
    setMessage("");

    const { error: deactivateError } = await supabase
      .from("adverts")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      setMessage(deactivateError.message);
      return;
    }

    const { error: activateError } = await supabase
      .from("adverts")
      .update({ is_active: true })
      .eq("id", advertId);

    if (activateError) {
      setMessage(activateError.message);
      return;
    }

    setAdverts((current) =>
      current.map((advert) => ({
        ...advert,
        is_active: advert.id === advertId,
      })),
    );

    setMessage("Advert is now active.");
  }

  async function deactivate(advertId) {
    const { error } = await supabase
      .from("adverts")
      .update({ is_active: false })
      .eq("id", advertId);

    if (error) {
      setMessage(error.message);
      return;
    }

    updateAdvertDraft(advertId, { is_active: false });
    setMessage("Advert deactivated.");
  }

  async function deleteAdvert(advert) {
    const confirmed = window.confirm(
      `Delete advert "${advert.title}" and its video?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      if (advert.video_storage_path) {
        const { error: storageError } =
          await supabase.storage
            .from("advert-videos")
            .remove([advert.video_storage_path]);

        if (storageError) {
          throw storageError;
        }
      }

      const { error: deleteError } = await supabase
        .from("adverts")
        .delete()
        .eq("id", advert.id);

      if (deleteError) {
        throw deleteError;
      }

      setAdverts((current) =>
        current.filter((item) => item.id !== advert.id),
      );

      setMessage("Advert and storage video deleted.");
    } catch (error) {
      setMessage(
        error?.message ||
          "Advert could not be deleted.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="advert-manager-panel">
      <div className="advert-manager-heading">
        <p className="eyebrow">ADVERTISING</p>
        <h2>Video adverts</h2>
        <p className="muted">
          Create adverts and edit each field independently.
        </p>
      </div>

      <form
        className="advert-upload-form"
        onSubmit={createAdvert}
      >
        <h3>Create a new advert</h3>

        <label>
          Advert title
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            required
          />
        </label>

        <label>
          Caption
          <textarea
            rows="3"
            value={caption}
            onChange={(event) =>
              setCaption(event.target.value)
            }
          />
        </label>

        <div className="advert-customization-fields">
          <label>
            Message font
            <select
              value={messageFontFamily}
              onChange={(event) =>
                setMessageFontFamily(event.target.value)
              }
            >
              <option value="Inter, Arial, sans-serif">
                Inter
              </option>
              <option value="Arial, sans-serif">
                Arial
              </option>
              <option value="Georgia, serif">
                Georgia
              </option>
              <option value="Verdana, sans-serif">
                Verdana
              </option>
              <option value="Trebuchet MS, sans-serif">
                Trebuchet MS
              </option>
            </select>
          </label>

          <label>
            Message font size: {messageFontSize}px
            <input
              type="range"
              min="12"
              max="48"
              value={messageFontSize}
              onChange={(event) =>
                setMessageFontSize(
                  Number(event.target.value),
                )
              }
            />
          </label>

          <label>
            Video width: {videoWidthPercent}%
            <input
              type="range"
              min="40"
              max="100"
              value={videoWidthPercent}
              onChange={(event) =>
                setVideoWidthPercent(
                  Number(event.target.value),
                )
              }
            />
          </label>
        </div>

        <label>
          Video file
          <input
            type="file"
            accept="video/*"
            onChange={(event) =>
              setVideoFile(
                event.target.files?.[0] || null,
              )
            }
            required
          />
        </label>

        {previewUrl && (
          <video
            className="advert-preview-video"
            src={previewUrl}
            controls
            muted
            playsInline
          />
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Create advert"}
        </button>
      </form>

      {message && (
        <p className="advert-manager-message">
          {message}
        </p>
      )}

      <div className="advert-list">
        {loading ? (
          <p className="muted">Loading adverts...</p>
        ) : adverts.length === 0 ? (
          <p className="muted">
            No adverts uploaded yet.
          </p>
        ) : (
          adverts.map((advert) => (
            <article
              className="advert-card"
              key={advert.id}
            >
              <video
                className="advert-card-video"
                src={
                  advert.replacementPreviewUrl ||
                  advert.video_url
                }
                controls
                preload="metadata"
              />

              <div className="advert-card-content">
                {editingId === advert.id ? (
                  <>
                    <label>
                      Title
                      <input
                        value={advert.title}
                        onChange={(event) =>
                          updateAdvertDraft(advert.id, {
                            title: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Caption
                      <textarea
                        rows="3"
                        value={advert.caption}
                        onChange={(event) =>
                          updateAdvertDraft(advert.id, {
                            caption: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Message font
                      <select
                        value={advert.message_font_family}
                        onChange={(event) =>
                          updateAdvertDraft(advert.id, {
                            message_font_family:
                              event.target.value,
                          })
                        }
                      >
                        <option value="Inter, Arial, sans-serif">
                          Inter
                        </option>
                        <option value="Arial, sans-serif">
                          Arial
                        </option>
                        <option value="Georgia, serif">
                          Georgia
                        </option>
                        <option value="Verdana, sans-serif">
                          Verdana
                        </option>
                        <option value="Trebuchet MS, sans-serif">
                          Trebuchet MS
                        </option>
                      </select>
                    </label>

                    <label>
                      Message font size:{" "}
                      {advert.message_font_size}px
                      <input
                        type="range"
                        min="12"
                        max="48"
                        value={advert.message_font_size}
                        onChange={(event) =>
                          updateAdvertDraft(advert.id, {
                            message_font_size: Number(
                              event.target.value,
                            ),
                          })
                        }
                      />
                    </label>

                    <label>
                      Video width:{" "}
                      {advert.video_width_percent}%
                      <input
                        type="range"
                        min="40"
                        max="100"
                        value={advert.video_width_percent}
                        onChange={(event) =>
                          updateAdvertDraft(advert.id, {
                            video_width_percent: Number(
                              event.target.value,
                            ),
                          })
                        }
                      />
                    </label>

                    <label>
                      Optional replacement video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) =>
                          chooseReplacementVideo(
                            advert.id,
                            event.target.files?.[0],
                          )
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <h3>{advert.title}</h3>
                    {advert.caption && (
                      <p>{advert.caption}</p>
                    )}
                  </>
                )}

                <span
                  className={
                    advert.is_active
                      ? "advert-status active"
                      : "advert-status"
                  }
                >
                  {advert.is_active
                    ? "Active advert"
                    : "Inactive advert"}
                </span>

                <div className="advert-card-actions">
                  {editingId === advert.id ? (
                    <>
                      <button
                        className="primary-button"
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          saveAdvertChanges(advert)
                        }
                      >
                        Save advert changes
                      </button>

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          loadAdverts();
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        setEditingId(advert.id)
                      }
                    >
                      Edit advert
                    </button>
                  )}

                  {!advert.is_active && (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() =>
                        makeActive(advert.id)
                      }
                    >
                      Make active
                    </button>
                  )}

                  {advert.is_active && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        deactivate(advert.id)
                      }
                    >
                      Deactivate
                    </button>
                  )}

                  <button
                    className="danger-button"
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      deleteAdvert(advert)
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

