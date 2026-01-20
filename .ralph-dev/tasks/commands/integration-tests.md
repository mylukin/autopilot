---
id: commands.integration-tests
module: commands
priority: 4
status: pending
estimatedMinutes: 30
dependencies:
  - commands.task-command
  - commands.state-command
  - commands.detect-command
testRequirements:
  unit:
    required: true
    pattern: "**/*.integration.test.ts"
---

# Add integration tests for end-to-end workflows

## Acceptance Criteria

1. Test: create task → start → complete workflow
2. Test: state transitions through all phases
3. Test: detection with real file system
4. Test: saga rollback on failure
5. Use real services + real repositories + temp workspace

