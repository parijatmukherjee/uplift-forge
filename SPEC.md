# Uplift Forge — Technical Specification

**Version:** 4.0
**Team:** ACTIN
**Organisation:** Omio
**Date:** February 2026

---

## 1. Overview
Uplift Forge is a Python + React platform for engineering team performance. It connects to JIRA to auto-compute engineering hours, map business metadata via a rule engine, track team-level KPIs with trend analysis, and provide a personalized dashboard using JIRA project metadata.

## 2. Architecture & Tech Stack

### Backend (Python 3.11+)
- **Framework:** FastAPI
- **JIRA Client:** `atlassian-python-api` with lazy-initialized cached instance
- **Pagination:** Cursor-based (`nextPageToken`/`isLast`) via `enhanced_jql` for JIRA Cloud
- **Persistence:** `config.yaml` for settings/mappings, in-memory caches for tickets and raw issues
- **Sync:** On-demand only — triggered by explicit user actions (Sync button or config save). No background scheduler.
- **Logging:** Python `logging` module

### Frontend (React 19 + TypeScript)
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS v4 — dark slate theme with indigo/cyan/violet/emerald accents per feature
- **Charts:** Recharts (LineChart, BarChart, PieChart)
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Notifications:** react-hot-toast (with ID-based deduplication)
- **Dialogs:** Custom `ModalDialog` component (no native `alert`/`confirm`/`prompt`)

### Infrastructure
- **Containerisation:** Docker Compose (backend + frontend)
- **Dev tooling:** Makefile for common commands

## 3. Core Features

### 3.1 Project Personalization
The app fetches JIRA project metadata (`GET /jira/project`) on startup:
- **Project name** shown in sidebar, page headers ("Activations & Incentives — Team Metrics")
- **Project avatar** replaces the default icon in sidebar and home page
- **Project lead** displayed at the bottom of the sidebar
- Graceful fallback to generic "Uplift Forge" branding if JIRA call fails

### 3.2 Feature-Organized Configuration
The Configuration page groups settings by feature with visual section headers:

**JIRA Connection** (shared) — Project key, Fetch Fields button, data time range (1-12 months max).

**Team Metrics** — Story Points field mapping, SP calibration (`sp_to_days`: how many man-days = 1 SP, default 1).

**Engineering Attribution** — TPD BU / Eng Hours / Work Stream field mappings, "show only missing fields" toggle, TPD BU and Work Stream mapping rules.

**Engineering Hours Calculation** (shared) — Start/end statuses, excluded statuses for eng hours computation.

All configuration persisted to `config.yaml`.

### 3.3 Team Metrics Dashboard

#### KPI Cards (9 metrics)
| Metric | Formula | Lower is Better? |
|--------|---------|:-:|
| Total Tickets | count of resolved tickets in period | |
| Total Story Points | sum of SP | |
| Total Eng Hours | sum of eng_hours | |
| Estimation Accuracy | (total SP x sp_to_days x 8) / total eng hours | |
| Avg Hours / SP | total eng hours / total SP | Yes |
| Avg Cycle Time | mean eng hours per ticket | Yes |
| Bug Count | count where issue_type in {Bug, Defect} | Yes |
| Bug Ratio | bug count / total tickets | Yes |
| Bug Hours % | bug eng hours / total eng hours x 100 | Yes |

#### Period Filtering
- **All Time** — no time filter
- **Weekly** — last 7 days
- **Bi-weekly** — last 14 days
- **Monthly** — last 30 days

Each period also computes the previous period of the same length for trend comparison.

#### Trend Badges
- **KPI cards**: Arrow + percentage change, colored green/red based on `LOWER_IS_BETTER` set
- **Chart headers**: Arrow + percentage + "vs prev period"
- **Hover tooltips**: Show previous value, current value, and direction

#### Charts
- Monthly Trend (line chart): tickets, story points, eng hours over time
- Eng Hours by Business Unit (horizontal bar)
- Eng Hours by Work Stream (pie)
- Story Points by Business Unit (horizontal bar)
- Issue Type Breakdown (pie)

#### Help Tooltips
Every KPI card and chart section has a `?` icon. Hover shows:
- What is this metric
- Why it matters
- High-performing targets
- What up-trend and down-trend mean for this specific metric

### 3.4 Field Computation Engine

#### Engineering Hours
Calculated from the issue changelog:
1. Finds the first transition to the configured **start status**.
2. Finds the first subsequent transition to the configured **end status**.
3. Computes the delta in office hours (configurable timezone, start/end times, weekend exclusion).
4. Subtracts time spent in **excluded statuses** (e.g. Blocked) within the window.

#### TPD BU / Work Stream (Rule Engine)
Resolved by evaluating mapping rules against issue context:

**Fields:** `parent_key`, `parent_summary`, `labels`, `components`, `summary`, `issue_type`, `priority`, `assignee`

**Operators:** `equals` (exact match), `contains` (substring), `starts_with` (prefix), `in` (comma-separated list)

**Logic:**
- Rules within an AND-block must **all** match (AND).
- Multiple AND-blocks within a group are evaluated with **any** match sufficient (OR).
- Groups are checked top-to-bottom; the **first matching group** wins.

