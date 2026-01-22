# Frontend Development Skill - Agentic Mobile Map

## Project Context

Building an **intelligent errand routing system** with **parallel input modes** (voice + text) that enables natural language route planning in 1-2 conversational turns.

**Core Experience**: User says OR types "Take me home with Starbucks on the way" → App shows optimized route → User confirms → Navigation starts

## Tech Stack

- **Framework**: React Native (Expo SDK 52+ with Dev Client)
- **State Management**: Redux Toolkit
- **Maps**: `react-native-maps` (Google Maps)
- **Audio**: `expo-av` or `react-native-audio-recorder-player`
- **Network**: WebSocket (voice) + REST API (text)
- **Storage**: AsyncStorage + SQLite

## Project Structure

```
frontend/
├── app/                          # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx             # Main conversation screen
│   │   └── route.tsx             # Route confirmation screen
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── Voice/                # NEW: Voice mode components
│   │   │   ├── VoiceMicButton.tsx
│   │   │   ├── WaveformVisualizer.tsx
│   │   │   └── VoiceStatusIndicator.tsx
│   │   ├── Conversation/
│   │   ├── Input/
│   │   ├── Dialogs/
│   │   ├── Route/
│   │   ├── Adjustment/
│   │   └── Common/
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── voiceSlice.ts     # NEW: Voice state management
│   │   │   ├── conversationSlice.ts
│   │   │   ├── routeSlice.ts
│   │   │   ├── nluSlice.ts
│   │   │   └── ...
│   │   └── store.ts
│   ├── services/
│   │   ├── voice/                # NEW: Voice services
│   │   │   ├── VoiceClient.ts    # WebSocket client
│   │   │   ├── AudioRecorder.ts  # Mic capture
│   │   │   └── AudioPlayer.ts    # TTS playback
│   │   ├── api/
│   │   ├── location/
│   │   └── cache/
│   ├── hooks/
│   │   ├── useVoice.ts           # NEW: Voice hook
│   │   ├── useLocation.ts
│   │   ├── useRoute.ts
│   │   └── useNLUFlow.ts
│   └── types/
└── package.json
```

---

## Dual Input Mode Architecture

### Mode Selection

```typescript
type InputMode = 'voice' | 'text';

// User can switch freely between modes
// Offline → auto-switch to text mode
// Context preserved across mode switches
```

### Voice Mode Flow
```
Tap Mic → LISTENING → Speak → Silence (700ms) → PROCESSING → SPEAKING → CONFIRMING → NAVIGATING
```

### Text Mode Flow
```
Type → Submit → PROCESSING → Show Route + Alternatives → CONFIRMING → NAVIGATING
```

---

## Voice State Machine

```typescript
type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'CONFIRMING' | 'NAVIGATING';

interface VoiceSlice {
  status: VoiceState;
  mode: 'voice' | 'text';
  transcript: string;
  partialTranscript: string;
  audioQueue: string[];        // base64 TTS chunks
  isPlaying: boolean;
  isConnected: boolean;        // WebSocket status
  error: { code: string; message: string } | null;
}
```

### State Transitions

| From | Event | To |
|------|-------|-----|
| IDLE | Tap mic | LISTENING |
| LISTENING | Silence 700ms | PROCESSING |
| LISTENING | Tap stop | IDLE |
| PROCESSING | Route ready | SPEAKING |
| SPEAKING | Audio done | CONFIRMING |
| SPEAKING | User interrupts | LISTENING |
| CONFIRMING | User confirms | NAVIGATING |
| CONFIRMING | User rejects | LISTENING |

---

## Voice Components

### VoiceMicButton

```typescript
// States and visual feedback
IDLE:       Large mic icon, pulsing glow, "Tap to speak"
LISTENING:  Waveform animation, "Listening..."
PROCESSING: Spinner, "Thinking..."
SPEAKING:   Waveform (playback), "Speaking...", stop button
CONFIRMING: Accept/Cancel buttons visible
```

### WaveformVisualizer

```typescript
// Animated bars that respond to audio input/output
interface Props {
  isActive: boolean;
  isPlayback?: boolean;  // true for TTS output
  audioLevel?: number;   // 0-100
}
```

### VoiceStatusIndicator

```typescript
// Shows current voice state with icon + text
interface Props {
  status: VoiceState;
  transcript?: string;
}
```

---

## Voice Services

### VoiceClient (WebSocket)

```typescript
class VoiceClient {
  connect(token: string): Promise<void>;
  disconnect(): void;
  sendAudioChunk(chunk: string): void;  // base64
  sendInterrupt(): void;
  sendConfirm(routeId: string): void;
  sendLocation(lat: number, lng: number): void;

  // Event handlers
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onStatus(callback: (state: VoiceState) => void): void;
  onAudioOut(callback: (chunk: string) => void): void;
  onRouteData(callback: (route: RouteResult) => void): void;
  onError(callback: (error: Error) => void): void;
}
```

### AudioRecorder

```typescript
class AudioRecorder {
  start(onChunk: (base64: string) => void): Promise<void>;
  stop(): Promise<void>;
  isRecording(): boolean;
}

// Config
const AUDIO_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  encoding: 'pcm_16bit',
  chunkIntervalMs: 100,
};
```

### AudioPlayer

