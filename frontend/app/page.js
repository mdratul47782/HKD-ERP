// frontend/app/page.js

"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpRight, MapPin, Award, Users, Globe, Shield } from "lucide-react";

const stats = [
  { value: "15+", label: "Years" },
  { value: "120+", label: "Countries" },
  { value: "500K+", label: "Products" },
  { value: "98%", label: "Satisfaction" },
];

const pillars = [
  { icon: Shield, label: "Military-Grade Durability" },
  { icon: Globe, label: "Global Distribution" },
  { icon: Award, label: "ISO 9001 Certified" },
  { icon: Users, label: "500+ Team Members" },
];

export default function HomePage() {
  const { user } = useAuth();

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

        /* ── LEFT ── */
        .hkd-left {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.25rem 2.5rem 1.75rem;
          border-right: 1px solid rgba(44,36,23,0.09);
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

        .hkd-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.2rem, 4vw, 3.4rem);
          font-weight: 400;
          line-height: 1.07;
          letter-spacing: -0.01em;
          color: #1a1208;
          margin-bottom: 1.1rem;
        }

        .hkd-h1 em {
          font-style: italic;
          color: #b87a4a;
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
          transition: background 0.2s, transform 0.15s;
        }

        .hkd-cta-primary:hover {
          background: #b87a4a;
          transform: translateY(-1px);
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
        }

        .hkd-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: sepia(15%) contrast(1.06) brightness(0.94);
          transition: transform 9s ease;
        }

        .hkd-img-wrap:hover img { transform: scale(1.04); }

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
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 1rem 1.1rem;
          border-right: 1px solid rgba(44,36,23,0.07);
          border-bottom: 1px solid rgba(44,36,23,0.07);
          transition: background 0.18s;
          cursor: default;
        }

        .hkd-pillar:nth-child(2n) { border-right: none; }
        .hkd-pillar:nth-child(3), .hkd-pillar:nth-child(4) { border-bottom: none; }
        .hkd-pillar:hover { background: rgba(184,122,74,0.07); }

        .hkd-pillar-icon {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: rgba(184,122,74,0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hkd-pillar-lbl {
          font-size: 11px;
          font-weight: 500;
          color: #4a3728;
          line-height: 1.3;
        }

        /* ── DARK MODE ── */
        .dark .hkd-home { background: #1b1712; color: #e8ddd0; }
        .dark .hkd-left { border-color: rgba(232,221,208,0.07); }
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

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .hkd-home {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
            height: 100dvh;
          }
          .hkd-left {
            border-right: none;
            border-bottom: 1px solid rgba(44,36,23,0.09);
            padding: 1.5rem;
            justify-content: center;
            gap: 0;
          }
          .hkd-h1 { font-size: 2.1rem; margin-bottom: 0.8rem; }
          .hkd-desc { font-size: 13px; margin-bottom: 1.2rem; }
          .hkd-stats { padding-top: 0.85rem; margin-top: 1rem; }
          .hkd-right { max-height: 45vh; }
          .hkd-pillars { grid-template-columns: 1fr 1fr; }
          .hkd-pillar { padding: 0.75rem 0.9rem; }
        }
      `}</style>

      <div className="hkd-home">

        {/* LEFT */}
        <div className="hkd-left">
          <div className="hkd-brand">
            <Image src="/HKD_LOGO.png" alt="HKD" width={26} height={26} style={{ objectFit: "contain", opacity: 0.85 }} priority />
            <span className="hkd-brand-name">HKD Outdoor Innovation Ltd.</span>
          </div>

          <div>
            <span className="hkd-loc">
              <MapPin size={10} strokeWidth={2.5} />
              Dhaka, Bangladesh · Est. 2008
            </span>

            <h1 className="hkd-h1">
              Built for the<br />
              <em>Wilderness.</em><br />
              Trusted by<br />
              the World.
            </h1>

            <p className="hkd-desc">
              Premium outdoor gear, tactical equipment &amp; survival solutions —
              engineered for professionals who demand more, across 120+ countries.
            </p>

            <div className="hkd-cta-row">
              {user ? (
                <Link href="/dashboard" className="hkd-cta-primary">
                  Open Dashboard <ArrowUpRight size={13} strokeWidth={2} />
                </Link>
              ) : (
                <Link href="/login" className="hkd-cta-primary">
                  Get Started <ArrowUpRight size={13} strokeWidth={2} />
                </Link>
              )}
              <Link href="/dashboard" className="hkd-cta-ghost">Our Story</Link>
            </div>
          </div>

          <div className="hkd-stats">
            {stats.map((s) => (
              <div key={s.label} className="hkd-stat">
                <span className="hkd-stat-val">{s.value}</span>
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
              alt="HKD Outdoor Innovation headquarters building"
              fill
              sizes="50vw"
              style={{ objectFit: "cover" }}
              priority
            />
            <div className="hkd-badge">
              <div className="hkd-badge-dot" />
              <span className="hkd-badge-txt">HKD HQ · Dhaka, Bangladesh</span>
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