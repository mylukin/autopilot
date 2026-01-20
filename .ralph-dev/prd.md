# Product Requirements Document: Ralph-dev Architecture Refactoring

## Executive Summary

This PRD outlines the implementation of Priority 1 architectural improvements to the Ralph-dev codebase based on multi-expert design pattern review. The goal is to achieve production-readiness through implementation of Service Layer Pattern, Circuit Breaker Pattern, Retry with Exponential Backoff, and Dependency Injection.

## Project Scope

### In Scope
- **Priority 1 Patterns Only:**
  1. Service Layer Pattern - Separate business logic from CLI
  2. Circuit Breaker Pattern - Prevent resource exhaustion in healing
  3. Retry with Exponential Backoff - Handle transient failures
  4. Dependency Injection - Improve testability

- **Full Refactoring:** Complete architectural overhaul with no backward compatibility constraints
- **Comprehensive Coverage:** Refactor all command files (tasks, state, detect)
- **All External Operations:** Protect all I/O and external calls with resilience patterns
- **Layered Architecture:** Implement DDD-style directory structure

### Out of Scope
- Priority 2 patterns (Strategy, Repository, Builder, Observer) - deferred to future phase
- Priority 3 enhancements (Rich Domain Models, Template Method, Integration Tests, Structured Logging) - deferred to future phase

## User Stories

### US-1: Service Layer Pattern
**As a** developer
**I want** business logic separated from CLI presentation layer
**So that** I can reuse logic, test independently, and add new interfaces (REST API) easily

**Acceptance Criteria:**
- AC-1.1: Create `cli/src/services/` directory with service classes
- AC-1.2: Create `cli/src/repositories/` directory with data access classes
- AC-1.3: Create `cli/src/domain/` directory with domain models
- AC-1.4: Create `cli/src/infrastructure/` directory for external concerns (file-system, git, logger)
- AC-1.5: Refactor `commands/tasks.ts` to use TaskService
- AC-1.6: Refactor `commands/state.ts` to use StateService
- AC-1.7: Refactor `commands/detect.ts` to use DetectionService
- AC-1.8: Commands are thin (≤50 lines) - only parse args, call service, format output
- AC-1.9: All business logic moved to services (0% in commands)
- AC-1.10: Services use repositories for all data access (no direct fs calls)

### US-2: Circuit Breaker Pattern
**As a** system operator
**I want** failing operations to fail fast after threshold
**So that** system resources aren't exhausted by repeated failures

**Acceptance Criteria:**
- AC-2.1: Create `cli/src/core/circuit-breaker.ts` with CircuitBreaker class
- AC-2.2: Implement three states: CLOSED, OPEN, HALF_OPEN
- AC-2.3: Configurable failure threshold (default: 5 failures)
- AC-2.4: Configurable timeout for reset attempts (default: 60 seconds)
- AC-2.5: Configurable success threshold for HALF_OPEN → CLOSED (default: 2 successes)
- AC-2.6: Wrap Phase 4 healing agent calls with circuit breaker
- AC-2.7: Log circuit state changes to `.ralph-dev/circuit-breaker.log`
- AC-2.8: Notify user when circuit opens (error message + suggested action)
- AC-2.9: Export circuit breaker metrics for monitoring
- AC-2.10: Unit tests with 90%+ coverage for circuit breaker logic

### US-3: Retry with Exponential Backoff
**As a** developer
**I want** transient failures to be retried automatically
**So that** temporary issues (disk busy, network hiccup) don't fail operations

**Acceptance Criteria:**
- AC-3.1: Create `cli/src/core/retry.ts` with withRetry() function
- AC-3.2: Configurable max attempts (default: 3)
- AC-3.3: Configurable initial delay (default: 100ms)
- AC-3.4: Configurable max delay (default: 5000ms)
- AC-3.5: Configurable backoff multiplier (default: 2x)
- AC-3.6: Configurable retryable error codes (default: EBUSY, ENOENT, EAGAIN, ETIMEDOUT)
- AC-3.7: Wrap all fs.readFile() calls with retry
- AC-3.8: Wrap all fs.writeFile() calls with retry
- AC-3.9: Wrap all git operations with retry
- AC-3.10: Log retry attempts to `.ralph-dev/retry.log`
- AC-3.11: Do NOT retry non-transient errors (validation, not found)
- AC-3.12: Unit tests with 90%+ coverage for retry logic

