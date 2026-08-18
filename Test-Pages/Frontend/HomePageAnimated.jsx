// frontend/app/page.js

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowUpRight,
  MapPin,
  Factory,
  Boxes,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";

// Numeric targets so the stat row can count up on load instead of
// just appearing — decimals/suffix control how each one is formatted.
const STAT_DEFS = [
  { target: 500, decimals: 0, suffix: "+", label: "Factories" },
  { target: 2, decimals: 0, suffix: "M+", label: "Orders / Yr" },
  { target: 99.9, decimals: 1, suffix: "%", label: "Uptime" },
  { target: 24, decimals: 0, suffix: "/7", label: "Support" },
];

const pillars = [
  { icon: Factory, label: "Real-Time Production Tracking" },
  { icon: Boxes, label: "Smart Inventory & Sourcing" },
  { icon: ClipboardCheck, label: "Automated Quality Control" },
  { icon: ShieldCheck, label: "Compliance & Audit Ready" },
];

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(defs, { duration = 1400, delay = 500 } = {}) {
  const [values, setValues] = useState(defs.map(() => 0));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setValues(defs.map((d) => d.target));
      return;
    }

    let raf;
    const start = performance.now() + delay;

    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setValues(defs.map((d) => d.target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [defs, duration, delay]);

  return values;
}

