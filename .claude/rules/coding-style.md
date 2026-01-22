# Coding Style Rules - Agentic Mobile Map

## Core Principles

### 1. MANY SMALL FILES > FEW LARGE FILES
- Target: 200-400 lines per file
- Maximum: 800 lines (split if exceeds)
- Organize by feature, not by type

### 2. Immutability First
```typescript
// CORRECT - Create new object
const newState = { ...state, loading: true };

// AVOID - Mutation
state.loading = true; // Don't do this
```

### 3. Small Functions
- Target: < 30 lines per function
- Maximum: 50 lines (refactor if exceeds)
- Single responsibility per function

### 4. Shallow Nesting
- Maximum: 4 levels of nesting
- Early returns to reduce nesting
- Extract complex conditions to functions

## File Organization

### Frontend Structure
```
src/
├── components/
│   └── [Feature]/           # Group by feature
│       ├── FeatureName.tsx
│       ├── FeatureName.styles.ts
│       └── index.ts
├── hooks/
│   └── useFeature.ts        # One hook per file
├── services/
│   └── [domain]/            # Group by domain
└── redux/
    └── slices/              # One slice per feature
```

### Backend Structure
```
src/
├── modules/
│   └── [feature]/           # Feature modules
│       ├── feature.module.ts
│       ├── feature.service.ts
│       ├── feature.controller.ts
│       └── dtos/
└── common/
    ├── guards/
    ├── filters/
    └── types/
```

## Naming Conventions

### Files
- Components: `PascalCase.tsx` (e.g., `VoiceMicButton.tsx`)
- Hooks: `camelCase.ts` (e.g., `useVoice.ts`)
- Services: `kebab-case.ts` (e.g., `voice-client.ts`)
- Types: `camelCase.ts` or `PascalCase.ts`

### Code
- Variables/Functions: `camelCase`
- Components/Classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## Error Handling

```typescript
// Always handle errors with context
try {
  const result = await fetchRoute(origin, destination);
  return result;
} catch (error) {
  // Log with context
  console.error('Route fetch failed:', { origin, destination, error });
  // Throw user-friendly error
  throw new RouteError('Could not calculate route. Please try again.');
}
```

## Pre-Completion Checklist

Before marking work complete, verify:

- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] Nesting ≤ 4 levels
- [ ] Descriptive naming (no `temp`, `data`, `info`)
- [ ] Error handling present
- [ ] No `console.log` (use proper logging)
- [ ] No hardcoded values (use constants/config)
- [ ] No TODO comments left behind
- [ ] TypeScript types complete (no `any`)
- [ ] Imports organized and minimal