### US-4: Dependency Injection
**As a** developer
**I want** all dependencies injected via constructors
**So that** I can easily mock them in tests and swap implementations

**Acceptance Criteria:**
- AC-4.1: Define interfaces for all dependencies (IFileSystem, ITaskRepository, IStateManager, ILogger, IGitService)
- AC-4.2: Services accept dependencies via constructor
- AC-4.3: Create factory functions in `cli/src/factories/` for dependency wiring
- AC-4.4: No hardcoded dependencies (no `new` inside services, no direct fs/git calls)
- AC-4.5: No global variables or singletons
- AC-4.6: No direct process.env access in business logic (use config object)
- AC-4.7: Update all tests to use mock dependencies
- AC-4.8: Create `cli/src/test-utils/` with mock factories
- AC-4.9: Test coverage remains ≥84% throughout refactoring
- AC-4.10: Add integration tests using real implementations

## Technical Architecture

### Directory Structure (After Refactoring)

```
cli/src/
├── commands/              # CLI interface (thin layer - presentation only)
│   ├── tasks.command.ts   # CLI routing, argument parsing, output formatting
│   ├── state.command.ts
│   ├── detect.command.ts
│   └── index.ts           # Command registration
├── services/              # Business logic layer
│   ├── task.service.ts    # Task lifecycle management
│   ├── state.service.ts   # State management
│   ├── detection.service.ts # Language detection orchestration
│   ├── saga.service.ts    # Transaction management
│   └── workflow.service.ts # Phase orchestration
├── repositories/          # Data access layer
│   ├── task.repository.ts        # Task persistence
│   ├── state.repository.ts       # State persistence
│   ├── index.repository.ts       # Index management
│   └── interfaces/
│       ├── ITaskRepository.ts
│       ├── IStateRepository.ts
│       └── IIndexRepository.ts
├── domain/                # Domain models (entities with behavior)
│   ├── task.ts            # Task entity
│   ├── state.ts           # State entity
│   ├── saga.ts            # Saga entity
│   └── language-config.ts # Language configuration
├── infrastructure/        # External concerns (implementations)
│   ├── file-system.ts     # File I/O with retry
│   ├── git.service.ts     # Git operations with retry
│   ├── logger.ts          # Logging service
│   └── interfaces/
│       ├── IFileSystem.ts
│       ├── IGitService.ts
│       └── ILogger.ts
├── core/                  # Core utilities and patterns
│   ├── circuit-breaker.ts      # Circuit breaker implementation
│   ├── retry.ts                # Retry with exponential backoff
│   ├── saga-manager.ts         # Saga pattern (existing)
│   ├── structured-output.ts    # Agent output parsing (existing)
│   ├── task-parser.ts          # YAML frontmatter parsing (existing)
│   ├── task-writer.ts          # Task file generation (existing)
│   ├── error-handler.ts        # Error handling (existing)
│   ├── response-wrapper.ts     # CLI response formatting (existing)
│   ├── exit-codes.ts           # Exit codes (existing)
│   └── ci-mode.ts              # CI/CD integration (existing)
├── factories/             # Dependency injection wiring
│   ├── service.factory.ts     # Create services with dependencies
│   ├── repository.factory.ts  # Create repositories
│   └── infrastructure.factory.ts # Create infrastructure services
├── test-utils/            # Testing utilities
│   ├── mock-file-system.ts    # Mock IFileSystem
│   ├── mock-git-service.ts    # Mock IGitService
│   ├── mock-repositories.ts   # Mock repositories
│   └── test-data.ts           # Test fixtures
└── index.ts               # CLI entry point
```

### Service Layer Pattern

**Responsibilities by Layer:**

1. **Commands (Presentation):**
   - Parse command-line arguments
   - Call appropriate service method
   - Format output (JSON or human-readable)
   - Handle user interaction (prompts, confirmations)
   - Max 50 lines per command handler

2. **Services (Business Logic):**
   - Implement business rules
   - Orchestrate workflows
   - Call repositories for data
   - Emit domain events
   - Use infrastructure services for external operations

3. **Repositories (Data Access):**
   - Abstract persistence mechanism
   - Hide file system details
   - Manage index.json updates
   - Return domain models, not raw data

4. **Domain Models (Entities):**
   - Encapsulate business rules
   - Enforce invariants
   - Provide behavior methods (canStart(), complete(), etc.)
   - No external dependencies

