# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agentic Mobile Map** - An intelligent voice-first errand routing system that allows users to plan multi-stop journeys using natural language.

### Key Concept
Transform: "Set anchor → Set radius → Find stop → Select stop → Find another stop → Select stop → Optimize → Navigate"
Into: "Take me home with Starbucks and Walmart on the way"

### Dual Input Modes
- **Voice Mode**: WebSocket streaming with VAD → STT → NLU → TTS pipeline
- **Text Mode**: REST API for typed requests

---

## Quick Reference

### Development Commands

```bash
# Frontend (Expo/React Native)
cd frontend
npm install                    # Install dependencies
npx expo start                 # Start development server
npx expo run:android           # Run on Android
npx expo run:ios               # Run on iOS
npm test                       # Run tests

# Backend (NestJS)
cd backend
npm install                    # Install dependencies
npm run start:dev              # Start development server
npm test                       # Run tests
npm run build                  # Production build

# Type Checking
npx tsc --noEmit               # Check for TypeScript errors
```

### Key Files to Know

| Purpose | Location |
|---------|----------|
| Main app entry | `frontend/app/(tabs)/index.tsx` |
| Navigation layout | `frontend/app/_layout.tsx` |
| Theme/Colors | `frontend/src/theme/colors.ts` |
| API services | `frontend/src/services/api/` |
| Redux store | `frontend/src/redux/` |
| Hooks | `frontend/src/hooks/` |
| Backend modules | `backend/src/modules/` |
| Errand routing | `backend/src/modules/errand/` |
| NLU processing | `backend/src/modules/nlu/` |
| Voice gateway | `backend/src/modules/voice/` |

---

## Architecture

### Frontend Stack
- **Framework**: React Native (Expo)
- **State**: Redux Toolkit
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind for RN)
- **Maps**: react-native-maps with Google Maps
- **Voice**: expo-av for audio recording

### Backend Stack
- **Framework**: NestJS with TypeScript
- **Real-Time**: WebSocket gateway (Socket.io)
- **AI/NLU**: Gemini 2.5 Flash + Gemini 3.0 Pro
- **Voice**: Google Cloud STT + TTS
- **Maps**: Google Maps Routes API + Places API
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis
- **Queue**: Bull

### Voice Pipeline Flow
```
User Speaks → Mic → Audio Chunks → WebSocket → VAD → STT → NLU → Route Planning → TTS → Speaker
```

### Voice States
```
IDLE → LISTENING → PROCESSING → SPEAKING → CONFIRMING → NAVIGATING
```

---

## Coding Standards

See `.claude/rules/` for detailed guidelines:
- **coding-style.md**: File organization, naming, function size limits
- **testing.md**: Test coverage requirements, TDD workflow
- **security.md**: API key handling, input validation
- **git-workflow.md**: Commit format, branch naming, PR process

### Quick Checklist
- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] No hardcoded API keys (use env vars)
- [ ] No `console.log` in production code
- [ ] TypeScript strict mode (no `any`)
- [ ] Error handling present
- [ ] Tests for critical paths

---

## Key Business Logic

### Route Planning Algorithm
1. **Never hard block** - Always return a route
2. **Best/shortest first** - Category winner = lowest detour
3. **Inform, don't decide** - Warn user about long detours
4. **Voice vs Text**: Voice gets 1 option, Text gets 5 alternatives

### Detour Categories
| Category | Extra Time | Action |
|----------|-----------|--------|
| MINIMAL | 0-5 min | Execute silently |
| SIGNIFICANT | 5-10 min | Warn user |
| FAR | 10+ min | Confirm with user |

### NLU Confidence Routing
| Confidence | Action |
|------------|--------|
| ≥ 0.80 (HIGH) | Execute immediately |
| 0.60-0.79 (MEDIUM) | Ask confirmation |
| < 0.60 (LOW) | Escalate to Gemini 3.0 Pro |

---

## Environment Variables

### Frontend (.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GOOGLE_MAPS_API_KEY=...
GOOGLE_PLACES_API_KEY=...
GEMINI_API_KEY=...
GOOGLE_CLOUD_PROJECT=...
```

---

## Common Tasks

### Adding a New Screen
1. Create file in `frontend/app/` (file-based routing)
2. Add to navigation if needed in `_layout.tsx`
3. Follow existing patterns for styling and state

### Adding a New Backend Endpoint
1. Create/update controller in `backend/src/modules/`
2. Add service logic
3. Define DTOs with validation
4. Add tests

### Adding a New Redux Slice
1. Create slice in `frontend/src/redux/slices/`
2. Export from `frontend/src/redux/index.ts`
3. Add to store configuration

---

## Important Files Structure

```
.
├── frontend/                   # React Native (Expo) app
│   ├── app/                    # Expo Router screens
│   │   ├── (tabs)/             # Tab navigator screens
│   │   ├── auth/               # Authentication screens
│   │   └── _layout.tsx         # Root layout
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API and utility services
│   │   ├── redux/              # Redux store and slices
│   │   └── theme/              # Colors, typography
│   └── package.json
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── errand/         # Route planning
│   │   │   ├── nlu/            # NLU processing
│   │   │   ├── places/         # Place search
│   │   │   ├── voice/          # Voice gateway
│   │   │   └── user/           # User management
│   │   └── main.ts
│   └── package.json
├── docs/                       # Documentation
│   └── FINAL_REQUIREMENTS.md   # Consolidated requirements
├── .claude/
│   ├── rules/                  # Coding standards
│   └── skills/                 # Claude Code skills
└── CLAUDE.md                   # This file
```

---

## Skills & Agents Available

### Skills (`.claude/skills/`)
- **backend-errand-routing.md**: Backend development patterns
- **frontend-errand-routing.md**: Frontend development patterns

### Agents (`.claude/agents/`)
- **planner.md**: Break down complex features into actionable steps
- **code-reviewer.md**: Systematic code review for quality & security
- **build-error-resolver.md**: Fix TypeScript/build errors with minimal changes
- **tdd-guide.md**: Test-driven development workflow

---

## Troubleshooting

### "Excessive pending callbacks" Error
Usually caused by infinite loops in useEffect. Check:
- Dependency arrays for functions that change on every render
- Use `useRef` for initialization flags

### TypeScript Errors
```bash
npx tsc --noEmit  # Check all errors
```

### Metro Bundler Issues
```bash
npx expo start -c  # Clear cache and restart
```

### Backend Won't Start
Check environment variables and database connection:
```bash
npm run start:dev -- --debug
```
