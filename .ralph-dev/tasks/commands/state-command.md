---
id: commands.state-command
module: commands
priority: 4
status: pending
estimatedMinutes: 25
dependencies:
  - services.state-service
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Refactor commands/state.ts to use StateService

## Acceptance Criteria

1. Reduce state.ts command handlers to thin layer
2. Remove business logic (move to StateService)
3. Use dependency injection
4. Update tests

