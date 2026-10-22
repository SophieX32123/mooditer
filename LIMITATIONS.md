# Known limitations

- Experimental content estimates, not diagnosis, mood measurement, attention
  tracking, or evidence that app use improves mental wellbeing.
- Four ensemble intensities (anger/fear/joy/sadness) are not exclusive probabilities
  and need not sum to one. No calibrated neutral threshold is implemented.
  A top-two gap below 0.02 yields Mixed. The wheel counts leading labels, so low
  absolute scores can still receive a leading label.
- Fallback lexicon-v1 uses six emotion shares and is not numerically comparable
  with ensemble intensities. The interface keeps methods separate.
- OCR quality, small fonts, sarcasm, mixed posts, truncation, and English-language
  assumptions limit accuracy. Images, video meaning and audio are not interpreted.
- Five seconds is a target, not a guarantee. Busy work, throttling and sleep cause
  missing observations. Repeated frames count repeatedly. Sample fractions are
  not exact time fractions, unique items, or proof that someone read the content.
- Keyword content rules are simple and overlapping. They cannot reliably separate
  a platform from its topic. Rule match-count behavior is inconsistent across
  categories and needs review; no human-coded accuracy claim is established.
- Numerical parity is unresolved. Historical batch-one browser results: GoEmotions
  maximum absolute difference 0.1851415, mean 0.0040704; final predictions maximum
  0.1097401643, mean 0.0100701416. Required tolerances remain 0.001 and 0.002.
  VADER/signals and reference-feature LightGBM checks passed. An exact-version
  Python diagnostic also differed, so browser rounding alone is not established
  as the cause. These are historical results, not a fresh run of this preview.
- Batch-one, no-padding references were approved on 2026-10-20 because dynamic
  int8 quantization made earlier padded batch outputs composition-dependent.
- Model files are large and inference/OCR performance depends on hardware.
  Prior ten-block inference median was about 0.685 seconds, excluding OCR and
  initialization, on the developer's machine; it is not a universal benchmark.
- Only Edge has a completed prior browser test run. Manual permission dialogs,
  browser sharing controls and cross-browser behavior need release checks.
- A previous dependency audit reported six findings in the Node-side dependency
  tree. Refresh and triage the audit before release; no clean audit is claimed.
