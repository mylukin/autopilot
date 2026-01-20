---
id: domain.language-config
module: domain
priority: 2
status: completed
estimatedMinutes: 20
dependencies:
  - infrastructure.directories
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Create LanguageConfig domain model

## Acceptance Criteria

1. Create LanguageConfig class
2. Encapsulate language, framework, test commands
3. Provide getVerifyCommands() method
4. Unit tests


## Notes

Completed in 20m
