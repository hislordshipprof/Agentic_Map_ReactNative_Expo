# Agentic Mobile Map

**Transform 5-6 manual steps into 1-2 conversational turns**

An intelligent errand routing system powered by dual AI agents that understands natural language and autonomously optimizes multi-stop journeys.

---

## The Problem

Traditional errand routing apps require a tedious manual process:

1. Set your anchor point (home/work)
2. Define search radius
3. Search for first stop
4. Select from options
5. Search for second stop
6. Select from options
7. Manually optimize route
8. Finally navigate

This 5-6 step process is frustrating and time-consuming.

## The Agent-Powered Solution

Simply say: **"Take me home via Starbucks and Walmart"**

Our dual-agent architecture does the rest:

- **Natural Language Understanding**: Parse complex requests in one utterance
- **Autonomous Entity Resolution**: Resolve "home" to your saved location, find the best Starbucks and Walmart on your route
- **Smart Route Optimization**: Automatically order stops to minimize detours
- **Dynamic Detour Budget**: Calculate acceptable detour distance based on route length
- **Confidence-Based UI**: Different flows for high/medium/low confidence results

### Dual-Agent Architecture

- **Gemini 2.5 Pro (Fast Agent)**: Handles 85% of requests with quick intent classification and entity extraction
- **Gemini 3.0 Pro (Advanced Agent)**: Handles complex disambiguation and multi-turn reasoning for the remaining 15%
- **Intelligent Routing**: Automatically escalates to advanced agent when confidence drops below 0.60

---

## Tech Stack

### Frontend
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit
- **Language**: TypeScript
- **Maps**: Google Maps SDK
- **Offline Storage**: SQLite (mobile) / IndexedDB (web)

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL (main data) + Redis (caching)
- **Queue**: Bull (async job processing)
- **Language**: TypeScript

### AI & APIs
- **AI Agents**: Gemini 2.5 Pro (fast) + Gemini 3.0 Pro (advanced)
- **Maps**: Google Maps API
- **Places**: Google Places API

---

## Key Features (Planned)

### Conversational Interface
- Chat-like UI for natural language input
- Three-tier confidence system (HIGH/MEDIUM/LOW)
- Context-aware responses

### Intelligent Routing
- Dynamic detour budget calculation (5-10% of route length)
- Stop status classification (NO_DETOUR, MINIMAL, ACCEPTABLE, NOT_RECOMMENDED)
- TSP-based route optimization

### Smart Place Search
- Relevance-based ranking
- Automatic disambiguation
- Proactive route suggestions

### Offline Support
- Cache top 20 popular stops near saved anchors
- Store last 10 routes
- Non-blocking background sync

### Route Adjustment
- Visual route preview with map
- Drag-and-drop stop reordering
- Add/remove stops after optimization

---

## Project Status

**Current Phase**: Initial Development

- âœ… Project structure and architecture design
- âœ… Frontend foundation with Expo and Redux
- â³ Backend API development (NestJS)
- â³ Gemini agent integration
- â³ Google Maps/Places integration
- â³ UI component development

---

## Example Flow

`
User: "Take me home but stop at Chick-fil-A and Walmart on the way"

App: "Perfect! Both are on your way with minimal detour.
     
     Route:
     â€¢ Current Location
     â€¢ Chick-fil-A (2.1 miles, +0.3 mi detour)
     â€¢ Walmart (7.8 miles, no extra distance)
     â€¢ Home (10.2 miles total)
     
     Estimated time: 18 minutes
     Ready to navigate?"

User: "Yes"

[Opens navigation with all waypoints set]
`

---

## Success Metrics

- **95%** of routes fit within distance budget without user adjustment
- **90%** correct destination disambiguation on first try
- **<2 seconds** response time for route suggestions
- **85%** accuracy on "best" stop selection
- Full offline functionality with cached data

---

## Architecture Highlights

### Three-Tier Confidence System

1. **HIGH (â‰¥0.80)**: Execute immediately, show results
2. **MEDIUM (0.60-0.79)**: Show confirmation dialog
3. **LOW (<0.60)**: Escalate to Gemini 3.0 Pro, offer alternatives

### Detour Budget Algorithm

- **Short routes (â‰¤2 miles)**: 10% max detour
- **Medium routes (2-10 miles)**: 7% max detour
- **Long routes (>10 miles)**: 5% max detour
- **Absolute bounds**: 400m minimum, 1600m maximum

### Caching Strategy

- Routes: 1 hour (traffic changes frequently)
- Places: 7 days (details relatively stable)
- Anchors: 30 days (user locations rarely change)
- Disambiguation: 14 days

---

## Development

### Frontend Setup

`ash
cd frontend
npm install
npm start
`

### Backend Setup (Coming Soon)

`ash
cd backend
npm install
npm run start:dev
`

---

## License

MIT License - see LICENSE file for details

---

## What Makes This Different?

Most map apps make you do the work. We use AI agents to:

- **Understand context**: "on the way" means we calculate detour budgets automatically
- **Resolve ambiguity**: Multiple Starbucks? We pick the one that makes sense for your route
- **Optimize autonomously**: No manual "add stop" â†’ "optimize" â†’ "check again" loops
- **Learn preferences**: Your frequent stops become suggestions

The goal: **Natural conversation, not manual configuration.**
