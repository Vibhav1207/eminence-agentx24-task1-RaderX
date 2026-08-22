# RADARX REST API Documentation

This document describes the **RADARX Data & API Foundation** architecture.

---

## 🌐 Standard Response Format

All API endpoints return a standardized JSON envelope:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 10,
    "timestamp": "2026-08-22T12:00:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Strategic question is required",
    "details": { ... }
  }
}
```

---

## 📡 REST API Endpoints

### 1. Investigations API
- **`GET /api/investigations`**: Returns list of all investigations.
- **`POST /api/investigations`**: Creates a new investigation (Status: `QUEUED`).
- **`GET /api/investigations/:id`**: Returns investigation details by ID.
- **`PATCH /api/investigations/:id`**: Updates investigation properties.
- **`DELETE /api/investigations/:id`**: Deletes investigation by ID.
- **`GET /api/investigations/:id/evidence`**: Returns evidence array for investigation.
- **`GET /api/investigations/:id/signals`**: Returns detected signals array.
- **`GET /api/investigations/:id/entities`**: Returns correlated entities array.
- **`GET /api/investigations/:id/graph`**: Returns graph nodes and relationships.
- **`GET /api/investigations/:id/timeline`**: Returns chronological timeline events.
- **`GET /api/investigations/:id/recommendations`**: Returns actionable recommendations.

### 2. Agents API
- **`GET /api/agents`**: Returns list of 8 specialized sub-agents.
- **`GET /api/agents/:id`**: Returns agent status by ID.
- **`GET /api/agents/activity`**: Returns operational agent activity feed logs.

### 3. Watchlists API
- **`GET /api/watchlists`**: Returns list of active watchlists.
- **`POST /api/watchlists`**: Creates background watchlist monitor.
- **`GET /api/watchlists/:id`**: Returns watchlist details by ID.
- **`PATCH /api/watchlists/:id`**: Updates watchlist parameters.
- **`DELETE /api/watchlists/:id`**: Deletes watchlist monitor.

### 4. Alerts & Sources API
- **`GET /api/alerts`**: Returns unread and read intelligence alerts.
- **`PATCH /api/alerts/:id`**: Marks alert read/unread.
- **`GET /api/sources`**: Returns 6 active data connectors and health metrics.

---

## 🗄️ Database Schemas & Indexing

MongoDB Collections:
- **`investigations`**: `{ status: 1, createdAt: -1 }`
- **`evidence`**: `{ investigationId: 1, sourceType: 1, createdAt: -1 }`
- **`signals`**: `{ investigationId: 1, impact: 1, detectedAt: -1 }`
- **`agents`**: `{ status: 1, currentInvestigationId: 1 }`
- **`watchlists`**: `{ status: 1, updatedAt: -1 }`
- **`alerts`**: `{ watchlistId: 1, read: 1, createdAt: -1 }`

---

## 🚀 Running Local Database & Seeding

Environment Variables (`.env`):
```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=radarx_db
```
If MongoDB is offline or disconnected, RADARX automatically falls back to an in-memory seed dataset ("NVIDIA × Generative AI") in `src/lib/db/seedData.ts`.
