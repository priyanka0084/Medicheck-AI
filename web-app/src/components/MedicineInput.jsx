import { useState, useId, Fragment } from "react";
import { suggestMedicines, findReference } from "../lib/medicines";
import "../Features.css";

/**
 * Medicine name box with suggestions.
 * Suggestions are optional help: ANY typed text is accepted exactly as written.
 *
 * Props: value, onChange(string), recentNames (names the user scanned before), placeholder
 */
export default function MedicineInput({ value, onChange, recentNames = [], placeholder, showNote = true }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const items = suggestMedicines(value || "", { recent: recentNames });
  const expanded = open && items.length > 0;
  const trimmed = (value || "").trim();
  const reference = findReference(value);

  const pick = (item) => {
    onChange(item.value);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (items.length ? (a + 1) % items.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (items.length ? (a <= 0 ? items.length - 1 : a - 1) : -1));
    } else if (e.key === "Enter") {
      // Only intercept Enter when the user has highlighted a suggestion.
      if (expanded && active >= 0 && items[active]) {
        e.preventDefault();
        pick(items[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  };

  return (
    <div className="mi-wrap">
      <input
        className="inp"
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />

      {expanded && (
        <div className="mi-list" id={listId} role="listbox" aria-label="Medicine suggestions">
          {items.map((item, i) => {
            const showHeader = i === 0 || items[i - 1].group !== item.group;
            return (
              <Fragment key={`${item.group}-${item.value}`}>
                {showHeader && (
                  <div className="mi-group" role="presentation">
                    {item.group === "recent" ? "Your recent names" : "Reference list"}
                  </div>
                )}
                <div
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`mi-opt ${i === active ? "mi-opt-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus in the input
                    pick(item);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="mi-opt-name">{item.label}</span>
                  {item.sub && <span className="mi-opt-sub">{item.sub}</span>}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {showNote && trimmed.length >= 3 && (
        <div className={`mi-note ${reference ? "mi-note-ok" : ""}`} aria-live="polite">
          {reference
            ? `✓ Reference baseline found: ${reference}`
            : "Not an exact match to the reference list. You can still scan; the closest reference or a general baseline will be used."}
        </div>
      )}
    </div>
  );
}
