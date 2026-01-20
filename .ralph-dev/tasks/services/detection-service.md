---
id: services.detection-service
module: services
priority: 3
status: pending
estimatedMinutes: 30
dependencies:
  - infrastructure.file-system
  - domain.language-config
  - infrastructure.test-mocks
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Create DetectionService with dependency injection

## Acceptance Criteria

1. Create DetectionService class with constructor injection
2. Refactor existing detection logic
3. Use IFileSystem for directory scanning
4. Use LanguageConfig domain model
5. Unit tests with mock file system

