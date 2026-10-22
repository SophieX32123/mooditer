# Mooditer — Beyond Screen Time

Mooditer is an experimental browser extension that helps people reflect on the
emotional tone of their digital content exposure, including social media, news,
schoolwork, entertainment, and shopping. It estimates emotions expressed in text,
not the user's feelings or mental health.

**Release status: source preview, not a validated instrument or an installable
release.** This privacy-filtered source tree deliberately excludes research data,
reference texts, and model assets. Building requires restoring authorized assets
as described in [ASSETS.md](ASSETS.md). Do not substitute arbitrary models and
claim equivalent results. GoEmotions and final-prediction numerical parity remain
unresolved; see [LIMITATIONS.md](LIMITATIONS.md).

## Features

- User-controlled screen, window, or tab sharing, targeting a capture every five
  seconds; busy processing skips captures rather than accumulating a queue.
- Local English OCR with Tesseract and local analysis in a browser worker.
- An ensemble of GoEmotions contextual features, VADER and text signals, and
  four LightGBM regressors estimates anger, fear, joy, and sadness intensities.
- Separate AFINN-based sentiment and keyword-based content categorization.
- Sentiment timeline by default, optional emotion timelines, emotion distribution
  wheel beside intensity bars, and a content-category wheel below them.
- Hour/day/week grouping, activity summaries, CSV export, and Delete my data.
- Fictional positive and negative demo scenarios with matching timestamps and
  sample counts. They illustrate the interface, not a controlled efficacy study.

Screenshots and OCR text are processed transiently; only derived measurements
are stored locally in IndexedDB. Retention is 90 days, pruned while the dashboard
is open. User-exported CSV files must be deleted separately. See [PRIVACY.md](PRIVACY.md).

## Development

Node.js 20.19+; development previously tested on Node 24.14.1 and npm 11.11.0.
Install dependencies with `npm ci` (requires network access).

Run the asset-independent tests in this preview:

```sh
node --test tests/analysis.test.mjs tests/capture.test.mjs tests/demo.test.mjs tests/emotion-wheel.test.mjs
```

Once the approved assets and private reference fixtures are restored locally:

```sh
npm test
npm run test:parity
npm run build
npm run test:parity:browser
npm run test:browser
```

Parity checks currently fail; do not loosen tolerances or replace fixtures to
obtain a passing result. `npm test` includes fixture-dependent tests and will not
run completely in this source-only preview. Public subset success is not model
validation. See [TESTING.md](TESTING.md) and [INSTALL.md](INSTALL.md).

## Code map

`extension/` contains manifest, dashboard HTML/CSS and background entry point.
`src/capture.js` handles capture and OCR; `analysis.js` combines analyses;
`goemotions.js`, `features.js`, `vader.js`, `lgbm.js`, and the emotion worker/client
implement inference. `storage.js` manages local records; `aggregate.js` summarizes;
`dashboard.js` and `emotionWheel.js` render the interface; `demo.js` supplies
fictional examples. `scripts/build.mjs` bundles code and copies local runtime
assets and notices into `dist/`.

## Contributions and licensing

See [CREDITS.md](CREDITS.md) for Sophie's research contributions, AI assistance,
and existing tools. Project-owned code is offered under the ISC license, matching
the existing package metadata. Third-party components retain their own licenses;
the ISC license does not relicense models, training data, or research material.
See [LICENSE](LICENSE), [LICENSE_SCOPE.md](LICENSE_SCOPE.md), and `licenses/`.

Please use fictional examples in issues and pull requests. Never upload a real
screen capture, participant response, private OCR text, or credential. See
[CONTRIBUTING.md](CONTRIBUTING.md). Before publishing, follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
