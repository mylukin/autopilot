---
id: commands.detect-command
module: commands
priority: 4
status: pending
estimatedMinutes: 25
dependencies:
  - services.detection-service
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Refactor commands/detect.ts to use DetectionService

## Acceptance Criteria

1. Reduce detect.ts to thin layer
2. Remove business logic
3. Use dependency injection
4. Update tests

