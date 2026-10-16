import { CHECK } from "../lib/verification";

const ICON = { [CHECK.PASS]: "✓", [CHECK.WARN]: "!", [CHECK.FAIL]: "✕", [CHECK.UNKNOWN]: "–" };

/**
 * Shows every verification signal in one place.
 * Props: checklist — the object returned by buildChecklist().
 */
export default function VerificationChecklist({ checklist }) {
  if (!checklist) return null;
  const { items, counts, level, headline } = checklist;

  return (
    <div className={`vc-card vc-${level}`} role="region" aria-label="Verification checklist">
      <div className="vc-head">
        <div className="vc-title">Verification Checklist</div>
        <div className="vc-count mono">
          {counts.pass} of {counts.checked} checks passed
        </div>
      </div>
      <div className="vc-headline">{headline}</div>

      <ul className="vc-list">
        {items.map((item) => (
          <li key={item.id} className={`vc-row vc-row-${item.status}`}>
            <span className="vc-icon" aria-hidden="true">{ICON[item.status]}</span>
            <div className="vc-text">
              <div className="vc-label">
                {item.label}
                <span className="vc-sr"> — {item.status}</span>
              </div>
              <div className="vc-detail">{item.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="vc-foot">
        Screening aid only, not a laboratory test. If anything looks wrong, keep the pack and ask a pharmacist.
      </div>
    </div>
  );
}
