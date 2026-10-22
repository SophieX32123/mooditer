# Installation and development

This source preview does not contain the model and OCR assets needed to build a
working extension. There is no public download URL or store listing supplied here.
First obtain an authorized matching asset set following ASSETS.md.

## Build from source

Use Node.js 20.19+ and npm. From this folder:

```powershell
npm ci
npm test
npm run test:parity
npm run build
$env:MOODITER_BROWSER = 'msedge'
npm run test:browser
npm run test:parity:browser
npm run package
```

The full tests require private fixtures. Parity failures are known and must remain
visible; building is not evidence of validation. `npm run package` rebuilds and
uses Windows PowerShell Compress-Archive to produce Mooditer-extension.zip.
On other operating systems, run `npm run build` and zip the contents of `dist/`
so manifest.json is at the archive root. Build into a fresh checkout: the build
script does not clear stale files from an existing dist folder.

The build bundles JavaScript with esbuild and copies Tesseract worker/WASM,
English OCR data, model/tokenizer files, LightGBM JSONs, feature specifications,
ONNX Runtime WASM and dependency notices from local files. It does not download
models during extension use. Network is needed for npm installation.

## Load a complete build in Edge

1. Use a separate browser profile so existing Mooditer data is untouched.
2. Extract the complete package into a permanent folder, or use the built dist/.
3. Open edge://extensions, enable Developer mode, select Load unpacked, and
   select the folder containing manifest.json.
4. Open Mooditer from the extensions menu. Keep its dashboard open.
5. Select Start tracking, then choose the surface in the browser's sharing picker.
6. Select Stop tracking, use the browser's Stop sharing control, or close the
   dashboard to end capture. Confirm the sharing indicator disappears.

Use fictional non-sensitive text for initial testing. Check activity/sample count,
reload to verify derived-record persistence, and use Privacy & data to delete it.
Try Explore demo for the paired fictional scenarios without capturing your screen.
The emotion wheel counts each model sample's leading emotion or Mixed; it is not
a measurement of the user's feelings. Legacy fallback samples are handled separately.

Chromium manifest minimum: 116. Previous automated Edge tests passed on
155.0.4283.62; Chrome verification was incomplete. Chrome uses chrome://extensions
and the same unpacked workflow, but support has not been fully verified. Firefox
and Safari are unsupported. This is not a signed, store-reviewed installation.
