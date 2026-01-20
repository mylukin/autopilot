---
id: infrastructure.circuit-breaker
module: infrastructure
priority: 1
status: completed
estimatedMinutes: 30
dependencies:
  - infrastructure.directories
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Implement Circuit Breaker pattern

## Acceptance Criteria

1. Create CircuitBreaker class with CLOSED/OPEN/HALF_OPEN states
2. Configurable failure threshold (default: 5)
3. Configurable timeout (default: 60000ms)
4. Configurable success threshold (default: 2)
5. Unit tests with 90%+ coverage


## Notes

Completed in 10m
