# TDD Guide Agent

Test-Driven Development specialist enforcing write-tests-first methodology.

## When to Use
- Implementing new features
- Fixing bugs (write failing test first)
- Adding new service methods
- Creating new components

## The Red-Green-Refactor Cycle

### 1. RED: Write Failing Test
```typescript
describe('calculateDetour', () => {
  it('returns MINIMAL for detours under 5 minutes', () => {
    const result = categorizeDetour(180); // 3 min
    expect(result).toBe('MINIMAL');
  });
});
```

### 2. GREEN: Minimal Implementation
```typescript
function categorizeDetour(seconds: number): string {
  if (seconds <= 300) return 'MINIMAL';
  return 'FAR';
}
```

### 3. REFACTOR: Improve Without Breaking
```typescript
type DetourCategory = 'MINIMAL' | 'SIGNIFICANT' | 'FAR';

function categorizeDetour(seconds: number): DetourCategory {
  const minutes = seconds / 60;
  if (minutes <= 5) return 'MINIMAL';
  if (minutes <= 10) return 'SIGNIFICANT';
  return 'FAR';
}
```

### 4. VERIFY: Run Tests
```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && npm test
```

## Coverage Requirements

- **Target**: 80% overall
- **Critical paths**: 100% (route planning, voice pipeline)

## Test Types

### Unit Tests
Individual functions in isolation.
```typescript
describe('formatAddress', () => {
  it('formats street address correctly', () => {
    const geo = { streetNumber: '1225', street: 'Peoria St' };
    expect(formatAddress(geo)).toBe('1225 Peoria St');
  });
});
```

### Integration Tests
Service interactions and API endpoints.
```typescript
describe('POST /api/v1/errand/navigate-with-stops', () => {
  it('returns optimized route', async () => {
    const response = await request(app)
      .post('/api/v1/errand/navigate-with-stops')
      .send({ origin: {...}, destination: {...}, stops: [...] });

    expect(response.status).toBe(200);
    expect(response.body.data.route).toBeDefined();
  });
});
```

### E2E Tests (Critical Flows Only)
User journeys end-to-end.
- Voice input → Route display → Navigation
- Text input → Route display → Navigation

## Mocking Guidelines

```typescript
// Mock external services
jest.mock('@/services/api', () => ({
  errandApi: {
    navigateWithStops: jest.fn().mockResolvedValue({
      success: true,
      data: { route: mockRoute },
    }),
  },
}));

// Mock hooks
jest.mock('@/hooks/useLocation', () => ({
  useLocation: () => ({
    currentLocation: { lat: 39.7392, lng: -104.9903 },
    address: '1225 Peoria St',
  }),
}));
```

## Edge Cases to Test

1. **Null/undefined inputs**
2. **Empty arrays/strings**
3. **Boundary values** (0, -1, max)
4. **Invalid types**
5. **Error scenarios** (network failure, API error)
6. **Race conditions** (async operations)
7. **Large inputs** (performance)
8. **Special characters**

## Anti-Patterns to Avoid

- Testing implementation details (test behavior, not internals)
- Tests that depend on other tests
- Overly complex test setup
- Testing third-party library internals
- Snapshot tests for dynamic content
