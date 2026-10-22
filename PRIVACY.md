# Mooditer privacy

Mooditer 0.1 performs English OCR and text analysis locally. It has no server, analytics, accounts, tracking SDK, or runtime network downloads. OCR code, the English language model, the 125,521,832-byte GoEmotions model, tokenizer, regression models and WebAssembly runtime are bundled with the extension.

Start tracking opens the browser's screen picker. The user selects a tab, window, or screen. Any visible content on that selected surface can be processed, including private messages or sensitive information. Audio is not captured. The browser displays its sharing indicator. Stop tracking, stopping sharing through the browser, or closing the dashboard ends capture. Sessions never automatically resume after a browser restart.

Each frame is processed in memory and discarded. Raw screenshots and extracted text are not written to application storage. New ensemble-lite-v1 records contain a capture timestamp, normalized sentiment, four mean emotion intensities (anger, fear, joy, sadness), four peaks, block count, dominant emotion, content category, word count, OCR confidence, and method version. Old or fallback lexicon-v1 records retain six emotion shares and their original leading label. The two emotion measurement types are not averaged together. The browser may manage memory and disk caches itself; Mooditer does not claim forensic erasure of browser-managed memory.

Analysis records are stored in IndexedDB within the extension's browser profile. Retention is 90 days, pruned when the dashboard opens and every minute while open. When the extension is closed, expired records remain until the next opening. Delete my data removes all stored analysis. CSV export is user initiated and saves summaries to the user's chosen downloads location. Exported files must be deleted separately.

Demo records are fictional, generated in memory, and never saved to the analysis database. Model and fallback analysis estimate emotion expressed in content; it does not infer the user's emotional or mental state. No data is shared with developers or third parties.

Emotion inference runs in a local Web Worker using bundled Transformers.js and ONNX Runtime. VADER features and LightGBM regressions also run locally. Raw text and intermediate predictions are held in memory only while processing; only the frame summary reaches the analysis database. Public model weights may remain loaded until the dashboard closes. Third-party software and model license notices ship in `licenses/`.

This development build has unresolved numerical parity failures against the supplied Python reference fixtures. Model estimates should not be described as validated until those checks pass.
