---
id: verification.smoke-tests
module: verification
priority: 5
status: pending
estimatedMinutes: 25
dependencies:
  - verification.test-coverage
---

# Run manual smoke tests for all CLI commands

## Acceptance Criteria

1. Test ralph-dev tasks create/list/start/done
2. Test ralph-dev state get/set/update
3. Test ralph-dev detect
4. Test full workflow: clarify → breakdown → implement → deliver
5. Document any issues found

