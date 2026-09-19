import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const DEFAULT_TITLE = "CURATED FROM CHINA & BEYOND";

const DEFAULT_CAPTION =
  "Find your next must-have. Browse updated products, check estimated shipping, and build your cart before ordering.";

const EFFECTS = {
  fade: {
    entry: "advert-fade-in",
    exit: "advert-fade-out",
  },
  "slide-up": {
    entry: "advert-slide-up-in",
    exit: "advert-slide-up-out",
  },
  "slide-down": {
    entry: "advert-slide-down-in",
    exit: "advert-slide-down-out",
  },
  "slide-left": {
    entry: "advert-slide-left-in",
    exit: "advert-slide-left-out",
  },
  "slide-right": {
    entry: "advert-slide-right-in",
    exit: "advert-slide-right-out",
  },
  "zoom-in": {
    entry: "advert-zoom-in",
    exit: "advert-zoom-in-out",
  },
  "zoom-out": {
    entry: "advert-zoom-out",
    exit: "advert-zoom-out-out",
  },
};

export default function HeroAdvert() {
  const [advert, setAdvert] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isMessageExiting, setIsMessageExiting] =
    useState(false);

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

    const fadeOutTimer = window.setTimeout(() => {
      if (!cancelled) {
        setIsMessageExiting(true);
      }
    }, 9000);

    const videoTimer = window.setTimeout(() => {
      if (!cancelled) {
        setShowVideo(true);
      }
    }, 10000);

    return () => {
      cancelled = true;
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(videoTimer);
    };
  }, []);

  const title = advert?.title?.trim() || DEFAULT_TITLE;

  const caption =
    advert?.caption?.trim() || DEFAULT_CAPTION;

  const fontFamily =
    advert?.message_font_family ||
    "Inter, Arial, sans-serif";

  const fontSize = Math.min(
    100,
    Math.max(
      12,
      Number(advert?.message_font_size) || 18,
    ),
  );

  const duration = Math.min(
    3000,
    Math.max(
      200,
      Number(advert?.effect_duration_ms) || 800,
    ),
  );

  const effectName = EFFECTS[
    advert?.entry_effect
  ]
    ? advert.entry_effect
    : "fade";

  const effect = EFFECTS[effectName];

  const messageAnimation = isMessageExiting
    ? effect.exit
    : effect.entry;

  const messageStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    animationName: showVideo ? "none" : messageAnimation,
    animationDuration: showVideo ? "0ms" : `${duration}ms`,
    animationTimingFunction:
      "cubic-bezier(0.23, 1, 0.32, 1)",
    animationFillMode: "both",
  };

  const messageContent = (
    <div
      className="hero-message-content"
      style={messageStyle}
    >
      <p className="eyebrow hero-advert-title">
        {title}
      </p>

      <p className="hero-advert-caption">
        {caption}
      </p>
    </div>
  );

  if (!showVideo || !advert?.video_url) {
    return (
      <section className="hero-panel hero-advert-panel">
        <div className="hero-message-full-width">
          {messageContent}
        </div>
      </section>
    );
  }

  return (
    <section className="hero-panel hero-advert-panel">
      <div className="hero-advert-split">
        <div className="hero-advert-text-half">
          {messageContent}
        </div>

        <div className="hero-advert-video-half">
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
      </div>
    </section>
  );
}

