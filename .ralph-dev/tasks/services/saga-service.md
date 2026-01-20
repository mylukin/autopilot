---
id: services.saga-service
module: services
priority: 3
status: pending
estimatedMinutes: 30
dependencies:
  - repositories.task-repository
  - repositories.state-repository
  - infrastructure.git-service
  - infrastructure.test-mocks
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Refactor SagaManager to SagaService with DI

## Acceptance Criteria

1. Create SagaService class with constructor injection
2. Refactor existing SagaManager logic
3. Use repositories and git service
4. Unit tests with mock dependencies

