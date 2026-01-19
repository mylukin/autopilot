# CLI Best Practices for AI Agents

## Overview

This guide provides best practices for calling the ralph-dev CLI from skills and agents to maximize success rates and enable proper error handling.

> 本指南提供了从skills和agents调用ralph-dev CLI的最佳实践，以最大化成功率并启用适当的错误处理。

---

## Core Principles

### 1. Always Use `--json` Flag

**Why**: Enables structured parsing and error handling

> **原因**：启用结构化解析和错误处理

**Example**:
```bash
# ✅ GOOD: Use JSON for programmatic access
RESULT=$(ralph-dev tasks next --json)

# ❌ BAD: Human-readable output is hard to parse
RESULT=$(ralph-dev tasks next)
```

### 2. Parse JSON and Check `success` Field

**Why**: Detect errors before processing data

> **原因**：在处理数据前检测错误

**Example**:
```bash
# Execute command with JSON output
RESULT=$(ralph-dev tasks done task-1 --json)

# Check if command succeeded
if echo "$RESULT" | jq -e '.success == true' > /dev/null; then
  # Success: extract data
  TASK_ID=$(echo "$RESULT" | jq -r '.data.taskId')
  STATUS=$(echo "$RESULT" | jq -r '.data.status')
  echo "✓ Task $TASK_ID is now $STATUS"
else
  # Error: handle failure
  ERROR_CODE=$(echo "$RESULT" | jq -r '.error.code')
  ERROR_MSG=$(echo "$RESULT" | jq -r '.error.message')
  echo "✗ Error [$ERROR_CODE]: $ERROR_MSG"

  # Check if recoverable
  RECOVERABLE=$(echo "$RESULT" | jq -r '.error.recoverable')
  if [ "$RECOVERABLE" = "true" ]; then
    echo "Retrying..."
  else
    exit 1
  fi
fi
```

### 3. Use Dry-Run Mode for Validation

**Why**: Preview changes before execution

> **原因**：在执行前预览更改

**Example**:
```bash
# Preview what would change
ralph-dev tasks done task-1 --dry-run --json

# If preview looks good, execute
ralph-dev tasks done task-1 --json
```

### 4. Use Batch Operations for Bulk Updates

**Why**: 10x faster than individual calls

> **原因**：比单独调用快10倍

**Example**:
```bash
# ❌ BAD: Individual calls (slow)
ralph-dev tasks done task-1 --json
ralph-dev tasks done task-2 --json
ralph-dev tasks done task-3 --json

# ✅ GOOD: Batch operation (fast)
ralph-dev tasks batch --json --operations '[
  {"action": "done", "taskId": "task-1"},
  {"action": "done", "taskId": "task-2"},
  {"action": "done", "taskId": "task-3"}
]'
```

### 5. Use Filters to Reduce Data Transfer

**Why**: Get only what you need, faster

> **原因**：只获取需要的内容，更快

**Example**:
```bash
# ❌ BAD: Get all tasks, filter in bash
ALL_TASKS=$(ralph-dev tasks list --json)
PENDING=$(echo "$ALL_TASKS" | jq '[.data.tasks[] | select(.status == "pending")]')

# ✅ GOOD: Filter at source
PENDING=$(ralph-dev tasks list --status pending --json)
```

---

## Command Patterns

### State Management

#### Get Current State
```bash
# Get state with JSON output
STATE=$(ralph-dev state get --json)

if echo "$STATE" | jq -e '.success == true' > /dev/null; then
  PHASE=$(echo "$STATE" | jq -r '.data.phase')
  ACTIVE=$(echo "$STATE" | jq -r '.data.active')

  if [ "$ACTIVE" = "true" ]; then
    echo "Active session in phase: $PHASE"
  else
    echo "No active session"
  fi
fi
```

#### Update State
```bash
# Update phase
ralph-dev state update --phase implement --json

# Update with error handling
RESULT=$(ralph-dev state update --phase implement --json)
if ! echo "$RESULT" | jq -e '.success == true' > /dev/null; then
  echo "Failed to update state"
  exit 1
fi
```

### Task Management

#### Get Next Task with Full Context
```bash
# Get next task
TASK_JSON=$(ralph-dev tasks next --json)

# Check if task exists
if echo "$TASK_JSON" | jq -e '.success == true' > /dev/null; then
  TASK_ID=$(echo "$TASK_JSON" | jq -r '.data.task.id')
  DESCRIPTION=$(echo "$TASK_JSON" | jq -r '.data.task.description')
  PROGRESS=$(echo "$TASK_JSON" | jq -r '.data.context.progress.percentage')

  echo "Next task: $TASK_ID ($PROGRESS% complete)"
  echo "Description: $DESCRIPTION"
else
  ERROR=$(echo "$TASK_JSON" | jq -r '.error.message')
  echo "No pending tasks: $ERROR"
fi
```

