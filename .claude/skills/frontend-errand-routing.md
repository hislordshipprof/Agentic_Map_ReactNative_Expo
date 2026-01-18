# Frontend Development Skill - Agentic Mobile Map

## Project Context

Building an **intelligent errand routing system** frontend that enables natural language route planning in 1-2 conversational turns instead of 5-6 manual steps.

**Core Transformation**: User says "Take me home with Starbucks and Walmart on the way" -> App shows optimized route with [Accept & Navigate] button

## Tech Stack

- **Framework**: React Native (mobile-first) + React Web
- **State Management**: Redux
- **Navigation**: React Navigation (RN) / React Router (Web)
- **Maps**: Google Maps SDK
- **Offline Storage**: SQLite (mobile) / IndexedDB (web)

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Conversation/
│   │   │   ├── ConversationBubble.tsx
│   │   │   ├── SystemResponseBubble.tsx
│   │   │   ├── ConversationHistory.tsx
│   │   │   └── ConversationContainer.tsx
│   │   ├── Input/
│   │   │   ├── UserInputField.tsx
│   │   │   └── SendButton.tsx
│   │   ├── Dialogs/
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   ├── DisambiguationDialog.tsx
│   │   │   ├── AlternativesDialog.tsx
│   │   │   └── ErrorDialog.tsx
│   │   ├── Route/
│   │   │   ├── RouteConfirmationScreen.tsx
│   │   │   ├── RouteMap.tsx
│   │   │   ├── RouteDetails.tsx
│   │   │   └── StopList.tsx
│   │   ├── Adjustment/
│   │   │   ├── AdjustmentMode.tsx
│   │   │   ├── DraggableStopList.tsx
│   │   │   └── AddStopForm.tsx
│   │   └── Common/
│   │       ├── LoadingIndicator.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── OfflineBanner.tsx
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── conversationSlice.ts
│   │   │   ├── routeSlice.ts
│   │   │   ├── nluSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── offlineSlice.ts
│   │   ├── store.ts
│   │   └── hooks.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── cache.ts
│   │   ├── maps.ts
│   │   └── nlu.ts
│   ├── hooks/
│   │   ├── useConversation.ts
│   │   ├── useRoute.ts
│   │   ├── useOfflineSync.ts
│   │   └── useNLUFlow.ts
│   ├── screens/
│   │   ├── ConversationScreen.tsx
│   │   ├── RouteConfirmationScreen.tsx
│   │   └── NavigationScreen.tsx
│   ├── App.tsx
│   └── index.tsx
└── package.json
```

## Redux State Structure

### Conversation Slice
```typescript
interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

interface Message {
  id: string;
  sender: 'user' | 'system';
  text: string;
  timestamp: number;
  messageType?: 'confirmation' | 'disambiguation' | 'alternatives' | 'error';
  data?: {
    confirmedDestination?: Destination;
    confirmedStops?: Stop[];
    totalDistance?: number;
    totalTime?: number;
    route?: Route;
  };
  actions?: Action[];
}
```

### Route Slice
```typescript
interface RouteState {
  confirmed: Route | null;
  pending: Route | null;
  waypoints: Waypoint[];
  totalDistance: number;
  totalTime: number;
  polyline: string | null;
  stops: Stop[];
}

interface Stop {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  mileMarker: number;
  detourCost: number;
  status: 'NO_DETOUR' | 'MINIMAL' | 'ACCEPTABLE' | 'NOT_RECOMMENDED';
}
```

### NLU Slice
```typescript
interface NLUState {
  lastIntent: string;
  lastConfidence: number;
  currentEntities: {
    destination: string;
    stops: string[];
    radius: number;
  };
  confirmationRequired: boolean;
}
```

### UI Slice
```typescript
interface UIState {
  conversationVisible: boolean;
  mapVisible: boolean;
  disambiguationOpen: boolean;
  confirmationOpen: boolean;
  adjustmentMode: boolean;
  offlineMode: boolean;
}
```

### User Slice
```typescript
interface UserState {
  anchors: Anchor[];
  preferences: {
    maxDetourPercentage: number;
    maxDetourMinutes: number;
    preferredStopCategories: string[];
  };
  conversationHistory: Message[];
}
```

### Offline Slice
```typescript
interface OfflineState {
  isOnline: boolean;
  lastSyncTime: number;
  cacheStale: boolean;
  isSyncing: boolean;
}
```

## Confidence-Based UI Flows

### Three-Tier System

```typescript
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,    // Execute immediately
  MEDIUM: 0.60,  // Show confirmation
  LOW: 0.00      // Offer alternatives
};
```

### Flow 1: HIGH Confidence (>= 0.80)
```
User input -> NLU returns 0.87 confidence
    -> System processes immediately
    -> No confirmation needed
    -> Show route results with [Accept & Navigate] button
    -> User taps Accept
    -> Start navigation
