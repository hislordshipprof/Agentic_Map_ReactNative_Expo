# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Agentic Mobile Map** project focused on building an intelligent errand routing system. The system allows users to plan multi-stop journeys efficiently using natural language in 1-2 conversational turns instead of the current 5-6 manual steps.

### Key Concept
Transform: "Set anchor → Set radius → Find stop → Select stop → Find another stop → Select stop → Optimize → Navigate"
Into: "Take me home with Starbucks and Walmart on the way"

## Architecture

### Backend (NestJS + TypeScript)
- **Database**: PostgreSQL (main data) + Redis (caching)
- **External APIs**: Google Maps, Google Places, Gemini API (2.5 Pro + 3.0 Pro)
- **Queue**: Bull (async job processing)

#### Gemini Dual-Agent Architecture
- **Gemini 2.5 Pro (Fast Agent)**: First-pass NLU, intent classification, entity extraction (~85% of requests)
- **Gemini 3.0 Pro (Advanced Agent)**: Complex disambiguation, multi-turn reasoning (~15% of requests)
- **Pipeline Strategy**: 2.5 Pro processes all requests; escalates to 3.0 Pro when confidence < 0.60

#### Key Services
- **DetourBufferService**: Calculates dynamic detour budget (5-10% of route length)
- **PlaceSearchService**: Finds and ranks place candidates by relevance
- **OptimizationService**: TSP solver for optimal stop ordering
- **AgentRouterService**: Routes between Gemini 2.5 Pro and 3.0 Pro based on confidence
- **GeminiFastService**: Fast intent/entity extraction using Gemini 2.5 Pro
- **GeminiAdvancedService**: Complex reasoning using Gemini 3.0 Pro
- **EntityResolverService**: Resolves "home" → saved anchor, "Starbucks" → place match

#### Core API Endpoints
- `POST /api/v1/errand/navigate-with-stops` - Main route planning endpoint
- `GET /api/v1/errand/suggest-stops-on-route` - Proactive route suggestions
- `GET /api/v1/places/disambiguate` - Handle ambiguous destinations
- `GET /api/v1/user/anchors` - User's saved locations

### Frontend (React Native + Redux)
- **State Management**: Redux with slices for conversation, route, NLU, UI, user, offline
- **Maps**: Google Maps SDK for route visualization
- **Offline**: SQLite (mobile) / IndexedDB (web) for caching

#### Key Components
- **ConversationUI**: Chat-like interface for user interactions
- **ConfidenceRouting**: Different UI flows based on NLU confidence
- **DisambiguationDialog**: Handle multiple place options
- **RouteConfirmation**: Visual route preview before navigation
- **AdjustmentMode**: Modify stops after initial optimization

### Three-Tier Confidence System
1. **HIGH (≥0.80)**: Execute immediately, show results (Gemini 2.5 Pro)
2. **MEDIUM (0.60-0.79)**: Show confirmation dialog (Gemini 2.5 Pro)
3. **LOW (<0.60)**: Escalate to Gemini 3.0 Pro for advanced reasoning, then offer alternatives if still unclear

## Development Commands

This is currently a documentation-only project. The actual implementation would require:

### Backend Setup
```bash
# Would use these commands when implementing:
npm install
npm run start:dev
npm run test
npm run build
```

### Frontend Setup
```bash
# Would use these commands when implementing:
npm install
npx react-native start
npx react-native run-ios
npx react-native run-android
npm test
```

### Database
```bash
# Would use these commands when implementing:
npm run migration:generate
npm run migration:run
npm run seed
```

## Key Business Logic

### Dynamic Detour Buffer Calculation
- Short routes (≤2 miles): 10% max detour
- Medium routes (2-10 miles): 7% max detour
- Long routes (>10 miles): 5% max detour
- Absolute bounds: 400m minimum, 1600m maximum

### Stop Status Classification
- **NO_DETOUR** (0-50m extra): Always include
- **MINIMAL** (≤25% of buffer): Include
- **ACCEPTABLE** (26-75% of buffer): Optional
- **NOT_RECOMMENDED** (>75% of buffer): Exclude

### Optimization Algorithm
Uses TSP (Traveling Salesman Problem) solving:
1. Nearest Neighbor (fast, good for 2-4 stops)
2. 2-opt optimization (better quality)
3. Google OR-Tools (production recommendation for 10+ stops)

## Data Flow

1. User input → Frontend conversation UI
2. NLU confidence check → Route to appropriate UI flow
3. Backend processes: entity resolution → place search → optimization → detour validation
4. Frontend displays: route confirmation with map visualization
5. User accepts → Navigation starts

## Error Handling Strategy

### Backend Errors
- No places found → Suggest expanding search radius
- Route exceeds budget → Show which stops to remove/adjust
- API rate limits → Fall back to cached data
- Ambiguous destinations → Return disambiguation candidates

### Frontend Errors
- Network failure → Switch to offline mode with cached data
- Location unavailable → Prompt user to enable location services
- Low confidence utterances → Escalate to Gemini 3.0 Pro, then show alternatives if needed

## Caching Strategy

### Cache Durations
- Routes: 1 hour (traffic changes)
- Places: 7 days (details stable)
- Anchors: 30 days (user locations)
- Disambiguation results: 14 days

### Offline Support
- Cache top 20 popular stops near each saved anchor
- Store last 10 routes for offline access
- Sync when network returns with non-blocking updates

## Implementation Phases

1. **Foundation** (Weeks 1-2): Core services, database, Gemini 2.5 Pro integration
2. **Smart Routing** (Weeks 3-4): Place search, optimization, agent routing
3. **Refinement** (Weeks 5-6): Error handling, offline support, Gemini 3.0 Pro integration
4. **Polish** (Weeks 7+): Testing, performance optimization, launch preparation

## Success Metrics

- 95% of routes fit within distance budget without user adjustment
- 90% correct destination disambiguation on first try
- <2 second response time for route suggestions
- 85% accuracy on "best" stop selection
- Offline functionality with cached data

## Important Notes

- This is currently a **documentation and planning project**
- No actual code implementation exists yet
- All files are specification and requirement documents
- Focus on understanding the system design before implementation
- The system emphasizes user experience over technical complexity
- Natural language understanding is core to the user interaction model

## Files Structure

- `docs/overview.md` - Complete system overview and user journey
- `docs/requirements-backend.md` - Detailed backend implementation requirements
- `docs/requirements-frontend.md` - Detailed frontend implementation requirements
- `docs/reading-guide.md` - Guide for navigating the documentation
- `docs/systemPrompt.md` - Development workflow and atomic chunking rules
- `frontend/` - React Native (Expo) application
- `backend/` - NestJS API server
- `.claude/skills/` - Claude Code skills for frontend and backend development
- `IMPLEMENTATION_PLAN.md` - Comprehensive implementation plan

When implementing, start with Phase 1 foundation work and ensure all core services are properly tested before moving to advanced features.