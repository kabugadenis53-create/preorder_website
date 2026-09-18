import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function WatermarkedProductImage({
  src,
  alt,
  className = "",
}) {
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLogo() {
      if (!supabase) {
        return;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", 1)
        .single();

      if (!error && active) {
        setLogoUrl(data?.logo_url || "");
      }
    }

    loadLogo();

    return () => {
      active = false;
    };
  }, []);

  if (!src) {
    return (
      <div className={`watermarked-image-empty ${className}`}>
        No product image
      </div>
    );
  }

  return (
    <div className={`watermarked-image ${className}`}>
      <img
        className="watermarked-product-photo"
        src={src}
        alt={alt}
      />

      {logoUrl && (
        <img
          className="product-logo-watermark"
          src={logoUrl}
          alt=""
          aria-hidden="true"
        />
      )}
    </div>
  );
}
