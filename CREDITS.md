# Contributions and acknowledgments

Sophie conducted the Beyond Screen Time survey research independently, reviewed
the literature, identified text-analysis and emotion-detection tools, and located
existing code for applying them. Her research questions and design decisions
shaped Mooditer's focus on digital content exposure beyond screen time. She used
AI assistance to learn concepts, debug and improve code, guided dashboard changes,
and tested the tracking experience. Do not infer sole authorship of every file.

ChatGPT and OpenAI Codex provided substantial development assistance, including
generated and revised code, debugging, tests, documentation, and presentation
drafts. AI-generated image assistance was also used for presentation graphics;
those graphics are not part of this source preview. Outputs were not independent
research evidence and require human review.

Existing tools and code underpin the implementation:

- SamLowe/roberta-base-go_emotions: pretrained contextual emotion model; model
  card in licenses/. Sophie did not invent or independently train this base model.
- Hugging Face Transformers.js and tokenization infrastructure: local inference.
- Microsoft ONNX Runtime: local quantized inference and WebAssembly runtime.
- C.J. Hutto's vaderSentiment 3.3.2: rules/lexicon and emoji descriptions used by
  the JavaScript port. Hutto & Gilbert (2014), VADER, ICWSM.
- LightGBM: four exported regression models combine contextual/VADER/text features.
  Exact training/export contributor credit and redistribution permission must be
  confirmed before distributing those weights; they are excluded here.
- Tesseract.js, Tesseract.js-core and tessdata: English OCR.
- Andrew Sliwinski's sentiment package: separate AFINN-based sentiment scoring.
- esbuild: bundling; Playwright and Node's test runner: testing.

Dhanush's ScreenTracker implementation informed the comparison of DistilBERT
and VADER baselines during research. Those research comparison scripts are not
included in this preview. Confirm any additional directly reused code and its
original attribution before publication; this note does not grant permission.

Exact JavaScript dependency versions are pinned in package-lock.json. Notices
are in licenses/ and assets/LICENSE-tessdata. Trained models and third-party code
retain their own terms. Do not describe the ensemble as proven superior without
an independent evaluation.
