import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const DEFAULT_TITLE = "CURATED FROM CHINA & BEYOND";

const DEFAULT_CAPTION =
  "Find your next must-have. Browse updated products, check estimated shipping, and build your cart before ordering.";

export default function HeroAdvert() {
  const [advert, setAdvert] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveAdvert() {
      const { data, error } = await supabase
        .from("adverts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error && data) {
        setAdvert(data);
      }
    }

    loadActiveAdvert();

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setShowVideo(true);
      }
    }, 10000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const title = advert?.title?.trim() || DEFAULT_TITLE;
  const caption = advert?.caption?.trim() || DEFAULT_CAPTION;

  const fontFamily =
    advert?.message_font_family ||
    "Inter, Arial, sans-serif";

  const fontSize = Number(advert?.message_font_size) || 18;

  const videoWidth = Math.min(
    100,
    Math.max(
      40,
      Number(advert?.video_width_percent) || 100,
    ),
  );

  return (
    <section className="hero-panel hero-advert-panel">
      {showVideo && advert?.video_url && (
        <div
          className="hero-advert-video-wrap"
          style={{
            width: `${videoWidth}%`,
          }}
        >
          <video
            className="hero-advert-video"
            src={advert.video_url}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="auto"
          />
        </div>
      )}

      <div
        className="hero-advert-details"
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
        }}
      >
        <p className="eyebrow">{title}</p>

        <p className="hero-advert-caption">
          {caption}
        </p>
      </div>
    </section>
  );
}
