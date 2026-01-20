---
id: repositories.task-repository
module: repositories
priority: 2
status: completed
estimatedMinutes: 30
dependencies:
  - infrastructure.file-system
  - infrastructure.test-mocks
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Create ITaskRepository and FileSystemTaskRepository

## Acceptance Criteria

1. Define ITaskRepository interface
2. Implement findById, findAll, save, delete, findNext
3. Use IFileSystem with retry for file operations
4. Update index.json automatically on save/delete
5. Unit tests with mock file system (90%+ coverage)


## Notes

Completed in 25m
