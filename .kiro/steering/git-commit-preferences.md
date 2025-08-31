---
inclusion: always
---

# Git Commit Preferences

## Commit Style Preference
The user prefers **conventional commits** format and **multiple smaller commits** instead of single large commits.

## Preferred Commit Format
Always use conventional commit format:
```
type(scope): description

- Detailed explanation point 1
- Detailed explanation point 2
- Achievement or metric if applicable
```

## Commit Types to Use
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Testing related changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI/CD changes
- `perf`: Performance improvements
- `style`: Code formatting

## Multiple Commits Strategy
When implementing large features, ALWAYS break them down into logical, smaller commits:

### Example Breakdown for Large Features:
1. `build: setup project configuration and dependencies`
2. `feat(types): implement TypeScript type definitions`
3. `feat(config): add configuration management`
4. `feat(utils): implement utility functions`
5. `feat(client): create API client with core functionality`
6. `test: establish comprehensive testing framework`
7. `docs: organize documentation structure`

### Benefits of Multiple Commits:
- Easier code review
- Better git history
- Easier to revert specific changes
- Clear development progression
- Better for debugging with git bisect

## Commit Message Structure
Each commit should include:
- **Clear type and scope**
- **Concise but descriptive title**
- **Bullet points explaining what was implemented**
- **Metrics or achievements when relevant** (e.g., "Achieve 85% test coverage")

## What NOT to do:
- ❌ Single massive commit with everything
- ❌ Vague commit messages like "fix stuff" or "update code"
- ❌ Mixing unrelated changes in one commit
- ❌ Task format like "Task: [1.1] - Description"

## Example Good Commits:
```bash
feat(client): implement TestRailApiClient with retry logic

- Add HTTP client with exponential backoff retry mechanism
- Implement authentication and request/response handling
- Create specific API methods for all TestRail endpoints
- Add timeout management and error classification
- Support rate limiting and connection management
```

```bash
test: establish comprehensive testing framework

- Add 79 tests across 4 test suites with high coverage
- Create mock utilities for TestRail API responses
- Implement test setup, teardown, and helper functions
- Add coverage reporting with quality gates
- Achieve 85.92% statement coverage (exceeds 80% target)
```

## When Suggesting Git Commands
Always provide the complete git command sequence for multiple commits, not single commit suggestions.

## Repository Management
- Prefer organized folder structures
- Use meaningful file and folder names
- Keep documentation well-organized in docs/ folder
- Maintain clean .gitignore files