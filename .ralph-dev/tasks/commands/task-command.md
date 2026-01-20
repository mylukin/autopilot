---
id: commands.task-command
module: commands
priority: 4
status: pending
estimatedMinutes: 30
dependencies:
  - services.task-service
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Refactor commands/tasks.ts to use TaskService

## Acceptance Criteria

1. Reduce tasks.ts to ≤50 lines per command handler
2. Remove all business logic (move to TaskService)
3. Remove all direct file system access
4. Use dependency injection (factory function)
5. Keep only: parse args, call service, format output
6. Update tests to use real service + mock repositories

