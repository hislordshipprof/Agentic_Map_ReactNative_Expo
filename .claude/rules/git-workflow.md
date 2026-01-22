# Git Workflow Rules - Agentic Mobile Map

## Commit Message Format

Use conventional commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `docs`: Documentation only
- `test`: Adding/updating tests
- `chore`: Build, config, dependencies
- `perf`: Performance improvement
- `style`: Formatting (no code change)

### Scope (optional)
- `frontend`: Frontend changes
- `backend`: Backend changes
- `voice`: Voice feature related
- `route`: Route planning related
- `nlu`: NLU/Gemini related

### Examples

```bash
# Feature
feat(voice): add WebSocket client for audio streaming

# Bug fix
fix(route): correct detour calculation for short routes

# Refactor
refactor(backend): extract category winner logic to separate function

# Multiple changes
feat(frontend): implement voice state machine

- Add VoiceMicButton component
- Add WaveformVisualizer
- Create voiceSlice for Redux
```

## Branch Strategy

```
main (protected)
  └── feature/voice-infrastructure
  └── feature/route-algorithm
  └── fix/location-cache-loop
  └── refactor/cleanup-unused-code
```

### Branch Naming
- `feature/<description>` - New features
- `fix/<description>` - Bug fixes
- `refactor/<description>` - Code improvements
- `docs/<description>` - Documentation

## Pull Request Process

1. **Create PR from feature branch to main**
2. **PR Title**: Same format as commit messages
3. **PR Body**: Include:
   - Summary of changes
   - Testing done
   - Screenshots (if UI changes)

```markdown
## Summary
- Added voice WebSocket client
- Implemented audio recording and streaming

## Testing
- Tested on Android emulator
- Verified WebSocket connection
- Confirmed audio chunks streaming

## Screenshots
[If applicable]
```

## Pre-Push Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console.log statements
- [ ] No hardcoded secrets
- [ ] Commit messages follow convention
- [ ] PR description complete

## Protected Rules

- **NEVER** force push to main
- **NEVER** commit directly to main
- **NEVER** commit secrets or credentials
- **NEVER** skip pre-commit hooks without approval

## When to Commit

- After completing a logical unit of work
- When tests pass for new functionality
- Before switching context to different task
- Frequently enough to not lose work

## Useful Commands

```bash
# Check status before commit
git status

# Stage specific files
git add path/to/file.ts

# Commit with message
git commit -m "feat(voice): add audio recorder service"

# Push to remote
git push origin feature/voice-infrastructure

# Create PR (using gh cli)
gh pr create --title "feat(voice): voice infrastructure" --body "..."
```
