# Backend Development Skill - Agentic Mobile Map

## Project Context

Building an **intelligent errand routing system** backend that processes natural language requests, optimizes multi-stop routes, and delivers results in 1-2 conversational turns instead of 5-6 manual steps.

**Core Transformation**: "Take me home with Starbucks and Walmart on the way" -> Optimized route with waypoints

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL (main) + Redis (caching)
- **Queue**: Bull (async job processing)
- **External APIs**: Google Maps, Google Places, Gemini API (2.5 Pro + 3.0 Pro)
- **Deployment**: Docker + Kubernetes

## Gemini Dual-Agent Architecture

- **Gemini 2.5 Pro (Fast Agent)**: First-pass NLU, intent classification, entity extraction (~85% of requests)
- **Gemini 3.0 Pro (Advanced Agent)**: Complex disambiguation, multi-turn reasoning (~15% of requests)
- **Pipeline Strategy**: 2.5 Pro processes all requests first; escalates to 3.0 Pro when confidence < 0.60 or complexity detected

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── constants/
│   │   │   └── detour.constants.ts
│   │   ├── decorators/
│   │   ├── filters/
│   │   │   └── exception.filter.ts
│   │   └── types/
│   │       └── index.ts
│   ├── modules/
│   │   ├── errand/          # Main route planning logic
│   │   ├── gemini/          # Dual-agent NLU (2.5 Pro + 3.0 Pro)
│   │   ├── places/          # Place search & disambiguation
│   │   ├── user/            # User profiles & anchors
│   │   ├── maps/            # Google Maps integration
│   │   └── cache/           # Redis caching
│   ├── config/
│   ├── app.module.ts
│   └── main.ts
├── test/
├── docker-compose.yml
└── package.json
```

## Core Services

### 1. DetourBufferService
Calculates dynamic detour budget based on route distance.

```typescript
// Key logic
const DETOUR_CONFIG = {
  short: { maxDistanceM: 3219, percentage: 0.10 },   // <= 2 miles: 10%
  medium: { maxDistanceM: 16093, percentage: 0.07 }, // <= 10 miles: 7%
  long: { percentage: 0.05 }                          // > 10 miles: 5%
};

const ABSOLUTE_BOUNDS = {
  minBufferM: 400,   // 0.25 miles minimum
  maxBufferM: 1600   // 1 mile maximum
};

// Detour status enum
enum DetourStatus {
  NO_DETOUR = 'NO_DETOUR',           // 0-50m extra
  MINIMAL = 'MINIMAL',                // <= 25% of buffer
  ACCEPTABLE = 'ACCEPTABLE',          // 26-75% of buffer
  NOT_RECOMMENDED = 'NOT_RECOMMENDED' // > 75% of buffer
}
```

**Methods**:
- `calculateBuffer(distanceM: number): number`
- `getDetourStatus(extraDistanceM: number, bufferM: number): DetourStatus`
- `isWithinBudget(extraDistanceM: number, budgetM: number): boolean`

### 2. PlaceSearchService
Finds and ranks place candidates by relevance.

```typescript
// Ranking formula
score = (1 - distance_ratio * 0.5) + (rating / 5 * 0.3) + (popularity / 100 * 0.2)

// Ranking criteria
interface RankingCriteria {
  proximityToRoute: number;  // Distance to polyline
  rating: number;            // Google rating 1-5
  popularity: number;        // Review count
  openNow: boolean;          // Operating hours
}
```

**Methods**:
- `searchPlaces(query: string, location: Coordinates, radiusM: number): Promise<PlaceCandidate[]>`
- `rankCandidates(candidates: Place[], criteria: RankingCriteria): Place[]`
- `calculateRelevanceScore(place: Place, query: string, route?: RoutePolyline): number`
- `getPlaceDetails(googlePlacesId: string): Promise<PlaceDetails>`

### 3. OptimizationService (TSP Solver)
Optimizes stop ordering to minimize total distance.

**Algorithms**:
1. **Nearest Neighbor** (Phase 1): O(n^2), good for 2-4 stops
2. **2-opt Optimization**: Iterative improvement
3. **Google OR-Tools** (Production): Best for 10+ stops

**Methods**:
- `optimizeStopOrder(startLoc: Coordinates, endLoc: Coordinates, stops: Stop[]): OptimizationResult`
- `nearestNeighbor(locations: Coordinates[]): number[]`
- `calculateTotalDistance(locations: Coordinates[]): number`

### 4. ConfidenceRouterService
Routes requests based on NLU confidence level.

```typescript
// Three-tier system
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,    // Execute immediately
  MEDIUM: 0.60,  // Show confirmation dialog
  LOW: 0.00      // Offer alternatives
};

