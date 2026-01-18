# Agentic Mobile Map - Comprehensive Implementation Plan

## Executive Summary

This plan outlines the implementation of an intelligent errand routing system that transforms multi-stop journey planning from 5-6 manual steps to 1-2 conversational turns. The system consists of a React Native (Expo) frontend and NestJS backend.

---

## 1. Project Structure Setup

### 1.1 Root Directory Structure

```
Agentic_Mobile_Map/
├── frontend/                    # React Native + Expo application
├── backend/                     # NestJS API server
├── shared/                      # Shared TypeScript types/interfaces
├── docs/                        # Project documentation
├── .github/                     # GitHub Actions workflows
├── docker-compose.yml           # Development orchestration
├── .env.example                 # Environment variable template
├── README.md                    # Project overview
└── CLAUDE.md                    # Claude Code instructions
```

### 1.2 Frontend Directory Structure (React Native + Expo + TypeScript)

```
frontend/
├── app/                          # Expo Router app directory
│   ├── (tabs)/
│   │   ├── index.tsx             # Conversation screen (main)
│   │   ├── route.tsx             # Route confirmation screen
│   │   └── _layout.tsx           # Tab layout
│   ├── navigation/
│   │   └── index.tsx
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── Conversation/
│   │   │   ├── ConversationBubble.tsx
│   │   │   ├── SystemResponseBubble.tsx
│   │   │   ├── ConversationHistory.tsx
│   │   │   ├── ConversationContainer.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── UserInputField.tsx
│   │   │   ├── SendButton.tsx
│   │   │   └── index.ts
│   │   ├── Dialogs/
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   ├── DisambiguationDialog.tsx
│   │   │   ├── AlternativesDialog.tsx
│   │   │   ├── ErrorDialog.tsx
│   │   │   └── index.ts
│   │   ├── Route/
│   │   │   ├── RouteConfirmationScreen.tsx
│   │   │   ├── RouteMap.tsx
│   │   │   ├── RouteDetails.tsx
│   │   │   ├── StopList.tsx
│   │   │   ├── StopCard.tsx
│   │   │   └── index.ts
│   │   ├── Adjustment/
│   │   │   ├── AdjustmentMode.tsx
│   │   │   ├── DraggableStopList.tsx
│   │   │   ├── AddStopForm.tsx
│   │   │   └── index.ts
│   │   └── Common/
│   │       ├── LoadingIndicator.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── OfflineBanner.tsx
│   │       ├── ActionButton.tsx
│   │       └── index.ts
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── conversationSlice.ts
│   │   │   ├── routeSlice.ts
│   │   │   ├── nluSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── offlineSlice.ts
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── errand.ts
│   │   │   ├── places.ts
│   │   │   ├── user.ts
│   │   │   └── index.ts
│   │   ├── cache/
│   │   │   ├── sqlite.ts
│   │   │   ├── manager.ts
│   │   │   └── index.ts
│   │   ├── maps/
│   │   │   ├── google-maps.ts
│   │   │   ├── polyline.ts
│   │   │   └── index.ts
│   │   ├── location/
│   │   │   ├── geolocation.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useConversation.ts
│   │   ├── useRoute.ts
│   │   ├── useOfflineSync.ts
│   │   ├── useNLUFlow.ts
│   │   ├── useLocation.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── conversation.ts
│   │   ├── route.ts
│   │   ├── nlu.ts
│   │   ├── user.ts
│   │   ├── api.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── confidence.ts
│   │   ├── cache.ts
│   │   ├── colors.ts
│   │   └── index.ts
│   └── utils/
│       ├── formatters.ts
│       ├── validators.ts
│       └── index.ts
├── assets/
├── __tests__/
├── app.json
├── babel.config.js
├── tsconfig.json
├── package.json
├── eas.json
└── .env.example
```

### 1.3 Backend Directory Structure (NestJS + TypeScript)

