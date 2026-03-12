# 📄 Software Design Document: Uplift Forge

**Version**: 2.1  
**Status**: Production-Ready  
**Date**: March 2026  

---

## 1. 🌟 System Overview
Uplift Forge is a local-first engineering performance platform that transforms JIRA ticket data and changelogs into persona-specific metrics. It operates as an Electron desktop application, ensuring data privacy by performing all computations locally and storing credentials in the OS secure keychain.

### 🎯 Core Objectives
- **Persona-Driven Insights**: Tailored dashboards for EMs, DMs, ICs, and Management.
- **Privacy First**: No central server; all data resides on the user's machine.
- **Precision Flow Metrics**: Calendar-time based analysis via a custom Timeline Engine.
- **AI-Powered Mitigation**: Actionable suggestions via LLM integration (OpenAI/Claude).

---

## 2. 🏗️ Architecture Design

### 🔄 Data Flow Architecture
1. **Extraction**: JIRA REST API v3 fetches issues with full changelogs.
2. **Ingestion**: `ticket.service.ts` processes raw JSON into `ProcessedTicket` objects.
3. **Computation**: `timeline.service.ts` (The Engine) reconstructs the status history.
4. **Persona Layers**: Metric services (`em-metrics`, `dm-metrics`, etc.) aggregate data for specific roles.
5. **Presentation**: React renderer displays dashboards via context-isolated IPC.

### 🧩 Component Breakdown

#### 🖥️ Main Process (Core Logic)
- **`timeline.service.ts`**: The system heartbeat. Parses JIRA histories to compute cycle time, lead time, rework, and flow efficiency.
- **`ticket.service.ts`**: Handles per-project caching, deduplication, and sync state.
- **`jira.service.ts`**: Optimized JQL fetching with automatic pagination and error handling.
- **`demo.service.ts` & `demo-data.service.ts`**: High-fidelity mock data generator for exploration.

#### 🎨 Renderer Process (UI/UX)
- **`App.tsx`**: Central router with strict persona-based isolation guards.
- **`MetricCard.tsx`**: Standardized KPI component with integrated explainability and AI triggers.
- **`SuggestionPanel.tsx`**: Unified interface for LLM-powered performance suggestions.

---

## 3. 📊 Data Model

### 🎫 ProcessedTicket (Shared Interface)
```typescript
interface ProcessedTicket {
  key: string;
  project_key: string;
  summary: string;
  status: string;
  story_points: number | null;
  issue_type: string;
  created: string | null;
  resolved: string | null;
  assignee_id: string | null;
  sprint_id: string | null;
  components: string[];
}
```

### 🕐 TicketTimeline
- **`StatusPeriod[]`**: Every state transition with entry/exit timestamps.
- **`cycleTimeHours`**: Calendar hours from first activity to completion.
- **`flowEfficiency`**: Ratio of active work time to total lead time.
- **`reworkCount`**: Detection of backward status transitions.

---

## 4. 📡 API & IPC Design

### 🔒 Security Model
- **Credential Isolation**: API keys (JIRA/AI) are encrypted using `safeStorage` and NEVER exposed to the renderer.
- **Persona Guards**: Main process handlers verify `AppConfig.persona` before returning sensitive data.
- **Local Storage**: `electron-store` used for configuration and ticket caches.

### 📡 Core IPC Channels
| Channel | Direction | Description |
|---------|-----------|-------------|
| `METRICS_CTO_ORG` | R → M | Returns aggregated health radar for Management persona. |
| `AI_SUGGEST` | R → M | Dispatches metric context to LLM and returns suggestions. |
| `SYNC_ALL_PROJECTS` | R → M | Triggers sequential sync for all configured projects. |

---

## 5. 🎭 Persona System Specification

| Persona | Primary View | Metric Focus |
|---------|--------------|--------------|
| `engineering_manager` | Team Dashboard | Throughput, Contribution Spread, SP Accuracy |
| `delivery_manager` | Flow Dashboard | CFD, Monte Carlo, WIP Aging, Blocker Analysis |
| `individual` | Personal Dash | Rework Trend, Goal Progress, Focus Score |
| `management` | Org Radar | Cross-project Throughput, Bug Escape, Tech Debt |

---

## 🧪 Testing & Validation

### 🔬 Quality Thresholds
- **Unit Tests**: 408 tests across 30 suites (Vitest).
- **Coverage**: 90% Statements, 80% Branches, 85% Functions, 90% Lines.
- **E2E**: 54 Playwright scenarios exercising the full IPC chain.

### 🎲 Demo Mode
The `Enhanced Demo Mode` generates 200+ tickets with realistic SP-calibrated durations, ensuring 100% SP accuracy benchmarks and realistic rework/blocker distribution.

---

## 📐 Conventions
- **Precision**: All numeric metrics displayed with 2 decimal places.
- **Formatting**: Tailwind CSS 4 for layout; Lucide for iconography.
- **Workflow**: Plan → Act → Validate cycle for all architectural changes.

---
*Uplift Forge SDD - Documentation Version 2.1* 🚀✨