// Response types
type RoutingAction = 'EXECUTE' | 'CONFIRM' | 'CLARIFY' | 'ESCALATE_TO_LLM';
```

**Methods**:
- `routeByConfidence(nluResult: NLUResult): RoutingDecision`
- `shouldAskConfirmation(confidence: number): boolean`
- `shouldOfferAlternatives(confidence: number): boolean`
- `shouldEscalateToLLM(confidence: number, retryCount: number): boolean`

### 5. EntityResolverService
Converts natural language entities to concrete data.

**Resolution flow**:
1. Check saved anchors ("home" -> user's Home anchor)
2. Search places API (if not anchor)
3. Geocode address (if coordinates needed)

**Methods**:
- `resolveDestination(text: string, userId: string): Promise<ResolvedDestination>`
- `resolveStops(queries: string[], location: Coordinates, budget: number): Promise<ResolvedStop[]>`
- `matchAnchor(text: string, anchors: Anchor[]): Anchor | null`

### 6. ClaudeService (LLM Fallback)
Handles low-confidence NLU parsing.

```typescript
// Prompt structure
const systemPrompt = `You are a travel assistant NLU parser. Parse the user's request and extract:
  - destination (required): Where are they going?
  - stops (optional): What stops do they want?
  - radius_preference (optional): Distance preference?

Return JSON: { destination: string, stops: string[], radius_miles: number }`;
```

## API Endpoints

### Main Endpoint: POST /api/v1/errand/navigate-with-stops
```typescript
// Request
interface NavigateWithStopsRequest {
  start_location: { lat: number; lng: number };
  destination_text: string;
  stop_queries: string[];
  max_detour_m?: number;
  optimize: boolean;
  user_id: string;
}

// Response
interface NavigateWithStopsResponse {
  matched_stops: MatchedStop[];
  optimized_route: {
    sequence: string[];
    total_distance_m: number;
    total_time_min: number;
    stops_count: number;
    polyline: string;
    legs: RouteLeg[];
  };
  ready_to_navigate: boolean;
  confirmation_message: string;
}
```

### Suggestions: GET /api/v1/errand/suggest-stops-on-route
### Disambiguation: GET /api/v1/places/disambiguate
### User Anchors: GET /api/v1/user/anchors
### LLM Escalation: POST /api/escalate-to-llm

## Database Schema

### Tables
- **users**: id, email, phone, preferences (JSON), timestamps
- **anchors**: id, user_id, name, location (PostGIS), type, timestamps
- **places**: id, google_places_id, name, address, location, rating, opening_hours (JSON), cached_at, expires_at
- **routes**: id, user_id, start/end_location, stops (JSON), total_distance_m, total_time_min
- **conversation_history**: id, user_id, turn, user_message, intent, intent_confidence, entities (JSON), system_response

### Key Indexes
- users.email (unique)
- anchors.location (spatial - PostGIS)
- places.google_places_id (unique)
- places.location (spatial)
- places.expires_at (for cleanup)

## Caching Strategy (Redis)

| Data Type | TTL | Key Pattern |
|-----------|-----|-------------|
| Routes | 1 hour | `route:{origin}:{dest}:{waypoints_hash}` |
| Places | 7 days | `place:{google_places_id}` |
| Geocoding | 7 days | `geocode:{address_hash}` |
| Anchors | 30 days | `anchor:{user_id}` |
| Disambiguation | 14 days | `disamb:{query}:{location}` |

## Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    suggestions?: ActionSuggestion[];
    details?: Record<string, any>;
  };
}

// Error codes
type ErrorCode =
  | 'NO_RESULTS_FOUND'
  | 'ROUTE_EXCEEDS_BUDGET'
  | 'LOCATION_UNAVAILABLE'
  | 'DISAMBIGUATION_REQUIRED'
  | 'API_QUOTA_EXCEEDED';
```

### Fallback Strategies
- API quota exceeded -> Use cached data with freshness warning
- No results found -> Suggest expanding search radius
- Route too long -> Suggest removing stops or expanding budget

## Development Guidelines

### When implementing a new service:
1. Create module under `src/modules/{name}/`
2. Define DTOs in `dtos/` folder
3. Implement service with proper dependency injection
4. Add comprehensive error handling
5. Write unit tests with Jest
6. Cache API responses where appropriate

### When adding an endpoint:
1. Define request/response DTOs with class-validator
2. Implement controller method
3. Add proper authentication guards
4. Document with Swagger decorators
5. Add integration tests with Supertest

### Testing Requirements
- Unit tests: All services (DetourBuffer, PlaceSearch, Optimization, etc.)
- Integration tests: All API endpoints
- Target: 80%+ code coverage
- Framework: Jest + Supertest

## Performance Targets

- Response time: < 2 seconds
- Handle 1000 requests/hour
- 95% cache hit rate for repeated routes
- 90%+ routes fit within budget on first try

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost/errand_db
REDIS_URL=redis://localhost:6379
GOOGLE_MAPS_API_KEY=...
GOOGLE_PLACES_API_KEY=...
RASA_NLU_URL=http://rasa:5005
CLAUDE_API_KEY=...
NODE_ENV=production
```