#### Mark Task as Completed (Idempotent)
```bash
# Mark task done - safe to retry
RESULT=$(ralph-dev tasks done auth.login.ui --json)

# Extract result
ALREADY_DONE=$(echo "$RESULT" | jq -r '.data.alreadyCompleted // false')

if [ "$ALREADY_DONE" = "true" ]; then
  echo "⚠ Task was already completed"
else
  echo "✓ Task marked as completed"
fi
```

#### List Tasks with Filters
```bash
# Get ready tasks (dependencies satisfied)
READY_TASKS=$(ralph-dev tasks list \
  --status pending \
  --ready \
  --sort priority \
  --limit 5 \
  --json)

# Extract task IDs
TASK_IDS=$(echo "$READY_TASKS" | jq -r '.data.tasks[].id')
echo "Ready tasks: $TASK_IDS"
```

#### Batch Task Updates (Atomic)
```bash
# Update multiple tasks atomically
RESULT=$(ralph-dev tasks batch --atomic --json --operations '[
  {"action": "done", "taskId": "task-1", "duration": "4m 32s"},
  {"action": "start", "taskId": "task-2"},
  {"action": "fail", "taskId": "task-3", "reason": "Dependency missing"}
]')

# Check if all succeeded
ALL_SUCCESS=$(echo "$RESULT" | jq -r '.data.allSuccessful')
if [ "$ALL_SUCCESS" = "true" ]; then
  echo "✓ All batch operations succeeded"
else
  FAILED=$(echo "$RESULT" | jq -r '.data.failed')
  echo "✗ $FAILED operations failed"
  echo "$RESULT" | jq '.data.results[] | select(.success == false)'
fi
```

### Language Detection

#### Detect and Save Configuration
```bash
# Detect language and save to index
RESULT=$(ralph-dev detect --save --json)

if echo "$RESULT" | jq -e '.success == true' > /dev/null; then
  LANGUAGE=$(echo "$RESULT" | jq -r '.data.languageConfig.language')
  FRAMEWORK=$(echo "$RESULT" | jq -r '.data.languageConfig.framework')
  SAVED=$(echo "$RESULT" | jq -r '.data.saved')

  echo "Detected: $LANGUAGE + $FRAMEWORK"
  [ "$SAVED" = "true" ] && echo "✓ Saved to index metadata"
fi
```

---

## Error Handling Patterns

### Exit Code Checking
```bash
# Capture exit code
ralph-dev tasks done task-1 --json
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "✓ Success"
    ;;
  2)
    echo "✗ Invalid input"
    ;;
  3)
    echo "✗ Task not found"
    ;;
  7)
    echo "✗ Invalid state transition"
    ;;
  *)
    echo "✗ Error: $EXIT_CODE"
    ;;
esac
```

### Recoverable Error Handling
```bash
# Function to execute with retry on recoverable errors
execute_with_retry() {
  local cmd="$1"
  local max_retries=3
  local retry=0

  while [ $retry -lt $max_retries ]; do
    RESULT=$(eval "$cmd")

    if echo "$RESULT" | jq -e '.success == true' > /dev/null; then
      echo "$RESULT"
      return 0
    fi

    # Check if recoverable
    RECOVERABLE=$(echo "$RESULT" | jq -r '.error.recoverable // false')
    if [ "$RECOVERABLE" = "false" ]; then
      echo "$RESULT"
      return 1
    fi

    # Retry
    retry=$((retry + 1))
    echo "⚠ Retry $retry/$max_retries..." >&2
    sleep 2
  done

  echo "$RESULT"
  return 1
}

# Usage
execute_with_retry "ralph-dev tasks done task-1 --json"
```

---

## Performance Optimization

### 1. Use Batch Operations
```bash
# Build operations array
OPERATIONS='[]'
for task_id in task-1 task-2 task-3; do
  OPERATIONS=$(echo "$OPERATIONS" | jq ". + [{\"action\": \"done\", \"taskId\": \"$task_id\"}]")
done

# Execute in single call
ralph-dev tasks batch --operations "$OPERATIONS" --json
```

### 2. Use Pagination for Large Lists
```bash
# Process tasks in batches
OFFSET=0
LIMIT=10

while true; do
  RESULT=$(ralph-dev tasks list \
    --status pending \
    --limit $LIMIT \
    --offset $OFFSET \
    --json)

  RETURNED=$(echo "$RESULT" | jq -r '.data.returned')

  # Process batch
  echo "$RESULT" | jq -r '.data.tasks[].id' | while read task_id; do
    echo "Processing: $task_id"
  done

  # Check if more tasks
  [ "$RETURNED" -lt "$LIMIT" ] && break
  OFFSET=$((OFFSET + LIMIT))
done
```