export default function HomePage() {
  const { user } = useAuth();
  const counts = useCountUp(STAT_DEFS);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .hkd-home {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #f0ede6;
          color: #2c2417;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
        }

        .hkd-home::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
        }

        /* ── SIGNATURE: animated stitched seam as the column divider ── */
        .hkd-stitch-divider {
          position: absolute;
          top: 0;
          left: 50%;
          width: 3px;
          height: 100%;
          transform: translateX(-50%);
          z-index: 3;
          pointer-events: none;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(184, 122, 74, 0.55) 0px,
            rgba(184, 122, 74, 0.55) 9px,
            transparent 9px,
            transparent 18px
          );
          background-size: 3px 18px;
          animation: hkd-stitch-run 1.1s linear infinite;
          opacity: 0;
          animation: hkd-stitch-run 1.1s linear infinite,
                     hkd-fade-in 0.6s ease 0.9s forwards;
        }

        .hkd-stitch-needle {
          position: absolute;
          left: 50%;
          top: 0;
          width: 9px;
          height: 9px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #b87a4a;
          box-shadow: 0 0 0 4px rgba(184, 122, 74, 0.18);
          z-index: 4;
          opacity: 0;
          animation: hkd-needle-shuttle 5.2s cubic-bezier(0.65, 0, 0.35, 1) 1.4s infinite,
                     hkd-fade-in 0.5s ease 1.4s forwards;
        }

        @keyframes hkd-stitch-run {
          from { background-position-y: 0; }
          to { background-position-y: -18px; }
        }

        @keyframes hkd-needle-shuttle {
          0%   { top: 4%; }
          48%  { top: 96%; }
          50%  { top: 96%; }
          98%  { top: 4%; }
          100% { top: 4%; }
        }

        @keyframes hkd-fade-in {
          to { opacity: 1; }
        }

        /* ── entrance choreography ── */
        @keyframes hkd-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes hkd-clip-reveal {
          from { clip-path: inset(0 0 100% 0); }
          to   { clip-path: inset(0 0 0% 0); }
        }

        .hkd-anim {
          opacity: 0;
          animation: hkd-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .hkd-d1 { animation-delay: 0.05s; }
        .hkd-d2 { animation-delay: 0.15s; }
        .hkd-d3 { animation-delay: 0.28s; }
        .hkd-d4 { animation-delay: 0.42s; }
        .hkd-d5 { animation-delay: 0.55s; }
        .hkd-d6 { animation-delay: 0.68s; }

        /* ── LEFT ── */
        .hkd-left {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.25rem 2.5rem 1.75rem;
          overflow: hidden;
        }

        .hkd-left::after {
          content: '';
          position: absolute;
          bottom: -100px;
          left: -60px;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(184,122,74,0.1) 0%, transparent 68%);
          pointer-events: none;
          animation: hkd-glow-pulse 6s ease-in-out infinite;
        }

        @keyframes hkd-glow-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        .hkd-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .hkd-brand-name {
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: #7a6250;
        }

        .hkd-loc {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #b87a4a;
          margin-bottom: 1.1rem;
        }

        .hkd-loc-icon {
          animation: hkd-bob 2.4s ease-in-out infinite;
        }

        @keyframes hkd-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .hkd-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.2rem, 4vw, 3.4rem);
          font-weight: 400;
          line-height: 1.07;
          letter-spacing: -0.01em;
          color: #1a1208;
          margin-bottom: 1.1rem;
        }

        .hkd-h1 span { display: block; overflow: hidden; }
        .hkd-h1 span > em,
        .hkd-h1 span {
          display: inline-block;
        }

        .hkd-h1-line {
          display: block;
          opacity: 0;
          transform: translateY(100%);
          animation: hkd-line-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes hkd-line-up {
          to { opacity: 1; transform: translateY(0); }
        }

        .hkd-h1 em {
          font-style: italic;
          color: #b87a4a;
          position: relative;
        }

        .hkd-desc {
          font-size: 13.5px;
          font-weight: 300;
          line-height: 1.75;
          color: #7a6250;
          max-width: 360px;
          margin-bottom: 1.75rem;
        }

        .hkd-cta-row {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .hkd-cta-primary {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #2c2417;
          color: #f0ede6;
          font-family: 'DM Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding: 11px 20px;
          border-radius: 100px;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s, box-shadow 0.25s;
        }

        .hkd-cta-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(120deg, transparent, rgba(240,237,230,0.35), transparent);
          transform: skewX(-20deg);
          transition: left 0.6s ease;
        }

        .hkd-cta-primary:hover {
          background: #b87a4a;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px -6px rgba(184,122,74,0.55);
        }

        .hkd-cta-primary:hover::before {
          left: 130%;
        }

        .hkd-cta-primary svg {
          transition: transform 0.25s ease;
        }

        .hkd-cta-primary:hover svg {
          transform: translate(2px, -2px);
        }

        .hkd-cta-ghost {
          font-size: 12.5px;
          font-weight: 400;
          color: #9a7b63;
          text-decoration: none;
          padding-bottom: 2px;
          border-bottom: 1px solid transparent;
          transition: color 0.2s, border-color 0.2s;
        }

        .hkd-cta-ghost:hover {
          color: #b87a4a;
          border-color: #b87a4a;
        }

        .hkd-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid rgba(44,36,23,0.08);
          padding-top: 1.1rem;
        }

        .hkd-stat {
          text-align: center;
          border-right: 1px solid rgba(44,36,23,0.07);
          padding: 0 6px;
          transition: transform 0.25s ease;
        }

        .hkd-stat:hover {
          transform: translateY(-2px);
        }

        .hkd-stat:last-child { border-right: none; }

        .hkd-stat-val {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          font-weight: 600;
          color: #b87a4a;
          line-height: 1;
          margin-bottom: 4px;
          display: block;
          font-variant-numeric: tabular-nums;
        }

        .hkd-stat-lbl {
          font-size: 9.5px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #a08060;
          display: block;
        }

        /* ── RIGHT ── */
        .hkd-right {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .hkd-img-wrap {
          position: relative;
          flex: 1 1 0;
          min-height: 0;
          overflow: hidden;
          animation: hkd-clip-reveal 1.1s cubic-bezier(0.65, 0, 0.35, 1) 0.1s both;
        }

        .hkd-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: sepia(15%) contrast(1.06) brightness(0.94);
          transform: scale(1.08);
          transition: transform 9s ease;
        }

        .hkd-img-wrap:hover img { transform: scale(1.14); }

        .hkd-img-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 55%, rgba(26,18,8,0.22) 100%);
          pointer-events: none;
        }

        .hkd-badge {
          position: absolute;
          bottom: 14px;
          left: 14px;
          z-index: 2;
          background: rgba(240,237,230,0.9);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(44,36,23,0.09);
          border-radius: 9px;
          padding: 9px 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          animation: hkd-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1.1s forwards;
        }

        .hkd-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #5ca068;
          box-shadow: 0 0 0 3px rgba(92,160,104,0.22);
          flex-shrink: 0;
          animation: hkd-pulse 2.5s ease infinite;
        }

        @keyframes hkd-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(92,160,104,0.22); }
          50% { box-shadow: 0 0 0 5px rgba(92,160,104,0.1); }
        }

        .hkd-badge-txt {
          font-size: 10.5px;
          font-weight: 500;
          color: #2c2417;
          letter-spacing: 0.01em;
        }

        .hkd-pillars {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #e6e0d4;
          border-top: 1px solid rgba(44,36,23,0.08);
        }

        .hkd-pillar {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 1rem 1.1rem;
          border-right: 1px solid rgba(44,36,23,0.07);
          border-bottom: 1px solid rgba(44,36,23,0.07);
          transition: background 0.18s;
          cursor: default;
          opacity: 0;
          animation: hkd-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .hkd-pillar:nth-child(1) { animation-delay: 1.15s; }
        .hkd-pillar:nth-child(2) { animation-delay: 1.25s; }
        .hkd-pillar:nth-child(3) { animation-delay: 1.35s; }
        .hkd-pillar:nth-child(4) { animation-delay: 1.45s; }

        .hkd-pillar::before {
          content: '';
          position: absolute;
          left: 1.1rem;
          bottom: 8px;
          width: 0;
          height: 1px;
          background-image: repeating-linear-gradient(
            to right,
            #b87a4a 0, #b87a4a 4px, transparent 4px, transparent 7px
          );
          transition: width 0.35s ease;
        }

        .hkd-pillar:nth-child(2n) { border-right: none; }
        .hkd-pillar:nth-child(3), .hkd-pillar:nth-child(4) { border-bottom: none; }
        .hkd-pillar:hover { background: rgba(184,122,74,0.07); }
        .hkd-pillar:hover::before { width: calc(100% - 2.2rem); }

        .hkd-pillar-icon {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: rgba(184,122,74,0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.25s;
        }

        .hkd-pillar:hover .hkd-pillar-icon {
          transform: rotate(-8deg) scale(1.08);
          background: rgba(184,122,74,0.22);
        }

        .hkd-pillar-lbl {
          font-size: 11px;
          font-weight: 500;
          color: #4a3728;
          line-height: 1.3;
        }

        /* ── DARK MODE ── */
        .dark .hkd-home { background: #1b1712; color: #e8ddd0; }
        .dark .hkd-brand-name { color: #a8917d; }
        .dark .hkd-loc { color: #d4955e; }
        .dark .hkd-h1 { color: #f0e8dc; }
        .dark .hkd-h1 em { color: #d4955e; }
        .dark .hkd-desc { color: #a8917d; }
        .dark .hkd-cta-primary { background: #e8ddd0; color: #1b1712; }
        .dark .hkd-cta-primary:hover { background: #d4955e; }
        .dark .hkd-cta-ghost { color: #a8917d; }
        .dark .hkd-cta-ghost:hover { color: #d4955e; border-color: #d4955e; }
        .dark .hkd-stats { border-color: rgba(232,221,208,0.07); }
        .dark .hkd-stat { border-color: rgba(232,221,208,0.06); }
        .dark .hkd-stat-val { color: #d4955e; }
        .dark .hkd-stat-lbl { color: #8a7060; }
        .dark .hkd-img-wrap img { filter: sepia(20%) contrast(0.95) brightness(0.78); }
        .dark .hkd-img-wrap::after { background: linear-gradient(to bottom, transparent 55%, rgba(20,14,8,0.4) 100%); }
        .dark .hkd-badge { background: rgba(27,23,18,0.9); border-color: rgba(232,221,208,0.1); }
        .dark .hkd-badge-txt { color: #e8ddd0; }
        .dark .hkd-pillars { background: #141009; border-color: rgba(232,221,208,0.06); }
        .dark .hkd-pillar { border-color: rgba(232,221,208,0.05); }
        .dark .hkd-pillar:hover { background: rgba(212,149,94,0.06); }
        .dark .hkd-pillar-icon { background: rgba(212,149,94,0.1); }
        .dark .hkd-pillar-lbl { color: #c8b49e; }
        .dark .hkd-stitch-divider {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(212, 149, 94, 0.55) 0px,
            rgba(212, 149, 94, 0.55) 9px,
            transparent 9px,
            transparent 18px
          );
        }
        .dark .hkd-stitch-needle { background: #d4955e; box-shadow: 0 0 0 4px rgba(212,149,94,0.18); }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .hkd-home {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
            height: 100dvh;
          }
          .hkd-stitch-divider,
          .hkd-stitch-needle {
            display: none;
          }
          .hkd-left {
            border-bottom: 1px solid rgba(44,36,23,0.09);
            padding: 1.5rem;
            justify-content: center;
            gap: 0;
          }
          .dark .hkd-left { border-color: rgba(232,221,208,0.07); }
          .hkd-h1 { font-size: 2.1rem; margin-bottom: 0.8rem; }
          .hkd-desc { font-size: 13px; margin-bottom: 1.2rem; }
          .hkd-stats { padding-top: 0.85rem; margin-top: 1rem; }
          .hkd-right { max-height: 45vh; }
          .hkd-pillars { grid-template-columns: 1fr 1fr; }
          .hkd-pillar { padding: 0.75rem 0.9rem; }
        }

        /* ── ACCESSIBILITY: respect reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .hkd-home *,
          .hkd-home *::before,
          .hkd-home *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .hkd-anim, .hkd-h1-line, .hkd-badge, .hkd-pillar, .hkd-img-wrap {
            opacity: 1 !important;
            transform: none !important;
            clip-path: none !important;
          }
          .hkd-stitch-needle { display: none; }
        }
      `}</style>

      <div className="hkd-home">
        <div className="hkd-stitch-divider" aria-hidden="true" />
        <div className="hkd-stitch-needle" aria-hidden="true" />

        {/* LEFT */}
        <div className="hkd-left">
          <div className="hkd-brand hkd-anim hkd-d1">
            <Image src="/HKD_LOGO.png" alt="StitchFlow" width={26} height={26} style={{ objectFit: "contain", opacity: 0.85 }} priority />
            <span className="hkd-brand-name">StitchFlow Garments ERP</span>
          </div>

          <div>
            <span className="hkd-loc hkd-anim hkd-d2">
              <MapPin className="hkd-loc-icon" size={10} strokeWidth={2.5} />
              Built in Bangladesh · For the RMG Industry
            </span>

            <h1 className="hkd-h1">
              <span className="hkd-h1-line" style={{ animationDelay: "0.15s" }}>Engineered for the</span>
              <span className="hkd-h1-line" style={{ animationDelay: "0.28s" }}><em>Factory Floor.</em></span>
              <span className="hkd-h1-line" style={{ animationDelay: "0.41s" }}>Trusted by</span>
              <span className="hkd-h1-line" style={{ animationDelay: "0.54s" }}>RMG Leaders.</span>
            </h1>

            <p className="hkd-desc hkd-anim hkd-d5">
              One ERP for garment manufacturing — production planning, inventory,
              quality control &amp; compliance, unified on a single factory floor
              across 60+ countries.
            </p>

            <div className="hkd-cta-row hkd-anim hkd-d6">
              {user ? (
                <Link href="/dashboard" className="hkd-cta-primary">
                  Open Dashboard <ArrowUpRight size={13} strokeWidth={2} />
                </Link>
              ) : (
                <Link href="/login" className="hkd-cta-primary">
                  Get Started <ArrowUpRight size={13} strokeWidth={2} />
                </Link>
              )}
              <Link href="/dashboard" className="hkd-cta-ghost">See the Platform</Link>
            </div>
          </div>

          <div className="hkd-stats hkd-anim hkd-d6">
            {STAT_DEFS.map((s, i) => (
              <div key={s.label} className="hkd-stat">
                <span className="hkd-stat-val">
                  {counts[i].toFixed(s.decimals)}{s.suffix}
                </span>
                <span className="hkd-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="hkd-right">
          <div className="hkd-img-wrap">
            <Image
              src="/HKD_Building_image.jpeg"
              alt="Garment factory production floor running on StitchFlow ERP"
              fill
              sizes="50vw"
              style={{ objectFit: "cover" }}
              priority
            />
            <div className="hkd-badge">
              <div className="hkd-badge-dot" />
              <span className="hkd-badge-txt">Live Production · 500+ Factories</span>
            </div>
          </div>

          <div className="hkd-pillars">
            {pillars.map(({ icon: Icon, label }) => (
              <div key={label} className="hkd-pillar">
                <div className="hkd-pillar-icon">
                  <Icon size={14} strokeWidth={1.8} color="#b87a4a" />
                </div>
                <span className="hkd-pillar-lbl">{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}