```

### Flow 2: MEDIUM Confidence (0.60-0.79)
```
User input -> NLU returns 0.72 confidence
    -> Show confirmation dialog:
       "I think you want to:
        Go to: Home
        With stops at: Starbucks, Whole Foods
        Is this right?"
    -> User taps [Yes] or [Let me rephrase]
    -> If Yes: Proceed to results
    -> If Rephrase: Clear input, re-prompt
```

### Flow 3: LOW Confidence (< 0.60)
```
User input -> NLU returns 0.48 confidence
    -> Show alternatives:
       "I'm not quite sure. Did you want to:
        (A) Plan a multi-stop trip?
        (B) Find a specific place?
        (C) Set a destination?"
    -> User taps option
    -> If still unclear after 2 attempts: Escalate to Claude LLM
```

### Flow 4: LLM Escalation
```
2 failed attempts at low confidence
    -> Show loading: "Thinking about your request..."
    -> Backend calls Claude
    -> Claude returns parsed intent (0.95+ confidence)
    -> Proceed with high confidence flow
```

## Key Components

### ConversationBubble
- User messages: Right-aligned, user color
- System messages: Left-aligned, app color
- Timestamps optional
- Auto-scroll to latest message

### Message Types

**Type 1: Simple Confirmation**
```
Perfect! Both stops fit on your way.
Route: Home -> Starbucks (mi 2) -> Whole Foods (mi 7) -> Home
Total: 10.2 miles, 18 minutes.

[Accept & Navigate] [Adjust] [Cancel]
```

**Type 2: Disambiguation**
```
I found multiple options. Which Target are you going to?

- Target Superstore, Aurora
  3.2 miles away - Open now - 4.8 stars

- Target Superstore, Downtown Denver
  7.1 miles away - Open until 9pm - 4.6 stars

[Select Aurora] [Select Downtown]
```

**Type 3: Alternatives (Low Confidence)**
```
I'm not quite sure what you meant. Did you want to:

(A) Plan a multi-stop trip?
(B) Find a specific place?
(C) Just set where you're going?

[A] [B] [C]
```

**Type 4: Error/Fallback**
```
I couldn't find Chick-fil-A within your 10-mile budget.

Would you like me to:
- Expand search to 15 miles?
- Show options outside your route?
- Skip this stop?

[Expand] [Show All] [Skip]
```

### RouteConfirmationScreen
Layout:
```
[Header]
Route Summary: Home -> Starbucks (mi 2) -> Whole Foods (mi 7) -> Home

[Map Section - 50% of screen]
Visual polyline with numbered waypoints
Green pin: Start
Blue numbered pins: Stops (1, 2, 3...)
Red pin: End

[Details Section - 50% of screen]
Total Distance: 10.2 miles
Total Time: 18 minutes
Stops: 2
Status: All within budget

[Stop Breakdown]
1. Starbucks Midtown (mile 2)
   - No extra miles
   - 123 Main St, Aurora

2. Whole Foods Market (mile 7)
   - Minimal detour (+0.2 miles)
   - 456 South St, Denver

[Buttons]
[Accept & Navigate] [Adjust] [Cancel]
```

### AdjustmentMode
Features:
- Remove stops: [Remove] button per stop
- Reorder stops: Drag-and-drop or arrow buttons
- Replace stops: [Replace] with search
- Add stops: [+ Add Another Stop]
- Re-optimize: Recalculate after changes
- Preview: See new route before confirming

## Map Integration

### Google Maps SDK Requirements
- Show polyline (blue) of optimized route
- Numbered waypoint pins
- Auto-zoom to fit all waypoints
- Distance/time labels on each leg
- Tap waypoint for info window
- Pinch to zoom, pan gestures

### Configuration
```typescript
const mapOptions = {
  zoom: 'auto-fit-bounds',
  center: 'midpoint-of-waypoints',
  style: 'light-theme',
  traffic: 'optional-toggle',
  satellite: 'optional-toggle'
};
```

## Offline Support

### Cache Strategy (SQLite/IndexedDB)

| Data Type | TTL | Limit |
|-----------|-----|-------|
| Anchors | 30 days | All user anchors |
| Popular stops | 7 days | Top 20 per anchor |
| Previous routes | 1 day | Last 10 routes |
| Destination index | 14 days | Common places |
| Conversation | No expiry | Last 50 messages |

### Offline UI
```
[Network indicator: Offline Mode]

