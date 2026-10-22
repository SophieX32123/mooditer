# License scope

The root ISC LICENSE follows the existing package.json and package-lock.json
license designation. It applies to project-owned code and documentation only.
It does not grant rights the contributors do not own or replace upstream terms.

The notices in licenses/ govern third-party software and copied data. In
particular src/vader.js is a port of vaderSentiment and src/vader-data.json contains
upstream data: preserve licenses/vaderSentiment.txt with redistribution.
Package dependency licenses remain applicable even though npm downloads them.

The upstream GoEmotions model card declares MIT, but the trained ensemble export
does not include a license for the four project-specific LightGBM weights. All
model assets and reference texts are therefore omitted from this preview pending
provenance, permissions, and privacy review. Research data are not licensed here.

Before publication, the project owner should confirm the contributor attribution
and authority to release project-owned code under ISC. This preparation does not
publish the repository or assert ownership of another contributor's work.