### 3. Filter at Source
```bash
# ✅ GOOD: Filter server-side
ralph-dev tasks list \
  --status pending \
  --module auth \
  --priority 1 \
  --ready \
  --json

# ❌ BAD: Filter client-side
ralph-dev tasks list --json | jq '...'
```

---

## Common Patterns

### Pattern 1: Safe Task Completion
```bash
complete_task() {
  local task_id="$1"
  local duration="$2"

  # Try with dry-run first
  DRY_RUN=$(ralph-dev tasks done "$task_id" --dry-run --json)

  if ! echo "$DRY_RUN" | jq -e '.success == true' > /dev/null; then
    echo "✗ Dry-run failed for $task_id"
    return 1
  fi

  # Execute actual completion
  RESULT=$(ralph-dev tasks done "$task_id" --duration "$duration" --json)

  if echo "$RESULT" | jq -e '.success == true' > /dev/null; then
    echo "✓ Task $task_id completed"
    return 0
  else
    ERROR=$(echo "$RESULT" | jq -r '.error.message')
    echo "✗ Failed: $ERROR"
    return 1
  fi
}
```

### Pattern 2: Get Task with Dependency Check
```bash
get_next_ready_task() {
  # Get next task with satisfied dependencies
  RESULT=$(ralph-dev tasks list \
    --status pending \
    --ready \
    --sort priority \
    --limit 1 \
    --json)

  if echo "$RESULT" | jq -e '.data.returned > 0' > /dev/null; then
    TASK_ID=$(echo "$RESULT" | jq -r '.data.tasks[0].id')
    echo "$TASK_ID"
    return 0
  else
    return 1
  fi
}
```

### Pattern 3: Progress Tracking
```bash
show_progress() {
  STATS=$(ralph-dev tasks list --json)

  TOTAL=$(echo "$STATS" | jq -r '.data.total')
  COMPLETED=$(echo "$STATS" | jq -r '.data.tasks | map(select(.status == "completed")) | length')
  FAILED=$(echo "$STATS" | jq -r '.data.tasks | map(select(.status == "failed")) | length')
  PENDING=$(echo "$STATS" | jq -r '.data.tasks | map(select(.status == "pending")) | length')

  PERCENTAGE=$(( (COMPLETED * 100) / TOTAL ))

  echo "Progress: $COMPLETED/$TOTAL tasks ($PERCENTAGE%)"
  echo "  ✓ Completed: $COMPLETED"
  echo "  ✗ Failed: $FAILED"
  echo "  ⏳ Pending: $PENDING"
}
```

---

## Anti-Patterns (Avoid These)

### ❌ Don't Parse Human-Readable Output
```bash
# BAD: Fragile parsing
TASK_ID=$(ralph-dev tasks next | grep "ID:" | cut -d':' -f2)

# GOOD: Use JSON
TASK_ID=$(ralph-dev tasks next --json | jq -r '.data.task.id')
```

### ❌ Don't Ignore Exit Codes
```bash
# BAD: Ignore errors
ralph-dev tasks done task-1
# continues even if failed

# GOOD: Check exit codes
ralph-dev tasks done task-1 --json || exit 1
```

### ❌ Don't Use Loops for Bulk Operations
```bash
# BAD: Loop with individual calls
for task in task-1 task-2 task-3; do
  ralph-dev tasks done "$task"
done

# GOOD: Use batch operation
ralph-dev tasks batch --operations '[
  {"action": "done", "taskId": "task-1"},
  {"action": "done", "taskId": "task-2"},
  {"action": "done", "taskId": "task-3"}
]' --json
```

### ❌ Don't Fetch All Data Then Filter
```bash
# BAD: Fetch everything
ralph-dev tasks list --json | jq 'select(.status == "pending")'

# GOOD: Filter at source
ralph-dev tasks list --status pending --json
```

---

## Schema Version Compatibility

All responses include a `schemaVersion` field. Check this for compatibility:

```bash
RESULT=$(ralph-dev tasks list --json)
VERSION=$(echo "$RESULT" | jq -r '.schemaVersion')

if [ "$VERSION" != "1.0.0" ]; then
  echo "⚠ Warning: Unexpected schema version $VERSION"
fi
```

---

## Summary Checklist

When calling ralph-dev CLI from skills:

- ✅ Always use `--json` flag
- ✅ Parse JSON and check `.success` field
- ✅ Handle errors using `.error.code` and `.error.recoverable`
- ✅ Use `--dry-run` for validation before mutation
- ✅ Use batch operations for bulk updates
- ✅ Use filters to reduce data transfer
- ✅ Check exit codes for programmatic error handling
- ✅ Implement retry logic for recoverable errors
- ✅ Use pagination for large datasets

---

**Following these practices will maximize CLI call success rates and enable robust error handling in autonomous workflows.**

> **遵循这些实践将最大化CLI调用成功率，并在自主工作流中启用强大的错误处理。**
