# Security Rules - Agentic Mobile Map

## CRITICAL: Pre-Commit Security Checks

Before any commit, verify:

1. **No Hardcoded Secrets**
   - API keys must come from environment variables
   - No tokens, passwords, or credentials in code
   - Check: `GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`

2. **Input Validation**
   - Validate all user inputs (voice transcripts, text inputs)
   - Sanitize location data before API calls
   - Use Zod or class-validator for DTOs

3. **SQL Injection Prevention**
   - Use Prisma's parameterized queries (already enforced)
   - Never concatenate user input into queries

4. **XSS Prevention**
   - Sanitize any user-generated content before display
   - Be cautious with transcript display

5. **API Security**
   - Validate JWT tokens on WebSocket connections
   - Rate limit voice endpoints (expensive operations)
   - Validate origin for WebSocket connections

## Environment Variable Pattern

```typescript
// CORRECT
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_MAPS_API_KEY not configured');
}

// NEVER DO THIS
const apiKey = 'AIzaSy...'; // HARDCODED - BLOCKED
```

## Mobile-Specific Security

1. **Location Data**
   - Don't log exact coordinates in production
   - Encrypt cached location data
   - Clear location cache on logout

2. **Audio Data**
   - Don't persist raw audio recordings
   - Clear audio buffers after processing
   - Use secure WebSocket (wss://) only

3. **User Anchors**
   - Encrypt home/work addresses at rest
   - Require auth for anchor access

## When Security Issue Found

1. STOP current work immediately
2. Do NOT commit the vulnerable code
3. Fix the vulnerability first
4. If credentials exposed, rotate immediately
5. Audit codebase for similar issues
