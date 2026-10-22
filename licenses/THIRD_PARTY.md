# Added components

- @huggingface/transformers 3.8.1: Apache-2.0, `transformers-js.txt`.
- @huggingface/jinja: MIT, `huggingface-jinja.txt`; exact installed version is in package-lock.json.
- ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4 and Node 1.21.0: Microsoft MIT license, `onnxruntime.txt`. Node native binaries are development-only and not distributed in the extension.
- vaderSentiment 3.3.2: MIT, `vaderSentiment.txt`. `src/vader.js` is a JavaScript port of C.J. Hutto's Python rules; `src/vader-data.json` copies NEGATE, SPECIAL_CASES and emoji descriptions from that exact distribution. The supplied export provides the lexicon and boosters. Cite Hutto & Gilbert (2014), VADER, ICWSM.
- SamLowe/roberta-base-go_emotions: the upstream model card declares MIT (`goemotions-model-card.md`, retrieved from https://huggingface.co/SamLowe/roberta-base-go_emotions/raw/main/README.md). Export provenance and LightGBM metadata are preserved in assets/emotion-v2/app_lite_model.json and export_report.json. No author-specific license for the user's trained regressors was included in the supplied export.

Existing OCR/sentiment licenses are copied by scripts/build.mjs as before. Upstream third-party runtime notices are included separately when supplied.