5. **Infrastructure (External Concerns):**
   - File system operations
   - Git operations
   - Logging
   - External API calls

### Circuit Breaker Implementation

**Class: CircuitBreaker**

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Fast-fail mode
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number;     // Open after N failures (default: 5)
  successThreshold: number;     // Close after N successes in HALF_OPEN (default: 2)
  timeout: number;              // Reset attempt delay in ms (default: 60000)
}

class CircuitBreaker {
  async execute<T>(operation: () => Promise<T>): Promise<T>
  getState(): CircuitState
  getMetrics(): CircuitBreakerMetrics
}
```

**Usage:**
- Wrap Phase 4 healing agent invocations
- Prevent infinite healing loops
- Fast-fail when circuit is OPEN
- Auto-reset after timeout

### Retry Pattern Implementation

**Function: withRetry**

```typescript
interface RetryConfig {
  maxAttempts: number;          // Default: 3
  initialDelay: number;         // Default: 100ms
  maxDelay: number;             // Default: 5000ms
  backoffMultiplier: number;    // Default: 2
  retryableErrors: string[];    // Default: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT']
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T>
```

**Usage:**
- Wrap all fs.readFile() calls
- Wrap all fs.writeFile() calls
- Wrap all git operations
- Do NOT retry validation errors or not-found errors

### Dependency Injection Pattern

**Example Service:**

```typescript
interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(filter?: TaskFilter): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
}

class TaskService {
  constructor(
    private taskRepo: ITaskRepository,
    private stateRepo: IStateRepository,
    private logger: ILogger,
    private eventPublisher: EventPublisher
  ) {}

