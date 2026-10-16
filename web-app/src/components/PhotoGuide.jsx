import { useState, useEffect, useRef } from "react";
import { PHOTO_STEPS } from "../lib/photoGuide";
import "../Features.css";

/* Small illustrations: left = good example, right = what to avoid. */
const Tablet = ({ x, y, rx = 22, ry = 12 }) => (
  <g>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fdfdfb" stroke="#8fa9bb" strokeWidth="1.5" />
    <line x1={x - rx + 5} y1={y} x2={x + rx - 5} y2={y} stroke="#c3d2dc" strokeWidth="1.5" />
  </g>
);
const Badge = ({ x, ok }) => (
  <g>
    <circle cx={x} cy={14} r="8" fill={ok ? "#00a86b" : "#e0284a"} />
    <text x={x} y={18} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{ok ? "✓" : "✕"}</text>
  </g>
);

export function StepArt({ id }) {
  return (
    <svg viewBox="0 0 240 110" className="pg-art" role="img" aria-label={PHOTO_STEPS.find((s) => s.id === id)?.title}>
      <defs>
        <pattern id="pg-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#dfe8ef" />
          <rect width="5" height="10" fill="#b9c9d6" />
        </pattern>
      </defs>

      {id === "background" && (
        <>
          <rect x="8" y="22" width="104" height="80" rx="6" fill="#9fb2c0" stroke="#c3d2dc" />
          <Tablet x={60} y={62} />
          <rect x="128" y="22" width="104" height="80" rx="6" fill="#fdfdfb" stroke="#c3d2dc" />
          <Tablet x={180} y={62} />
          <ellipse cx="196" cy="70" rx="14" ry="9" fill="#e8b89a" />
        </>
      )}

      {id === "light" && (
        <>
          <rect x="8" y="22" width="104" height="80" rx="6" fill="#f5f8fb" stroke="#c3d2dc" />
          <path d="M62 24 L52 42 H60 L56 56 L70 36 H62 Z" fill="#f4c542" stroke="#d9a400" strokeWidth="1" />
          <Tablet x={60} y={72} />
          <rect x="128" y="22" width="104" height="80" rx="6" fill="#e3ebf1" stroke="#c3d2dc" />
          <polygon points="180,62 232,62 232,102 160,102" fill="#9fb2c0" opacity="0.45" />
          <Tablet x={180} y={62} />
          <circle cx="172" cy="57" r="6" fill="#ffffff" opacity="0.95" />
        </>
      )}

      {id === "frame" && (
        <>
          <rect x="8" y="22" width="104" height="80" rx="6" fill="#f5f8fb" stroke="#c3d2dc" />
          <path d="M16 38 V30 H24 M96 30 H104 V38 M104 86 V94 H96 M24 94 H16 V86" fill="none" stroke="#0077b6" strokeWidth="2" />
          <Tablet x={60} y={62} rx={36} ry={20} />
          <rect x="128" y="22" width="104" height="80" rx="6" fill="#f5f8fb" stroke="#c3d2dc" />
          <path d="M136 38 V30 H144 M216 30 H224 V38 M224 86 V94 H216 M144 94 H136 V86" fill="none" stroke="#0077b6" strokeWidth="2" />
          <Tablet x={180} y={62} rx={10} ry={6} />
        </>
      )}

      <Badge x={22} ok />
      <Badge x={142} ok={false} />
    </svg>
  );
}

/**
 * First-visit overlay (3 steps). Props: onClose(), called on Done, Skip, Escape or backdrop click.
 */
export default function PhotoGuide({ onClose }) {
  const [i, setI] = useState(0);
  const primaryRef = useRef(null);
  const step = PHOTO_STEPS[i];
  const last = i === PHOTO_STEPS.length - 1;

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pg-backdrop" onClick={onClose}>
      <div
        className="pg-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pg-top">
          <span className="pg-kicker">How to photograph a tablet · {i + 1} of {PHOTO_STEPS.length}</span>
          <button type="button" className="pg-skip" onClick={onClose}>Skip</button>
        </div>

        <StepArt id={step.id} />
        <div className="pg-caption">
          <span className="pg-good">✓ {step.good}</span>
          <span className="pg-bad">✕ {step.bad}</span>
        </div>

        <h2 id="pg-title" className="pg-title">{step.title}</h2>
        <p className="pg-text">{step.text}</p>

        <div className="pg-dots" aria-hidden="true">
          {PHOTO_STEPS.map((s, n) => <span key={s.id} className={`pg-dot ${n === i ? "pg-dot-on" : ""}`} />)}
        </div>

        <div className="pg-actions">
          <button type="button" className="pg-btn pg-btn-ghost" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
            Back
          </button>
          <button
            type="button"
            ref={primaryRef}
            className="pg-btn pg-btn-primary"
            onClick={() => (last ? onClose() : setI((n) => n + 1))}
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
