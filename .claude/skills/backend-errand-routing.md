# Backend Development Skill - Agentic Mobile Map

## Project Context

Building an **intelligent errand routing system** backend with **dual input support** (voice streaming + REST API) that processes natural language requests and returns optimized multi-stop routes.

**Core Flow**: Voice/Text input → NLU → Route Planning (best-first algorithm) → Response

## Tech Stack

- **Framework**: NestJS with TypeScript
- **Real-Time**: `@nestjs/websockets` + `socket.io` (voice streaming)
- **AI/NLU**: Gemini 2.5 Flash + Gemini 3.0 Pro
- **Voice**: Google Cloud Speech-to-Text + Text-to-Speech
- **Maps**: Google Maps Routes API + Places API
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis
- **Queue**: Bull (async jobs)

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── voice/                # NEW: Voice streaming
│   │   │   ├── voice.module.ts
│   │   │   ├── voice.gateway.ts  # WebSocket handler
│   │   │   ├── audio.service.ts  # Pipeline orchestration
│   │   │   ├── vad.service.ts    # Voice Activity Detection
│   │   │   ├── stt.service.ts    # Google STT wrapper
│   │   │   └── tts.service.ts    # Google TTS wrapper
│   │   ├── errand/               # Route planning (UPDATED)
│   │   │   ├── errand.service.ts
│   │   │   ├── route-builder.service.ts
│   │   │   └── services/
│   │   │       ├── detour-buffer.service.ts
│   │   │       ├── optimization.service.ts
│   │   │       └── entity-resolver.service.ts
│   │   ├── nlu/                  # NLU processing
│   │   │   ├── gemini-fast.service.ts
│   │   │   ├── gemini-advanced.service.ts
│   │   │   └── confidence-router.service.ts
│   │   ├── places/               # Place search
│   │   ├── maps/                 # Google Maps
│   │   ├── user/                 # User & anchors
│   │   └── cache/                # Redis caching
│   ├── config/
│   ├── common/
│   ├── app.module.ts
│   └── main.ts
└── package.json
```

---

## Voice Gateway (NEW)

### WebSocket Protocol

**Namespace**: `/voice`
**Connection**: `wss://api.domain.com/voice`

### Client → Server Messages

```typescript
// Authentication
{ type: 'auth', token: string }

// Audio input (base64 PCM, 100ms chunks)
{ type: 'audio_input', payload: string }

// User interrupts TTS
{ type: 'interrupt' }

// User confirms route
{ type: 'confirm', routeId: string }

// User's location update
{ type: 'location', lat: number, lng: number }
```

### Server → Client Messages

```typescript
// Connection established
{ type: 'ready', status: 'CONNECTED' }

// Live transcript (partial and final)
{ type: 'transcript', text: string, isFinal: boolean }

// State change notification
{ type: 'status', state: 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'CONFIRMING' }

// TTS audio chunk (base64)
{ type: 'audio_out', payload: string }

// Route data (JSON)
{ type: 'route_data', payload: RouteResult }

// Need clarification
{ type: 'clarification', message: string, alternatives?: Alternative[] }

// Error
{ type: 'error', code: string, message: string }
```

### Voice Gateway Implementation

```typescript
@WebSocketGateway({ namespace: '/voice', cors: { origin: '*' } })
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  @SubscribeMessage('auth')
  handleAuth(client: Socket, payload: { token: string }) { ... }

  @SubscribeMessage('audio_input')
  handleAudioInput(client: Socket, payload: { payload: string }) { ... }

  @SubscribeMessage('interrupt')
  handleInterrupt(client: Socket) { ... }

  @SubscribeMessage('confirm')
  handleConfirm(client: Socket, payload: { routeId: string }) { ... }
}
```

---

## Audio Pipeline Service

### Flow

```
Audio Chunks → VAD → STT → NLU → Route Planning → TTS → Stream Back
```

### VAD (Voice Activity Detection)

```typescript
// Detect when user stops speaking
const VAD_CONFIG = {
  silenceThresholdMs: 700,    // Commit after 700ms silence
  minSpeechMs: 200,           // Ignore very short sounds
};

// VAD returns
interface VADResult {
  isSpeech: boolean;
  silenceDurationMs: number;
}
```

### STT (Speech-to-Text)

```typescript
// Google Cloud Speech-to-Text streaming
const sttConfig = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  enableAutomaticPunctuation: true,
  model: 'latest_short',
};

// Returns partial and final transcripts
interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}
```

### TTS (Text-to-Speech)

```typescript
// Google Cloud TTS streaming
const ttsConfig = {
  languageCode: 'en-US',
  name: 'en-US-Neural2-J',  // Natural voice
  speakingRate: 1.1,         // Slightly faster
};

// Stream audio chunks back to client
async *generateSpeech(text: string): AsyncGenerator<Buffer> { ... }
```

