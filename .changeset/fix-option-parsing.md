---
"@dtechvision/indexingco-cli": patch
---

Fixed CLI argument parsing for commands with many options

- Fixed a bug where option values (e.g., `--transformation my-value`) were incorrectly detected as positional arguments, causing a misleading hint about argument ordering
- Unified `pipelines create` to use positional `name` argument (at the end) instead of `--name` option, matching the pattern used by `filters create` and `transformations create`
- Added CLAUDE.md with development guidance for future CLI option additions
