import { describe, it, expect } from "vitest";
import { renderToString as render } from "react-dom/server";

// React inserts <!-- --> markers between text pieces; remove them so tests read like the screen.
const renderToString = (el) => render(el).replace(/<!-- -->/g, "");
import MedicineInput from "../components/MedicineInput";
import PhotoGuide from "../components/PhotoGuide";
import Help from "../Help";
import Cabinet from "../Cabinet";
import History from "../History";
import { PHOTO_STEPS } from "../lib/photoGuide";
import { MEDICINES } from "../lib/medicines";

// Render smoke tests: every new screen draws without throwing, even with no browser storage.
describe("new screens render", () => {
  it("MedicineInput shows the typed text and a reference note", () => {
    const html = renderToString(<MedicineInput value="paracetamol" onChange={() => {}} />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain("Reference baseline found");
  });

  it("MedicineInput accepts a name that is not on the list", () => {
    const html = renderToString(<MedicineInput value="Some Local Brand 500" onChange={() => {}} />);
    expect(html).toContain("Some Local Brand 500");
    expect(html).toContain("You can still scan");
  });

  it("PhotoGuide shows step 1 of 3", () => {
    const html = renderToString(<PhotoGuide onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain(PHOTO_STEPS[0].title);
    expect(html).toContain("1 of 3");
  });

  it("Help covers limits, privacy and the photo steps", () => {
    const html = renderToString(<Help />);
    expect(html).toContain("cannot");
    expect(html).toContain("does not save it");
    expect(html).toContain(`The reference list has ${MEDICINES.length} medicines`);
    PHOTO_STEPS.forEach((s) => expect(html).toContain(s.title));
  });

  it("Cabinet and History show their empty states", () => {
    expect(renderToString(<Cabinet />)).toContain("Your cabinet is empty");
    expect(renderToString(<History />)).toContain("No scans yet");
  });
});