  async startTask(taskId: string): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    // Business logic...
  }
}
```

**Factory Function:**

```typescript
function createTaskService(): TaskService {
  const fileSystem = createFileSystem(); // with retry
  const taskRepo = createTaskRepository(fileSystem);
  const stateRepo = createStateRepository(fileSystem);
  const logger = createLogger();
  const eventPublisher = createEventPublisher();

  return new TaskService(taskRepo, stateRepo, logger, eventPublisher);
}
```

## Implementation Plan

### Phase 1: Infrastructure Foundation (Week 1)
- **Task 1.1:** Create directory structure (services/, repositories/, domain/, infrastructure/, factories/, test-utils/)
- **Task 1.2:** Implement Circuit Breaker class with unit tests
- **Task 1.3:** Implement Retry utility with unit tests
- **Task 1.4:** Create IFileSystem interface and implementation with retry
- **Task 1.5:** Create IGitService interface and implementation with retry
- **Task 1.6:** Create ILogger interface and implementation
- **Task 1.7:** Create mock factories for testing

### Phase 2: Repository Layer (Week 1-2)
- **Task 2.1:** Define ITaskRepository interface
- **Task 2.2:** Implement FileSystemTaskRepository with retry
- **Task 2.3:** Write unit tests for TaskRepository (use mock file system)
- **Task 2.4:** Define IStateRepository interface
- **Task 2.5:** Implement FileSystemStateRepository with retry
- **Task 2.6:** Write unit tests for StateRepository
- **Task 2.7:** Define IIndexRepository interface
- **Task 2.8:** Implement FileSystemIndexRepository (refactor IndexManager)
- **Task 2.9:** Write unit tests for IndexRepository

### Phase 3: Domain Models (Week 2)
- **Task 3.1:** Create Task domain model with behavior methods
- **Task 3.2:** Create State domain model with phase transition logic
- **Task 3.3:** Create LanguageConfig domain model
- **Task 3.4:** Write unit tests for domain models (pure logic, no mocks)

### Phase 4: Service Layer (Week 2-3)
- **Task 4.1:** Create TaskService with DI
- **Task 4.2:** Write unit tests for TaskService (use mock repositories)
- **Task 4.3:** Create StateService with DI
- **Task 4.4:** Write unit tests for StateService
- **Task 4.5:** Create DetectionService with DI
- **Task 4.6:** Write unit tests for DetectionService
- **Task 4.7:** Create SagaService (refactor existing SagaManager)
- **Task 4.8:** Write unit tests for SagaService
- **Task 4.9:** Add circuit breaker to healing operations

### Phase 5: Command Refactoring (Week 3)
- **Task 5.1:** Refactor commands/tasks.ts to use TaskService
- **Task 5.2:** Refactor commands/state.ts to use StateService
- **Task 5.3:** Refactor commands/detect.ts to use DetectionService
- **Task 5.4:** Update command tests to use real services + mock repositories
- **Task 5.5:** Add integration tests for end-to-end workflows

### Phase 6: Verification & Documentation (Week 4)
- **Task 6.1:** Run full test suite, ensure ≥84% coverage
- **Task 6.2:** Run manual smoke tests (all CLI commands)
- **Task 6.3:** Update CLAUDE.md with new architecture
- **Task 6.4:** Create migration guide (if any breaking changes)
- **Task 6.5:** Update README with new architecture diagram

## Testing Strategy

### Unit Tests
- **Target:** 90%+ coverage for new code (circuit breaker, retry, services, repositories)
- **Approach:** Use mock dependencies via DI
- **Tools:** Vitest with vi.fn() mocks
- **Example:**
  ```typescript
  describe('TaskService', () => {
    it('should start task and update state', async () => {
      const mockRepo = { findById: vi.fn().mockResolvedValue(testTask) };
      const service = new TaskService(mockRepo, ...);
      await service.startTask('test.task');
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });
  ```

### Integration Tests
- **Target:** End-to-end workflows (create task → start → complete)
- **Approach:** Use real services + real repositories + in-memory file system
- **Tools:** Vitest with memfs or temp directories
- **Example:**
  ```typescript
  describe('Task Lifecycle Integration', () => {
    it('should create, start, and complete task', async () => {
      const workspace = createTempWorkspace();
      const service = createTaskService(workspace);

      await service.createTask({ id: 'test.task', ... });
      await service.startTask('test.task');
      await service.completeTask('test.task', 300);

      const task = await service.getTask('test.task');
      expect(task.status).toBe('completed');
    });
  });
  ```

### Manual Testing Checklist
- [ ] `ralph-dev tasks create` works
- [ ] `ralph-dev tasks list` works
- [ ] `ralph-dev tasks start <id>` works
- [ ] `ralph-dev tasks done <id>` works
- [ ] `ralph-dev state get` works
- [ ] `ralph-dev state set --phase <phase>` works
- [ ] `ralph-dev detect` works
- [ ] Full workflow: clarify → breakdown → implement → deliver
- [ ] Circuit breaker opens after 5 healing failures
- [ ] Retry recovers from EBUSY file errors

## Success Metrics

### Code Quality
- ✅ Test coverage ≥84% (maintain current level)
- ✅ New code coverage ≥90%
- ✅ 0 business logic in commands (all in services)
- ✅ All external operations protected by retry
- ✅ Circuit breaker prevents infinite loops

### Architecture
- ✅ Clear layered structure: Commands → Services → Repositories → Domain
- ✅ All dependencies injected (0 hardcoded dependencies)
- ✅ All services testable with mocks
- ✅ Repository pattern abstracts persistence

### Reliability
- ✅ Transient failures auto-recover (file I/O, git)
- ✅ Healing phase protected by circuit breaker
- ✅ Circuit state logged and monitorable
- ✅ Retry attempts logged for debugging

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test coverage drops below 84% | Medium | High | Run coverage after each task, block PR if below threshold |
| Breaking existing workflows | Low | High | Comprehensive integration tests, manual smoke testing |
| Performance regression | Low | Medium | Benchmark critical paths (task creation, file I/O) |
| Over-engineering | Medium | Medium | Focus only on Priority 1 patterns, defer complex patterns |

## Out of Scope (Future Work)

### Priority 2: Architecture Improvements
- Strategy Pattern for language detection
- Repository Pattern already in Priority 1 ✅
- Builder Pattern for task creation
- Observer Pattern for progress monitoring

### Priority 3: Code Quality Enhancements
- Rich domain models (partial implementation in Priority 1)
- Template Method for sagas
- Integration tests (partial implementation in Priority 1)
- Structured logging (JSON logs)

## References

- [CLAUDE.md](../CLAUDE.md) - Project architectural guidelines
- [cli/CLAUDE.md](../cli/CLAUDE.md) - CLI-specific implementation details
- Expert review document (source of requirements)

## Approval

- [x] User approved Priority 1 implementation
- [x] User approved full refactoring (no backward compatibility)
- [x] User approved incremental approach
- [x] User approved comprehensive testing strategy

---

**Document Version:** 1.0
**Created:** 2026-01-20
**Status:** APPROVED
