# Uplift Forge - Memory

## Workflow Rules
- **Always update docs after changes**: After any code changes, update README.md, CLAUDE.md, and any spec files. This was explicitly requested by the user.
- **Memory lives in repo**: The memory folder must reside at `.claude/memory/` inside the repository, not the external Claude projects path.

## Project State
- Branch `feat/ai-metric-suggestions`: AI-Powered Metric Suggestions feature fully implemented and tested
- 467 tests across 21 suites, all coverage thresholds met (94.43/83.83/85.24/94.43)
- No spec file exists at project root (only node_modules specs)