Quick Actions:
[Home] [Work] [Gym]

[Recently Used Routes]
Home (with: Starbucks, Whole Foods)
Work (with: Gas, Coffee)

[New Route]
[Type or select from history...]

Note: Some suggestions may be outdated.
Refresh when online for latest options.
```

### Sync Strategy
```
Device comes online
    -> Check if cache is stale (>7 days)
    -> If stale: Download fresh data
        - User anchors
        - Popular stops near anchors
        - Recent routes
    -> Store in local cache
    -> Update UI: "Synced. Suggestions refreshed."
```

## Error Handling UI

### Error Type 1: Network Error
```
Connection failed

I couldn't reach the server. Please check your internet and try again.

[Retry] [Use Offline Mode]
```

### Error Type 2: No Results
```
No results found

I couldn't find any Chick-fil-A within your 10-mile budget.

Would you like to:
- Expand search to 15 miles?
- Show options further out?
- Skip this stop?

[Expand] [Show All] [Skip]
```

### Error Type 3: Route Too Long
```
Route too long

With all stops, the route is 15.2 miles.
Your budget is 10 miles (with 7% detour allowed).

Would you like to:
- Remove one of the stops?
- Expand your budget?
- Choose different stops?

[Adjust] [Expand] [Change Stops]
```

### Error Type 4: Location Unavailable
```
Location not available

I need your location to plan routes. Please enable location services in settings.

[Open Settings] [Try Without Location]
```

## Loading States

```typescript
// Loading indicator types
type LoadingState = {
  isActive: boolean;
  message: string;
  progress?: number;  // 0-100
  canCancel?: boolean;
};

// Messages
const loadingMessages = [
  "Searching for Starbucks...",
  "Finding best match for your stops...",
  "Optimizing route order...",
  "Checking if stops fit in your budget...",
  "Recalculating with your changes..."
];
```

## Accessibility Requirements

- Screen reader support (ARIA labels on all interactive elements)
- High contrast mode support
- Large text option (1.2x, 1.5x, 2x scale)
- Keyboard navigation (Tab, Enter, Escape)
- Voice announcements for state changes
- Touch targets: Minimum 48x48dp
- Color not the only indicator (use icons + text)

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial app load | < 3 seconds |
| Message send + response | < 2 seconds |
| Map render | < 1 second |
| Scroll conversation | 60 FPS |

### Optimization Strategies
- Lazy load conversation messages
- Virtualize long lists (FlatList)
- Memoize expensive computations
- Debounce user input
- Pre-render common dialogs
- Compress place photos
- Code splitting for route/map components

## API Integration

### Endpoints
- `POST /api/v1/errand/navigate-with-stops` - Main route planning
- `GET /api/v1/errand/suggest-stops-on-route` - Proactive suggestions
- `GET /api/v1/places/disambiguate` - Handle ambiguous destinations
- `GET /api/v1/user/anchors` - Fetch saved locations
- `POST /api/escalate-to-llm` - LLM fallback

### Request/Response Pattern
```typescript
// Send request
const response = await api.post('/api/v1/errand/navigate-with-stops', {
  start_location: currentLocation,
  destination_text: 'home',
  stop_queries: ['Starbucks', 'Whole Foods'],
  max_detour_m: 804,
  optimize: true,
  user_id: userId
});

// Handle response
if (response.ready_to_navigate) {
  dispatch(setRoute(response.optimized_route));
  dispatch(showConfirmation(response.confirmation_message));
} else if (response.action === 'DISAMBIGUATE') {
  dispatch(showDisambiguation(response.candidates));
}
```

## Development Guidelines

### When implementing a component:
1. Create functional component with TypeScript
2. Use Redux hooks (useSelector, useDispatch)
3. Implement proper loading and error states
4. Add accessibility attributes
5. Write unit tests with React Testing Library
6. Ensure responsive design (mobile-first)

### When implementing a screen:
1. Connect to Redux state
2. Handle all confidence-based flows
3. Implement offline fallback
4. Add proper navigation guards
5. Test on both iOS and Android

### Testing Requirements
- Unit tests: All components
- Integration tests: Full user flows
- E2E tests: Complete journeys (Detox/Appium)
- Target: Comprehensive coverage of confidence flows

## Message Formatting Guidelines

- Use emojis for quick scanning: check, X, warning
- Bold important numbers (distance, time)
- Bullet points for lists
- Distinct styling for action buttons
- Clickable links
- Different font for entity names if needed