---

## Route Planning Algorithm (UPDATED)

### Core Principles

1. **Never hard block** - Always return a route
2. **Best/shortest first** - Category winner = lowest detour
3. **Inform, don't decide** - Warn if far, let user choose
4. **Voice vs Text** - Voice gets 1 option, text gets 5

### Algorithm Flow

```typescript
async planRoute(params: {
  origin: Coordinates;
  destination: string;
  stops: string[];
  userId: string;
  mode: 'voice' | 'text';
}): Promise<RouteResult> {

  // STEP 1: Calculate direct route
  const directRoute = await this.mapsService.getRoute(
    params.origin,
    await this.resolveDestination(params.destination, params.userId)
  );

  // STEP 2: For each stop, find CATEGORY WINNER
  const resolvedStops = await Promise.all(
    params.stops.map(stop => this.findCategoryWinner(stop, directRoute))
  );

  // STEP 3: Optimize stop order
  const optimizedOrder = this.optimizeStopOrder(
    params.origin,
    directRoute.destination,
    resolvedStops.map(s => s.winner)
  );

  // STEP 4: Calculate final route with stops
  const finalRoute = await this.mapsService.getRouteWithWaypoints(
    params.origin,
    directRoute.destination,
    optimizedOrder
  );

  // STEP 5: Categorize total detour
  const detourTime = finalRoute.duration - directRoute.duration;
  const detourCategory = this.categorizeDetour(detourTime);

  // STEP 6: Build response based on mode
  return {
    route: {
      polyline: finalRoute.polyline,
      totalDistance: finalRoute.distance,
      totalTime: finalRoute.duration,
      detourTime,
      detourCategory,
    },
    stops: resolvedStops.map(s => ({
      ...s.winner,
      isSelected: true,
      // Include alternatives only for text mode
      alternatives: params.mode === 'text' ? s.alternatives.slice(0, 5) : [],
    })),
    warnings: detourCategory !== 'MINIMAL' ? [{
      stopName: 'Total trip',
      message: this.getWarningMessage(detourCategory, detourTime),
      detourTime,
    }] : [],
  };
}
```

### Find Category Winner

```typescript
async findCategoryWinner(
  stopQuery: string,
  directRoute: Route
): Promise<{ winner: Stop; alternatives: Stop[] }> {

  // Search within 5 miles of route
  const candidates = await this.placesService.searchAlongRoute(
    stopQuery,
    directRoute.polyline,
    5 * 1609  // 5 miles in meters
  );

  // Calculate detour for each candidate
  const withDetour = await Promise.all(
    candidates.map(async (place) => {
      const detour = await this.calculateDetour(
        directRoute,
        place.location
      );
      return { ...place, detourTime: detour.extraTime };
    })
  );

  // Sort by detour (lowest first)
  const sorted = withDetour.sort((a, b) => a.detourTime - b.detourTime);

  return {
    winner: sorted[0],              // Category winner
    alternatives: sorted.slice(1),  // Rest for text mode
  };
}
```

### Detour Categories

```typescript
categorizeDetour(detourSeconds: number): DetourCategory {
  const minutes = detourSeconds / 60;

  if (minutes <= 5) return 'MINIMAL';
  if (minutes <= 10) return 'SIGNIFICANT';
  return 'FAR';
}

getWarningMessage(category: DetourCategory, seconds: number): string {
  const minutes = Math.round(seconds / 60);

  switch (category) {
    case 'SIGNIFICANT':
      return `This adds about ${minutes} minutes to your trip.`;
    case 'FAR':
      return `This is ${minutes} minutes out of your way. Are you sure?`;
    default:
      return '';
  }
}
```

### Response by Mode

| Mode | Category Winner | Alternatives | Behavior |
|------|-----------------|--------------|----------|
| Voice | Announced | On request | Speak result, ask confirm |
| Text | Shown + highlighted | Show 5 | Display all options |

---

## NLU Processing

### Gemini Dual-Agent Architecture

```typescript
// Fast Agent (85% of requests)
// Gemini 2.5 Flash - quick intent/entity extraction
const fastResult = await this.geminiFast.process(transcript);

if (fastResult.confidence >= 0.60) {
  return fastResult;  // Proceed with this
}

// Advanced Agent (15% of requests)
// Gemini 3.0 Pro - complex reasoning
return await this.geminiAdvanced.process(transcript, context);
```

### NLU Response

```typescript
interface NLUResult {
  intent: 'navigate_with_stops' | 'find_place' | 'set_destination' | 'unclear';
  entities: {
    destination: string | null;
    stops: string[];
    category?: string;
  };
  confidence: number;
}
```

