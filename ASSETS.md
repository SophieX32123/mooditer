# Assets excluded from this public source preview

All runtime model/OCR binaries, export metadata, and parity fixtures are excluded.
No training data, participant responses, real screenshots or real-use OCR text
are provided. The original local project retains its assets unchanged.

Required to build the existing extension (restore only from an authorized source):

- assets/eng.traineddata.gz (matching English tessdata; preserve LICENSE-tessdata)
- assets/emotion-v2/models/goemotions/config.json
- assets/emotion-v2/models/goemotions/tokenizer.json
- assets/emotion-v2/models/goemotions/tokenizer_config.json
- assets/emotion-v2/models/goemotions/onnx/model_quantized.onnx
- assets/emotion-v2/feature_spec.json
- assets/emotion-v2/vader_and_signals.json
- assets/emotion-v2/lightgbm_lite_anger.json
- assets/emotion-v2/lightgbm_lite_fear.json
- assets/emotion-v2/lightgbm_lite_joy.json
- assets/emotion-v2/lightgbm_lite_sadness.json

Full unit and parity tests additionally require parity_fixtures.json. The matching
export_report.json records approved batch-one inference settings. Keep both
private until provenance and permission to publish every reference text are
established. Never replace fixtures merely to get passing tests.

Runtime binary downloads are not automated because no approved, immutable public
asset release has been established. A future release should publish permitted
assets with exact source revisions, licenses and SHA-256 checksums, and document
training/export provenance for the regressors. Until then, this is source for
inspection and asset-independent testing, not a reproducible complete distribution.
