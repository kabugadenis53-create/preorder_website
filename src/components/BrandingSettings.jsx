import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function BrandingSettings() {
  const [siteName, setSiteName] = useState("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadBranding() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("site_name, logo_url")
        .eq("id", 1)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setSiteName(data?.site_name || "IMPORT PRE_ORDERS");
      setCurrentLogoUrl(data?.logo_url || "");
      setLoading(false);
    }

    loadBranding();
  }, []);

  async function saveBranding(event) {
    event.preventDefault();

    const trimmedName = siteName.trim();

    if (!trimmedName) {
      setMessage("Website name is required.");
      return;
    }

    if (logoFile && !logoFile.type.startsWith("image/")) {
      setMessage("Please choose an image file for the logo.");
      return;
    }

    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      setMessage("Logo file must be 5 MB or smaller.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let logoUrl = currentLogoUrl;

      if (logoFile) {
        const fileExtension =
          logoFile.name.split(".").pop()?.toLowerCase() || "png";

        const storagePath =
          `logo-${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("site-branding")
          .upload(storagePath, logoFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: logoFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("site-branding")
          .getPublicUrl(storagePath);

        logoUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("site_settings")
        .update({
          site_name: trimmedName,
          logo_url: logoUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (updateError) {
        throw updateError;
      }

      setCurrentLogoUrl(logoUrl);
      setLogoFile(null);
      event.target.reset();
      setMessage("Branding saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Branding could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="branding-settings-panel">
        <p>Loading branding settings...</p>
      </section>
    );
  }

  return (
    <section className="branding-settings-panel">
      <div className="branding-settings-heading">
        <div>
          <p className="eyebrow">BRAND SETTINGS</p>
          <h2>Website name and logo</h2>
          <p className="muted">
            Update the name and logo shown across the storefront.
          </p>
        </div>
      </div>

      <form className="branding-settings-form" onSubmit={saveBranding}>
        <label>
          Website name
          <input
            type="text"
            value={siteName}
            onChange={(event) =>
              setSiteName(event.target.value)
            }
            placeholder="IMPORT PRE_ORDERS"
            maxLength="80"
            required
          />
        </label>

        <label>
          Logo image
          <span className="field-help">
            PNG, JPG, WEBP, or SVG up to 5 MB.
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) =>
              setLogoFile(event.target.files?.[0] || null)
            }
          />
        </label>

        {currentLogoUrl && (
          <div className="branding-logo-preview">
            <span>Current logo</span>
            <img
              src={currentLogoUrl}
              alt="Current website logo"
            />
          </div>
        )}

        {message && (
          <p className="branding-settings-message">
            {message}
          </p>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving branding..." : "Save branding"}
        </button>
      </form>
    </section>
  );
}