### Confidence Routing

| Confidence | Action |
|------------|--------|
| ≥ 0.80 (HIGH) | Execute immediately |
| 0.60-0.79 (MEDIUM) | Ask confirmation |
| < 0.60 (LOW) | Escalate to Gemini 3.0 Pro |

---

## REST API Endpoints (Text Mode)

### Main Route Planning

```typescript
POST /api/v1/errand/navigate-with-stops

Request:
{
  origin: { lat: number; lng: number };
  destination: { name: string } | { lat: number; lng: number };
  stops: Array<{ name: string; category?: string }>;
  userId?: string;
}

Response:
{
  success: boolean;
  data: {
    route: RouteResult;
    excludedStops?: Array<{ name: string; reason: string }>;
  };
  error?: { code: string; message: string };
}
```

### Other Endpoints

- `POST /api/v1/nlu/process` - NLU processing
- `POST /api/v1/nlu/escalate` - Escalate to Gemini 3.0 Pro
- `GET /api/v1/places/search` - Place search
- `GET /api/v1/places/disambiguate` - Handle ambiguous places
- `GET /api/v1/user/anchors` - User's saved locations

---

## Data Structures

### RouteResult

```typescript
interface RouteResult {
  route: {
    polyline: string;
    totalDistance: number;      // meters
    totalTime: number;          // seconds
    detourTime: number;         // extra seconds vs direct
    detourCategory: 'MINIMAL' | 'SIGNIFICANT' | 'FAR';
  };
  stops: Array<{
    id: string;
    name: string;
    category: string;
    location: { lat: number; lng: number };
    address: string;
    detourTime: number;
    isSelected: boolean;
    alternatives: Array<{       // Only in text mode
      id: string;
      name: string;
      detourTime: number;
      address: string;
    }>;
  }>;
  warnings: Array<{
    stopName: string;
    message: string;
    detourTime: number;
  }>;
  voiceMessage?: string;        // Pre-generated TTS text
}
```

---

## Database Schema

### Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  preferences JSONB,
  created_at TIMESTAMP
);

-- Anchors (saved locations)
CREATE TABLE anchors (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR,           -- "home", "work", etc.
  location GEOGRAPHY,
  address VARCHAR,
  type VARCHAR,
  created_at TIMESTAMP
);

-- Conversation history
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  transcript TEXT,
  intent VARCHAR,
  confidence FLOAT,
  route_id UUID,
  mode VARCHAR,           -- 'voice' or 'text'
  created_at TIMESTAMP
);
```

---

## Caching Strategy (Redis)

| Data | TTL | Key Pattern |
|------|-----|-------------|
| Routes | 1 hour | `route:{hash}` |
| Places | 7 days | `place:{placeId}` |
| Anchors | 30 days | `anchors:{userId}` |
| STT sessions | 5 min | `stt:{sessionId}` |

---

## Error Handling

### Voice Errors

```typescript
// STT failure
{ type: 'error', code: 'STT_FAILED', message: 'Could not understand audio' }
→ Return to LISTENING state

// No places found
{ type: 'clarification', message: 'I couldn\'t find any [stop] near your route. Skip it or search wider?' }
→ Offer voice options

// Route too far
{ type: 'route_data', warnings: [{ message: 'This adds 15 minutes...' }] }
→ Ask for confirmation
```

### REST Errors

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: 'NO_RESULTS' | 'INVALID_DESTINATION' | 'API_ERROR';
    message: string;
    suggestions?: string[];
  };
}
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Voice latency (silence → response) | < 500ms |
| STT streaming latency | < 200ms |
| Route calculation | < 1s |
| TTS generation start | < 300ms |
| REST API response | < 2s |

---

## Development Guidelines

### When implementing voice features:
1. Handle WebSocket lifecycle (connect, disconnect, reconnect)
2. Implement proper audio buffer management
3. Handle interrupt scenarios gracefully
4. Stream TTS chunks as they're generated
5. Log all voice sessions for debugging

### When implementing route planning:
1. Always return a route (never hard block)
2. Find category winner first, then alternatives
3. Include alternatives only for text mode
4. Generate warning messages for significant detours
5. Pre-generate voiceMessage for TTS

### Testing Requirements
- Unit tests: All services
- Integration: Voice pipeline end-to-end
- Load testing: WebSocket connections
- Test interrupt handling
- Test offline scenarios (REST fallback)

---

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Google Cloud
GOOGLE_MAPS_API_KEY=...
GOOGLE_PLACES_API_KEY=...
GOOGLE_CLOUD_PROJECT=...
GOOGLE_APPLICATION_CREDENTIALS=...

# Gemini
GEMINI_API_KEY=...

# Server
PORT=3000
NODE_ENV=production
```
