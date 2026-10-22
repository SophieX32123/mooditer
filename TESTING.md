# Verification — 2026-10-22

Fresh run of the unchanged source and tests in the original development checkout,
using its existing installed dependencies:

```sh
node --test tests/analysis.test.mjs tests/capture.test.mjs tests/demo.test.mjs tests/emotion-wheel.test.mjs
```

```text
tests 16
suites 0
pass 16
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 182.2268
```

SOURCE_MANIFEST.json records SHA-256 hashes of copied originals. All 41 listed
files were checked byte-for-byte against the development checkout after copying.
The tests cover legacy analysis, quality gates, stored-record shape, aggregation,
calendar buckets, capture stop/busy behavior, fictional demo pairing and wheel
fractions. Storage persistence and actual browser rendering need browser tests.

A fresh npm ci --ignore-scripts --no-audit --no-fund in the isolated preview did
not finish and was interrupted. No clean-install success is claimed; the test
result above uses the original checkout's installed dependencies. --ignore-scripts
was for inspection only; normal builds may require dependency install scripts.

Full npm test includes emotion-v2.test.mjs, which needs withheld model/fixture
assets. The browser suite needs a complete build. Neither was rerun for this
source-only release preparation. Historical full checks: 24 unit tests and five
Edge tests passed; GoEmotions and end-to-end parity failed. See LIMITATIONS.md.

After authorized assets are available, run npm ci, npm test, npm run test:parity,
npm run build, npm run test:parity:browser and npm run test:browser. On Windows,
set MOODITER_BROWSER=msedge in your shell for Edge. Browser tests use synthetic
content and automated streams; manually test the actual sharing picker and stop
controls with fictional content in a fresh profile before distributing a build.
