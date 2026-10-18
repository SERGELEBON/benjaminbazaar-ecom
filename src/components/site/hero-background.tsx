"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_DEFAULTS, type HeroSettings } from "@/lib/hero";

let cache: HeroSettings | null = null;

/** Hero settings from the super admin (defaults first, so nothing flashes or breaks). */
export function useHeroSettings() {
  const [hero, setHero] = useState<HeroSettings>(cache ?? HERO_DEFAULTS);
  useEffect(() => {
    let alive = true;
    fetch("/api/site/hero")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hero?: HeroSettings } | null) => {
        if (alive && d?.hero) {
          cache = d.hero;
          setHero(d.hero);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return hero;
}

/**
 * Full-bleed looping background video with a readability overlay.
 * - muted + playsInline: autoplay works on phones; no sound, no controls.
 * - poster shown while loading, when autoplay is blocked, and for "reduced motion".
 * - video is paused when the hero is off-screen (saves battery / data).
 */
export function HeroBackground({ videoUrl, posterUrl, overlay }: Pick<HeroSettings, "videoUrl" | "posterUrl" | "overlay">) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    const t = setTimeout(on, 0);
    mq.addEventListener("change", on);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", on);
    };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [videoUrl, reduced]);

  const webm = videoUrl === HERO_DEFAULTS.videoUrl ? videoUrl.replace(/\.mp4$/, ".webm") : null;
  const showVideo = !reduced && !failed;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0A0F4D]" aria-hidden="true">
      <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      {showVideo && (
        <video
          key={videoUrl}
          ref={ref}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl}
          onError={() => setFailed(true)}
        >
          {webm && <source src={webm} type="video/webm" />}
          <source src={videoUrl} />
        </video>
      )}
      <div className="absolute inset-0" style={{ background: `rgba(5, 8, 46, ${overlay / 100})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05082e]/30 via-transparent to-[#05082e]/60" />
    </div>
  );
}
