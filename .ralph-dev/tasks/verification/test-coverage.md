---
id: verification.test-coverage
module: verification
priority: 5
status: pending
estimatedMinutes: 20
dependencies:
  - commands.integration-tests
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Verify test coverage ≥84%

## Acceptance Criteria

1. Run npm test with coverage
2. Ensure overall coverage ≥84%
3. Ensure new code coverage ≥90%
4. Fix any coverage gaps

