# RADARX — Autonomous Multi-Agent Intelligence Platform

## Tagline
**AUTONOMOUS INTELLIGENCE FOR ORGANIZATIONS, STARTUPS, AND RESEARCH TEAMS**

---

## Architecture Overview

RADARX is an autonomous multi-agent intelligence platform designed to answer strategic questions with 100% evidence-backed, cross-source correlated intelligence.

```
USER STRATEGIC OBJECTIVE
          ↓
RADARX MASTER ORCHESTRATOR
          ↓
MISSION PLANNER & TASK DECOMPOSITION QUEUE
          ↓
SPECIALIZED INTELLIGENCE AGENTS
  ├── Research Agent (Crossref DOIs & arXiv)
  ├── Patent Agent (USPTO & Patent Index)
  ├── News Agent (Global News Syndicate)
  ├── Competitor Agent (SEC Disclosures & Corporate Moves)
  └── Web Intelligence Agent (Public Repositories & Tech Web)
          ↓
PROVENANCE EVIDENCE STORE
          ↓
CROSS-SOURCE CORRELATION & SIGNAL ENGINE
          ↓
AI SYNTHESIS ENGINE (Google Gemini API)
          ↓
UNIFIED EXECUTIVE BRIEF & 24/7 BACKGROUND WATCHLISTS
```

---

## Key Features

1. **Autonomous Master Orchestrator**:
   - Accepts a single strategic question and dynamically decomposes execution into an adaptive task dependency tree.
   - Evaluates intermediate evidence and generates follow-up tasks (e.g., deep-dive patent audits).

2. **100% Real External Source Providers (Zero Fake Fallbacks)**:
   - **Crossref REST Provider**: Live academic DOIs with polite mailto headers.
   - **USPTO Patent Provider**: Live patent filings index.
   - **Global News Syndicate Provider**: Live tech and financial news feeds with XML parsing and deduplication.
   - **Web Intelligence Provider**: Live web and repository data.
   - Surfaces `DEGRADED` or `OFFLINE` status honestly if an external source fails.

3. **Cross-Source Correlation Engine**:
   - Deduplicates syndicated news clusters.
   - Extracts multi-source technical and strategic themes.
   - Calculates source diversity scores and evidence strength.

4. **Structured AI Synthesis Engine**:
   - Generates executive briefs, findings, threats, opportunities, recommendations, and source coverage metrics powered by Google Gemini API.
   - **100% Citation Traceability**: Every claim links back to verified evidence items.

5. **24/7 Autonomous Watchlists**:
   - Converts investigation findings into continuous background monitoring.

---

## Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, Serverless API Routes)
- **UI / Styling**: React 19, Vanilla CSS Glassmorphism, Framer Motion, Lucide Icons
- **Database**: MongoDB & Memory Repository
- **AI / LLM**: Google Gemini REST API (`gemini-2.5-flash` / `gemini-2.0-flash` / `gemini-1.5-pro`)
- **Language**: TypeScript

---

## Configuration & Environment Setup

Create `.env` or `.env.local` in the root directory:

```env
# Application Mode: 'production' (100% real data) or 'demo' (optional seed dataset)
APP_MODE=production

# Database Configuration
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=radarx

# Crossref REST API Contact Header
CROSSREF_MAILTO=research@radarx.ai

# Google Gemini LLM API Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

---

## Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view RADARX.

### 3. Production Build & Typecheck
```bash
npm run build
```
Runs Next.js production compilation and TypeScript verification across all 22 static and dynamic routes.

---

## Project Structure

- `src/app`: Application page routes & REST API endpoints
- `src/components`: UI design system, cards, indicators, overlays, layout shells
- `src/lib/orchestrator`: Master Orchestrator, mission planner, adaptive evaluator, task runner, Gemini LLM provider
- `src/lib/providers`: Live external REST data providers (Crossref, Patent, News, Web)
- `src/lib/intelligence`: Event clusterer, theme detector, correlation engine, signal engine, synthesis engine
- `src/lib/db`: Database repository & seed data
