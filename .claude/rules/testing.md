# Testing Rules - Agentic Mobile Map

## Coverage Requirements

- **Target**: 80% code coverage
- **Critical paths**: 100% coverage (route planning, voice pipeline)

## Test Types Required

### 1. Unit Tests
- Individual functions and components
- Mock external dependencies
- Fast execution (< 100ms per test)

```typescript
// Example: Testing route planning
describe('categorizeDetour', () => {
  it('returns MINIMAL for detours under 5 minutes', () => {
    expect(categorizeDetour(180)).toBe('MINIMAL'); // 3 min
  });

  it('returns SIGNIFICANT for detours 5-10 minutes', () => {
    expect(categorizeDetour(420)).toBe('SIGNIFICANT'); // 7 min
  });

  it('returns FAR for detours over 10 minutes', () => {
    expect(categorizeDetour(720)).toBe('FAR'); // 12 min
  });
});
```

### 2. Integration Tests
- API endpoints
- Database operations
- Service interactions

```typescript
// Example: Testing errand endpoint
describe('POST /api/v1/errand/navigate-with-stops', () => {
  it('returns optimized route with stops', async () => {
    const response = await request(app)
      .post('/api/v1/errand/navigate-with-stops')
      .send({
        origin: { lat: 39.7392, lng: -104.9903 },
        destination: { name: 'home' },
        stops: [{ name: 'Starbucks' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.route).toBeDefined();
    expect(response.body.data.route.stops.length).toBeGreaterThan(0);
  });
});
```

### 3. E2E Tests (Critical Flows Only)
- Voice input → Route display → Navigation
- Text input → Route display → Navigation
- Offline mode fallback

## Test-Driven Development (TDD)

For new features, follow this workflow:

1. **RED**: Write failing test first
   ```typescript
   it('should find category winner with lowest detour', () => {
     const result = findCategoryWinner('Starbucks', mockRoute);
     expect(result.winner.detourTime).toBeLessThan(result.alternatives[0].detourTime);
   });
   ```

2. **GREEN**: Write minimal implementation to pass

3. **REFACTOR**: Clean up while keeping tests green

4. **VERIFY**: Check coverage meets 80%

## What to Test

### Must Test
- Route planning algorithm
- Detour categorization
- Entity resolution (anchors, places)
- NLU confidence routing
- Voice state transitions
- WebSocket message handling
- Error scenarios

### Can Skip
- Third-party library internals
- Simple getters/setters
- UI styling (unless logic-dependent)

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

// Mock location
jest.mock('@/hooks/useLocation', () => ({
  useLocation: () => ({
    currentLocation: { lat: 39.7392, lng: -104.9903 },
    address: '1225 Peoria St',
    locationStatus: 'ready',
  }),
}));
```

## When Tests Fail

1. **Read the error carefully** - understand what failed
2. **Check test isolation** - ensure tests don't depend on each other
3. **Validate mocks** - ensure mocks match real behavior
4. **Fix implementation, not test** - unless test has a bug
5. **If stuck**: Document the issue and ask for help

## Running Tests

```bash
# Frontend
cd frontend && npm test              # Run all tests
cd frontend && npm test -- --coverage # With coverage

# Backend
cd backend && npm test               # Run all tests
cd backend && npm run test:e2e       # E2E tests only
```
