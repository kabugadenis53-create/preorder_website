import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function SiteBranding() {
  const [branding, setBranding] = useState({
    siteName: "IMPORT PRE_ORDERS",
    logoUrl: "",
  });

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      if (!supabase) {
        return;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("site_name, logo_url")
        .eq("id", 1)
        .single();

      if (error || !active) {
        return;
      }

      setBranding({
        siteName: data?.site_name || "IMPORT PRE_ORDERS",
        logoUrl: data?.logo_url || "",
      });
    }

    loadBranding();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="site-branding">
      {branding.logoUrl ? (
        <img
          className="site-branding-logo"
          src={branding.logoUrl}
          alt={`${branding.siteName} logo`}
        />
      ) : (
        <div className="site-branding-mark" aria-hidden="true">
          IP
        </div>
      )}

      <span className="site-branding-name">
        {branding.siteName}
      </span>
    </div>
  );
}