**Data model** (`Rule[][]` per group):
```json
{
  "tpd_bu": {
    "B2C": [
      [
        {"field": "parent_key", "operator": "equals", "value": "ACTIN-195"},
        {"field": "labels", "operator": "contains", "value": "B2C"}
      ],
      [
        {"field": "summary", "operator": "contains", "value": "consumer"}
      ]
    ]
  }
}
```
This means: match B2C if `(parent_key = ACTIN-195 AND labels contains B2C) OR (summary contains consumer)`.

### 3.5 Sync Engine
- **Bulk Sync:** Cursor-based pagination with embedded changelogs (no N+1 API calls). Time range capped at 12 months.
- **Single-ticket Sync:** Per-row refresh fetches and reprocesses one ticket.
- **On-demand only:** No background scheduler. Sync triggers via "Sync Now" / "Sync & Refresh" buttons or config save (when project key or filter changes).
- **Raw Issue Cache:** Stores full JIRA issue payloads so mapping rules can be re-evaluated without re-fetching from JIRA.

### 3.6 Engineering Attribution Dashboard
- **Filtering:** Shows only final-state tickets (Done, Rejected, Closed, Resolved, Cancelled).
- **Sorting:** By JIRA `updated` timestamp, newest first.
- **Pagination:** 10 items per page with previous/next navigation.
- **Inline Editing:** TPD BU (dropdown), Work Stream (dropdown), and Engineering Hours (number input) are editable per row.
- **Per-field Recalculate:** Calculator buttons for each field to recompute from JIRA data on demand.
- **Save to JIRA:** Pushes local edits back to JIRA custom fields (toast deduplication via IDs).
- **Status Badges:** Color-coded by ticket status.
- **Summary Bar:** Shows total ticket count and breakdown of missing fields.

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tickets` | List cached tickets (final statuses only, filtered by mode) |
| `PATCH` | `/tickets/{key}` | Update ticket fields in JIRA |
| `POST` | `/tickets/{key}/sync` | Re-sync a single ticket from JIRA |
| `GET` | `/tickets/{key}/calculate` | Recalculate engineering hours |
| `GET` | `/tickets/{key}/calculate-fields` | Recalculate TPD BU and Work Stream |
| `POST` | `/sync` | Trigger full project sync |
| `GET` | `/config` | Get current configuration |
| `POST` | `/config` | Update configuration (returns `sync_triggered`, `ticket_count`) |
| `GET` | `/jira/project` | Get project name, lead, and avatar from JIRA |
| `GET` | `/jira/fields` | List all JIRA custom fields |
| `GET` | `/jira/statuses` | List all JIRA workflow statuses |
| `GET` | `/metrics/team?period=` | Team KPIs with trend data (`all`, `weekly`, `bi-weekly`, `monthly`) |

### POST /config behavior
- Changing **project key** or **ticket filter** triggers a full JIRA re-sync.
- Changing only **mapping rules** triggers `reprocess_cache()` (re-evaluates rules against cached raw issues, no JIRA fetch).
- Response includes `ticket_count` (visible tickets after filtering).

### GET /metrics/team response
Returns `summary`, `by_business_unit`, `by_work_stream`, `issue_type_breakdown`, `monthly_trend`, plus `prev_*` variants for trend calculation when `period != all`.

## 5. Configuration Schema (`config.yaml`)

```yaml
jira:
  base_url: https://your-org.atlassian.net
  email: your-email@example.com
  project_key: ACTIN
  field_ids:
    tpd_bu: customfield_17924
    eng_hours: customfield_18466
    work_stream: customfield_18837
    story_points: customfield_10004

engineering_hours_start_status: In Progress
engineering_hours_end_status: Code Review
engineering_hours_excluded_statuses: [Blocked]

ticket_filter:
  mode: last_x_months    # last_x_months | missing_fields
  months: 6              # 1-12

sp_to_days: 1            # man-days per story point

mapping_rules:
  tpd_bu: { ... }
  work_stream: { ... }

office_hours:
  start: "09:00"
  end: "18:00"
  timezone: Europe/Berlin
  exclude_weekends: true

sync:
  auto_write_to_jira: false
  interval_minutes: 60
```

## 6. Testing

Backend tests across two files:
- **`test_field_engine.py`** — Office hours calculation, blocked periods, weekend exclusion.
- **`test_integration.py`** — JQL construction, sync filter passthrough, GET /tickets filtering, missing fields edge cases, config endpoint behavior, rule engine AND/OR logic with backward compatibility.

Run: `make test` or `cd backend && .venv/bin/python -m pytest -v`

## 7. Security
- JIRA API token and email managed via `.env` environment variables (never committed).
- CORS configured for local development.
- Configuration persistence in `config.yaml` allows recovery after restart.
- No native browser dialogs — all interactions via React modals.
- Data time range capped at 12 months to prevent excessive JIRA queries.

## 8. Known JIRA Cloud Quirks
- `atlassian-python-api` `jql()` method raises `ValueError` for `start > 0` on Cloud — must use `enhanced_jql()`.
- The `total` field in JIRA search responses returns 0 — pagination relies on `isLast` flag.
- Relative dates in JQL silently return 0 results on some instances — use absolute dates computed in Python.
