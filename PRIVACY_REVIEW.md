# Release file review — 2026-10-22

The preview was assembled from an explicit allowlist: src/, extension/, tests/,
licenses/, selected build/parity scripts, package manifests, Playwright config,
the existing privacy notice and tessdata license. Newly authored release docs
contain no participant-level data. Original code and tests were not reformatted.

Excluded: .git and its history, all research and report directories, reference
fixture texts, model exports, binaries, existing ZIPs, dist backups, handoffs,
temporary files, node_modules, duplicated files and browser profiles. The included
demo strings are fictional examples; tests use synthetic inputs. Parity scripts
remain as code but their private input data and generated reports are excluded.

Checks of the staged text files found no matches for private-key blocks, common
GitHub/OpenAI/AWS credential patterns, or developer home/Drive path patterns.
This is a limited heuristic scan, not an exhaustive secret or privacy audit.
Dependency notices may legitimately contain upstream authors' contact details.

The ZIP is built only from the reviewed file list, without node_modules or .git.
Before publishing, inspect this tree and run a dedicated secret scanner. Do not
push the original repository history, which already tracks research documents.
