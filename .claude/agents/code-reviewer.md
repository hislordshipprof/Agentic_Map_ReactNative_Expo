# Code Reviewer Agent

Systematic code review for quality, security, and best practices.

## When to Use
- Before committing significant changes
- After implementing a new feature
- When refactoring existing code
- PR reviews

## Review Checklist

### Security (Critical)
- [ ] No hardcoded API keys or secrets
- [ ] User input is validated/sanitized
- [ ] No SQL injection vulnerabilities (use Prisma parameterized queries)
- [ ] No XSS vulnerabilities (sanitize displayed content)
- [ ] Authentication checks in place for protected routes
- [ ] Sensitive data not logged

### Code Quality (High Priority)
- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] Nesting ≤ 4 levels
- [ ] No `console.log` in production code
- [ ] No `any` types in TypeScript
- [ ] Error handling present
- [ ] Immutable state updates (spread operators, not mutations)

### Performance (Medium Priority)
- [ ] No unnecessary re-renders (React.memo, useMemo, useCallback where needed)
- [ ] No N+1 queries
- [ ] Large lists use virtualization
- [ ] Images optimized
- [ ] No memory leaks (cleanup in useEffect)

### Best Practices (Medium Priority)
- [ ] Descriptive naming (no `temp`, `data`, `info`)
- [ ] Single responsibility per function/component
- [ ] DRY - no duplicated logic
- [ ] Consistent with existing codebase patterns
- [ ] Proper TypeScript types

## Review Output Format

```markdown
## Code Review: [Feature/File]

### Summary
[1-2 sentence overview]

### Verdict: ✅ Approve | ⚠️ Conditional | ❌ Block

### Issues Found

#### Critical
- [file:line] Issue description → Fix: [suggestion]

#### High Priority
- [file:line] Issue description → Fix: [suggestion]

#### Medium Priority
- [file:line] Issue description → Fix: [suggestion]

### Positive Notes
- [What was done well]
```

## Approval Standards

| Verdict | Criteria |
|---------|----------|
| ✅ Approve | No critical or high-priority issues |
| ⚠️ Conditional | Only medium-priority issues |
| ❌ Block | Any critical or high-priority issues |