```typescript
class AudioPlayer {
  queueChunk(base64: string): void;
  play(): Promise<void>;
  stop(): void;
  isPlaying(): boolean;
  onComplete(callback: () => void): void;
}
```

---

## Route Display (Both Modes)

### Voice Mode Response

```
App speaks: "I found a Starbucks on Main Street, just 1 minute
            out of your way. Total trip is 13 minutes. Ready?"

Map shows:
- Blue polyline (animated draw)
- Green pin: current location
- Orange pin: Starbucks (drops as mentioned)
- Red pin: home

Buttons: [Yes, let's go] [Change something]
```

### Text Mode Response

```
┌─────────────────────────────────────────┐
│ [Map with route]                        │
│                                         │
│ ✓ Route Ready                           │
│ Home via Starbucks                      │
│ 4.3 mi • 13 min (+1 min)               │
│                                         │
│ Stop: Starbucks Main St ⭐              │
│       +1 min • Open until 9pm          │
│       [Change]                          │
│                                         │
│ Other options (tap to swap):            │
│ • Starbucks Oak - +5 min               │
│ • Starbucks Downtown - +7 min          │
│ • Starbucks Mall - +9 min              │
│ • Starbucks Highway - +12 min          │
│                                         │
│ [Navigate] [Adjust]                     │
└─────────────────────────────────────────┘
```

### Key Difference

| Aspect | Voice Mode | Text Mode |
|--------|------------|-----------|
| Best option | Announced | Shown + highlighted |
| Alternatives | On request ("what else?") | Always visible (5 max) |
| Swap stops | Say it | Tap [Change] |
| Confirmation | "Yes" or tap | Tap [Navigate] |

---

## Redux State Structure

```typescript
interface RootState {
  voice: {
    status: VoiceState;
    mode: 'voice' | 'text';
    transcript: string;
    partialTranscript: string;
    audioQueue: string[];
    isPlaying: boolean;
    isConnected: boolean;
    error: Error | null;
  };
  route: {
    pending: RouteResult | null;
    confirmed: RouteResult | null;
    polyline: string | null;
    stops: Stop[];
    alternatives: Map<string, Stop[]>;  // stopId -> alternatives
  };
  nlu: {
    lastIntent: string;
    lastConfidence: number;
    entities: Entities;
  };
  ui: {
    inputMode: 'voice' | 'text';
    mapVisible: boolean;
    confirmationOpen: boolean;
    adjustmentMode: boolean;
  };
  user: {
    anchors: Anchor[];
    location: { lat: number; lng: number } | null;
    address: string | null;
  };
  offline: {
    isOnline: boolean;
    lastSyncTime: number;
  };
}
```

---

## Confidence-Based Flows

### Three-Tier System (Both Modes)

```typescript
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,    // Execute immediately
  MEDIUM: 0.60,  // Show confirmation
  LOW: 0.00      // Offer alternatives / escalate
};
```

### HIGH Confidence (≥0.80)

**Voice**: Proceed to route calculation, speak result
**Text**: Show route result directly

### MEDIUM Confidence (0.60-0.79)

**Voice**: "I think you want to go home with Starbucks. Is that right?"
**Text**: Show confirmation dialog with parsed intent

### LOW Confidence (<0.60)

**Voice**: "I'm not sure what you meant. Did you want to plan a route, find a place, or something else?"
**Text**: Show alternatives dialog with options

---

## Error Handling

### Voice Errors

```typescript
// WebSocket disconnect
"Connection lost. Switching to text mode."
→ Auto-switch to text input

// STT failure
"I couldn't hear that clearly. Please try again."
→ Return to LISTENING

// No results
"I couldn't find any [stop] near your route. Skip it or search wider?"
→ Offer options via voice
```

### Text Errors

```
┌─────────────────────────────────────┐
│ ⚠️ No results found                 │
│                                     │
│ Couldn't find Chick-fil-A nearby.   │
│                                     │
│ [Expand Search] [Skip] [Try Again]  │
└─────────────────────────────────────┘
```

---

## Offline Support

### Detection

```typescript
// NetInfo listener
if (!isConnected) {
  dispatch(setInputMode('text'));  // Force text mode
  dispatch(showOfflineBanner());
}
```

### Cached Data

- User anchors (home, work)
- Recent routes (last 10)
- Popular stops near anchors

### Offline UI

```
[Offline Mode Banner]

Quick destinations:
[Home] [Work] [Gym]

Recent routes:
• Home with Starbucks (yesterday)
• Work with gas (2 days ago)

[Type destination...]
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Voice latency (tap → listening) | < 200ms |
| Transcript display | Real-time |
| Route display after TTS | < 100ms |
| Mode switch | < 200ms |
| Map render | < 500ms |

---

## Development Guidelines

### When implementing voice components:
1. Handle all 6 voice states
2. Ensure proper cleanup of audio resources
3. Test interrupt scenarios
4. Handle WebSocket reconnection
5. Provide visual feedback for every state

### When implementing route display:
1. Support both voice and text modes
2. Show alternatives in text mode (5 max)
3. Animate map elements in voice mode
4. Handle detour warnings appropriately

### Testing Requirements
- Unit tests: All components and hooks
- Integration: Voice flow end-to-end
- E2E: Full user journeys (Detox)
- Test offline fallback
- Test interrupt handling