```
backend/
├── src/
│   ├── common/
│   │   ├── constants/
│   │   │   ├── detour.constants.ts
│   │   │   ├── confidence.constants.ts
│   │   │   └── cache.constants.ts
│   │   ├── decorators/
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── types/
│   │       ├── coordinates.ts
│   │       ├── detour-status.ts
│   │       ├── routing-decision.ts
│   │       └── index.ts
│   ├── modules/
│   │   ├── errand/
│   │   │   ├── controllers/
│   │   │   │   └── errand.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── errand.service.ts
│   │   │   │   ├── detour-buffer.service.ts
│   │   │   │   └── route-builder.service.ts
│   │   │   ├── dtos/
│   │   │   │   ├── navigate-with-stops.dto.ts
│   │   │   │   ├── suggest-stops.dto.ts
│   │   │   │   └── route-response.dto.ts
│   │   │   └── errand.module.ts
│   │   ├── optimization/
│   │   │   ├── services/
│   │   │   │   ├── optimization.service.ts
│   │   │   │   ├── tsp-solver.service.ts
│   │   │   │   └── nearest-neighbor.service.ts
│   │   │   └── optimization.module.ts
│   │   ├── places/
│   │   │   ├── controllers/
│   │   │   │   └── places.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── google-places.service.ts
│   │   │   │   ├── place-search.service.ts
│   │   │   │   ├── place-ranking.service.ts
│   │   │   │   ├── disambiguation.service.ts
│   │   │   │   └── place-cache.service.ts
│   │   │   ├── entities/
│   │   │   │   └── place.entity.ts
│   │   │   ├── dtos/
│   │   │   └── places.module.ts
│   │   ├── nlu/
│   │   │   ├── controllers/
│   │   │   │   └── nlu.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── nlu.service.ts
│   │   │   │   ├── rasa.service.ts
│   │   │   │   ├── confidence-router.service.ts
│   │   │   │   └── entity-resolver.service.ts
│   │   │   ├── dtos/
│   │   │   └── nlu.module.ts
│   │   ├── maps/
│   │   │   ├── services/
│   │   │   │   ├── google-maps.service.ts
│   │   │   │   ├── routing.service.ts
│   │   │   │   ├── polyline.service.ts
│   │   │   │   └── geocoding.service.ts
│   │   │   └── maps.module.ts
│   │   ├── user/
│   │   │   ├── controllers/
│   │   │   │   └── user.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── user.service.ts
│   │   │   │   └── anchor.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── anchor.entity.ts
│   │   │   ├── dtos/
│   │   │   └── user.module.ts
│   │   ├── llm/
│   │   │   ├── services/
│   │   │   │   └── claude.service.ts
│   │   │   ├── dtos/
│   │   │   └── llm.module.ts
│   │   ├── cache/
│   │   │   ├── services/
│   │   │   │   └── redis-cache.service.ts
│   │   │   └── cache.module.ts
│   │   └── queue/
│   │       ├── processors/
│   │       └── queue.module.ts
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── database.module.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── google.config.ts
│   │   ├── claude.config.ts
│   │   └── env.validation.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── jest.config.ts
├── prisma/
│   └── schema.prisma
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── nest-cli.json
├── package.json
└── .env.example
```

---

## 2. Implementation Phases

### Frontend Phases

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Foundation: Redux store, core components | Week 1-2 |
| 2 | Conversation UI and NLU confidence flows | Week 2-3 |
| 3 | Route display and map integration | Week 3-4 |
| 4 | Offline support | Week 4-5 |
| 5 | Polish and testing | Week 5-6 |

### Backend Phases

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Foundation: modules, database schema | Week 1-2 |
| 2 | Core services: DetourBuffer, PlaceSearch, Optimization | Week 2-3 |
| 3 | NLU and confidence routing | Week 3-4 |
| 4 | Caching and performance | Week 4-5 |
| 5 | Error handling and testing | Week 5-6 |

---

## 3. Agent Delegation Strategy

### Parallelizable Tasks

| Frontend Agent | Backend Agent |
|---------------|---------------|
| Redux store setup | NestJS project setup |
| UI components | Database schema + migrations |
| Styling and theming | Core services |
| Offline cache | Redis caching layer |
| Map integration | Google Maps/Places integration |

### Dependencies (Backend must complete first)

1. **API Contract Definition** -> Frontend API services
2. **Error Response Format** -> Frontend error handling
3. **NLU Response Format** -> Confidence flow logic

### Skill Usage

- **frontend-design**: Conversation UI, dialogs, route confirmation
- **react-best-practices**: Redux, hooks, performance
- **backend-development**: NestJS, services, database
- **feature-dev**: End-to-end feature coordination

---

## 4. Critical Path

```
Week 1:
  Backend: Project setup + Database schema + DetourBufferService
  Frontend: Project setup + Redux store + Conversation components

Week 2:
  Backend: PlaceSearchService + OptimizationService + Main endpoint
  Frontend: API client + NLU flow hook + Dialog components

Week 3:
  Backend: ConfidenceRouterService + EntityResolverService
  Frontend: Confidence-based UI flows + Disambiguation

Week 4:
  Backend: ClaudeService + Redis caching + Error handling
  Frontend: Route confirmation + Map integration

Week 5:
  Backend: Queue setup + Performance + Testing
  Frontend: Offline support + Adjustment mode + Testing

Week 6:
  Both: Integration testing + Bug fixes + Polish
```

---

## 5. MVP Scope

### Must Have (4 weeks)
- POST /api/v1/errand/navigate-with-stops
- Conversation UI with message display
- HIGH confidence flow (execute immediately)
- Basic route optimization (nearest neighbor)
- Route confirmation with map

### Can Defer
- MEDIUM/LOW confidence flows
- Claude LLM fallback
- Offline support
- Adjustment mode
- Advanced optimization (2-opt, OR-Tools)

---

## 6. Key Configuration Values

### Confidence Thresholds
- HIGH: >= 0.80 (execute immediately)
- MEDIUM: 0.60-0.79 (show confirmation)
- LOW: < 0.60 (offer alternatives)

### Detour Buffer Percentages
- Short routes (<=2 miles): 10%
- Medium routes (2-10 miles): 7%
- Long routes (>10 miles): 5%
- Absolute min: 400m, max: 1600m

### Detour Status
- NO_DETOUR: 0-50m extra
- MINIMAL: <= 25% of buffer
- ACCEPTABLE: 26-75% of buffer
- NOT_RECOMMENDED: > 75% of buffer

### Cache TTL
- Routes: 1 hour
- Places: 7 days
- Geocoding: 7 days
- Anchors: 30 days
- Disambiguation: 14 days

---

## 7. Critical Files

1. `backend/src/modules/errand/services/detour-buffer.service.ts`
2. `backend/src/modules/errand/controllers/errand.controller.ts`
3. `frontend/src/redux/slices/conversationSlice.ts`
4. `frontend/src/hooks/useNLUFlow.ts`
5. `backend/src/modules/nlu/services/confidence-router.service.ts`
