---
id: repositories.index-repository
module: repositories
priority: 2
status: completed
estimatedMinutes: 25
dependencies:
  - infrastructure.file-system
  - infrastructure.test-mocks
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Create IIndexRepository (refactor IndexManager)

## Acceptance Criteria

1. Define IIndexRepository interface
2. Refactor existing IndexManager to FileSystemIndexRepository
3. Use IFileSystem with retry
4. Unit tests with mock file system


## Notes

Completed in 25m
