import { MEDICINES } from "./lib/medicines";
import { PHOTO_STEPS } from "./lib/photoGuide";
import { StepArt } from "./components/PhotoGuide";
import "./Features.css";

const FAQ = [
  {
    q: "What does “Genuine” mean?",
    a: "The tablet in your photo looks like the genuine tablets this app has learned from: similar colour, shine, texture and reflection. It is not a guarantee that the medicine is safe or contains the right ingredients.",
  },
  {
    q: "What does “Fake” or “Anomaly detected” mean?",
    a: "The tablet looks different from the genuine ones. That could mean a counterfeit, but it can also be caused by a poor photo, a different brand or manufacturer, or a medicine that is not in the reference list. Retake the photo with the flash on and the tablet clearly visible. If it is still flagged, keep the pack and ask a pharmacist.",
  },
  {
    q: "Why is my result “Inconclusive”?",
    a: "The photo was not good enough for a reliable answer (for example too dark, blurry, too much glare, or the tablet too small). Follow the photo guide below and try again. Accurate Scan asks for one photo with the flash off and one with the flash on, which also helps.",
  },
  {
    q: "Why does the app ask for the medicine name?",
    a: "The name is used to compare your tablet with the right genuine reference. Suggestions appear as you type, but you can type any name and scan anyway.",
  },
  {
    q: "My medicine is not in the suggestion list. Can I still scan it?",
    a: "Yes. The app will use the closest reference or a general baseline. The result is less precise because the app has not seen that exact medicine before.",
  },
  {
    q: "Why did my first scan take so long?",
    a: "The analysis server may need up to about 30 seconds to wake up if it has not been used for a while. Wait a moment and try again.",
  },
  {
    q: "How do I delete my data?",
    a: "Open Scan History and choose Clear all, or delete single scans. You can remove medicines one by one in My Medicines. Clearing your browser data also removes everything the app saved.",
  },
  {
    q: "What should I do if I am worried about a medicine?",
    a: "Do not take it. Keep the pack, the strip and the receipt, and ask your pharmacist or doctor. You can also report it to your drug regulator (in India, your State Drugs Control authority or CDSCO).",
  },
];

export default function Help() {
  return (
    <div className="page-wrap help">
      <header className="page-head">
        <h1 className="page-title">❓ Help, FAQ and Privacy</h1>
        <p className="page-sub">Plain-language answers about what this app can and cannot do, and what happens to your photos.</p>
      </header>

      <section className="panel">
        <h2 className="panel-title">What this app can and cannot tell you</h2>
        <div className="help-two">
          <div>
            <h3 className="help-h3 help-can">It can</h3>
            <ul className="help-list">
              <li>Compare the look of a tablet (colour, shine, texture, reflection) with photos of genuine tablets.</li>
              <li>Point out tablets that look different from the genuine ones.</li>
              <li>Check an expiry date and whether a batch number looks like a normal batch code.</li>
              <li>Keep a private list of your medicines and warn you when they are expired or close to it.</li>
            </ul>
          </div>
          <div>
            <h3 className="help-h3 help-cannot">It cannot</h3>
            <ul className="help-list">
              <li>Prove that a medicine is safe, effective or contains the right ingredients.</li>
              <li>Catch every counterfeit. It has only learned what genuine tablets look like and has not yet been tested on real counterfeit tablets.</li>
              <li>Replace a pharmacist, a doctor or a laboratory test.</li>
              <li>Judge medicines it has never seen as precisely. The reference list has {MEDICINES.length} medicines.</li>
            </ul>
          </div>
        </div>
        <p className="help-note">This is a screening aid. Please do not base health decisions on this app alone.</p>
      </section>

      <section className="panel">
        <h2 className="panel-title">How a scan works</h2>
        <ol className="help-list help-steps">
          <li>You take or upload a photo of the tablet and enter the medicine name.</li>
          <li>The photo is sent to the analysis server.</li>
          <li>The server measures 17 optical features (colour, brightness, texture and shine) and compares them with the genuine reference.</li>
          <li>You get a result with a plain-English explanation. The app adds its own checks for photo quality, expiry date and batch number.</li>
        </ol>
      </section>

      <section className="panel">
        <h2 className="panel-title">Your photos and your data</h2>
        <ul className="help-list">
          <li><b>Scan photo:</b> it is sent to the analysis server so the result can be calculated. The server works on the photo for that scan and does not save it.</li>
          <li><b>Saved on your device only:</b> scan results, small thumbnails, your My Medicines list and your settings stay in this browser. They are not stored on a server.</li>
          <li><b>Label scanning:</b> the label photo is read inside your browser and is not uploaded. The first time you use it, the browser downloads the text-recognition files from a public content network.</li>
          <li><b>PDF reports:</b> they are created on your device and nothing is uploaded.</li>
          <li><b>Fonts:</b> page fonts are loaded from Google Fonts.</li>
          <li><b>No account</b> or login is needed.</li>
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">How to photograph a tablet</h2>
        <div className="help-photo">
          {PHOTO_STEPS.map((s, i) => (
            <figure key={s.id} className="help-photo-item">
              <StepArt id={s.id} />
              <figcaption>
                <b>{i + 1}. {s.title}</b>
                <span>{s.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Common questions</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
