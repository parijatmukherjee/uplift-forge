# CLAUDE.md

## Project Overview

Uplift Forge — a FastAPI + React engineering team performance platform. Connects to JIRA to auto-compute engineering hours, map business metadata via a rule engine, and track team KPIs with trend analysis. UI is personalized with JIRA project name, avatar, and lead.

## Repository Structure

```
backend/           Python FastAPI backend
  main.py          App entrypoint, CORS, router registration (no scheduler)
  config.py        Config class, loads config.yaml, persists changes
  config.yaml      All settings (project key, field IDs, mapping rules, filters, sp_to_days)
  jira_client.py   JIRA API wrapper (enhanced_jql, pagination, project metadata)
  field_engine.py  Engineering hours calc + rule-based field mapping
  scheduler.py     (deprecated — scheduler removed, sync is on-demand only)
  routes/
    tickets.py     Ticket CRUD, sync, caches, team metrics endpoint (/metrics/team)
    config.py      Config GET/POST, JIRA field/status/project listing
  test_field_engine.py    Unit tests for office hours and eng hours calc
  test_integration.py     Integration tests (filters, JQL, rules)
frontend/          React 19 + TypeScript + Vite 7
  src/
    App.tsx        Root component, layout, project info provider
    api.ts         Axios client, all API calls
    components/
      ConfigPanel.tsx    Feature-organized configuration page
      RuleBuilder.tsx    Visual AND/OR rule builder (indigo/emerald/violet themes)
      ModalDialog.tsx    Reusable prompt/confirm modal
      TicketTable.tsx    Attribution table with inline editing
      TicketSummary.tsx  Summary stats bar
      Sidebar.tsx        Navigation with project branding
    pages/
      HomePage.tsx              Welcome page with project personalization
      TeamMetrics.tsx           KPI dashboard with charts, trends, help tooltips
      EngineeringAttribution.tsx  Ticket-level field management
```

## Development Commands

```bash
make setup          # Install all dependencies (backend venv + frontend npm)
make run-backend    # FastAPI on :8000
make run-frontend   # Vite dev server on :5173
make test           # Run all backend tests (pytest)
make docker-up      # Docker Compose build + start
make docker-down    # Stop Docker services
```

## Running Tests

```bash
cd backend && .venv/bin/python -m pytest test_integration.py test_field_engine.py -v
```

Or via Makefile: `make test`

## TypeScript Check

```bash
cd frontend && npx tsc --noEmit
```

## Key Technical Decisions

- **No background scheduler:** Sync is triggered only by explicit user actions (Sync button or config save). APScheduler was removed.
- **JIRA Cloud API**: Must use `enhanced_jql` (not `jql`). Pagination uses `nextPageToken`/`isLast`.
- **Absolute dates in JQL**: This JIRA instance silently returns 0 results for relative dates. All date filters use absolute dates.
- **12-month data cap**: Time range is capped at 12 months to prevent excessive JIRA queries. Legacy `mode: "all"` is treated as 12 months.
- **Rule engine data model**: `Rule[][]` per group — inner arrays are AND-blocks, outer array OR's them. Old flat `Rule[]` format is auto-detected.
- **Raw issue cache**: `raw_issue_cache` stores full JIRA payloads so rules can be re-evaluated without re-fetching.
- **SP calibration**: `sp_to_days` config (default 1) defines man-days per story point. Used in estimation accuracy: `(SP x sp_to_days x 8) / eng_hours`.
- **Toast deduplication**: All `react-hot-toast` calls use `{ id: ... }` to prevent duplicate notifications on rapid clicks.
- **Fixed-position tooltips**: Help tooltips and trend tooltips use `getBoundingClientRect()` + `position: fixed` + `z-[9999]` to avoid clipping by overflow parents.
- **Feature-organized config**: ConfigPanel groups settings into JIRA Connection, Team Metrics, Engineering Attribution, and Engineering Hours Calculation sections.
- **Project personalization**: `GET /jira/project` fetches name/avatar/lead from JIRA. Passed as `ProjectInfo` prop through App → Sidebar, HomePage, TeamMetrics, EngineeringAttribution.
- **No native browser dialogs**: All `prompt()`/`confirm()`/`alert()` replaced with `ModalDialog`. Notifications via `react-hot-toast`.
- **Config persistence**: All config saved to `config.yaml` via `yaml.safe_dump`. Secrets stay in `.env`.

## Code Conventions

- Backend: Python 3.11+, FastAPI routers, no ORMs (in-memory caches)
- Frontend: React 19, TypeScript strict, Tailwind CSS v4 (dark slate theme, feature-colored accents: indigo=shared, cyan=metrics, violet=attribution, emerald=eng hours)
- Charts: Recharts (LineChart, BarChart, PieChart)
- Icons: Lucide React only
- Tests: pytest, mocking via `unittest.mock.patch` on `jira_client` / `sync_tickets`
- Commit style: imperative mood, concise summary line

## Environment Variables (.env)

```
JIRA_API_TOKEN=   # Required
JIRA_EMAIL=       # Required
JIRA_BASE_URL=    # Required, e.g. https://your-org.atlassian.net
```

## Things to Watch Out For

- `atlassian-python-api` `jql()` is deprecated for Cloud — always use `enhanced_jql()`
- The `total` field in JIRA search responses returns 0 (unreliable) — rely on `isLast` for pagination
- Changing project key or ticket filter triggers a full re-sync; changing only mapping rules triggers `reprocess_cache()`
- Final statuses for dashboard display: Done, Rejected, Closed, Resolved, Cancelled
- `config.yaml` `ticket_filter.mode` accepts `last_x_months` or `missing_fields` (legacy `all` is treated as 12 months)
- RuleBuilder `color` prop accepts `indigo`, `emerald`, or `violet`
