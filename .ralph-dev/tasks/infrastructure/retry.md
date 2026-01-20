---
id: infrastructure.retry
module: infrastructure
priority: 1
status: completed
estimatedMinutes: 25
dependencies:
  - infrastructure.directories
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Implement Retry with Exponential Backoff

## Acceptance Criteria

1. Create withRetry() function
2. Configurable max attempts, delays, backoff multiplier
3. Configurable retryable error codes
4. Do NOT retry non-transient errors
5. Unit tests with 90%+ coverage


## Notes

Completed in 12m
