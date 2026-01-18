---
name: phase-4-heal
description: Auto-healing system using WebSearch for error recovery with 3-retry limit
allowed-tools: [Read, Write, Bash, WebSearch, Grep, Glob]
user-invocable: false
---

# Phase 4: Auto-Heal

## Overview | 概述

Automatically heal implementation errors using WebSearch to find solutions, apply fixes, and verify results. Maximum 3 retry attempts per error.

使用 WebSearch 自动修复实现错误，查找解决方案、应用修复并验证结果。每个错误最多重试 3 次。

## When to Use | 何时使用

Invoked by phase-3-implement when a task implementation fails, or manually when errors need automatic recovery.

## Input | 输入

- Task ID: `{task_id}`
- Error message: `{error_msg}`
- Error context: Stack trace, test output, or build logs

## Execution | 执行

### Step 1: Capture Error Context

```bash
# Get task details
TASK_JSON=$(autopilot-cli tasks get "$TASK_ID" --json)
TASK_DESC=$(echo "$TASK_JSON" | jq -r '.description')

# Extract error details
echo "🔍 Analyzing error..."
echo "Task: $TASK_ID"
echo "Error: $ERROR_MSG"
echo ""

# Determine error type
ERROR_TYPE=$(classify_error "$ERROR_MSG")
echo "Error type: $ERROR_TYPE"
```

### Step 2: Search for Solutions

```bash
# Construct search query based on error type
SEARCH_QUERY=$(build_search_query "$ERROR_TYPE" "$ERROR_MSG" "$TASK_JSON")

echo "🔎 Searching for solutions..."
echo "Query: $SEARCH_QUERY"
echo ""

# Use WebSearch tool to find solutions
# In actual implementation, use:
# Use WebSearch tool with:
#   query: "$SEARCH_QUERY"
#
# Expected result: Top 3-5 relevant solutions with:
# - Error explanation
# - Solution steps
# - Code examples
# - Common pitfalls

# For now, simulate search results
SEARCH_RESULTS='[
  {
    "title": "How to fix {error}",
    "url": "https://stackoverflow.com/...",
    "solution": "Step 1...\nStep 2...",
    "code": "example code"
  }
]'
```

### Step 3: Apply Fix (with retry logic)

```bash
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔧 Healing Attempt $((RETRY_COUNT + 1))/$MAX_RETRIES"
  echo ""

  # Select best solution from search results
  SOLUTION=$(select_best_solution "$SEARCH_RESULTS" "$ERROR_TYPE")

  # Extract fix steps
  FIX_STEPS=$(echo "$SOLUTION" | jq -r '.solution')

  echo "Applying fix:"
  echo "$FIX_STEPS"
  echo ""

  # Apply the fix
  apply_fix "$SOLUTION" "$TASK_JSON"
  FIX_STATUS=$?

  if [ $FIX_STATUS -ne 0 ]; then
    echo "⚠️  Fix application failed"
    RETRY_COUNT=$((RETRY_COUNT + 1))
    continue
  fi

  # Verify the fix
  echo "✓ Fix applied"
  echo ""
  echo "🧪 Verifying fix..."

  # Re-run task verification
  VERIFY_RESULT=$(verify_task "$TASK_ID")
  VERIFY_STATUS=$?

  if [ $VERIFY_STATUS -eq 0 ]; then
    echo "✅ Verification passed!"
    echo ""
    echo "📊 Healing Summary:"
    echo "   Attempts: $((RETRY_COUNT + 1))"
    echo "   Solution: $(echo "$SOLUTION" | jq -r '.title')"
    echo "   Source: $(echo "$SOLUTION" | jq -r '.url')"
    echo ""
    return 0
  else
    echo "❌ Verification failed"
    echo "Error: $VERIFY_RESULT"
    echo ""
    RETRY_COUNT=$((RETRY_COUNT + 1))

    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "🔄 Retrying with alternative solution..."
      echo ""
      # Try next solution in next iteration
      SEARCH_RESULTS=$(remove_failed_solution "$SEARCH_RESULTS" "$SOLUTION")
    fi
  fi
done

# All retries exhausted
echo "❌ Healing failed after $MAX_RETRIES attempts"
echo ""
return 1
```

### Step 4: Return Result

```bash
# Return structured result
cat <<EOF
---HEAL RESULT---
task_id: $TASK_ID
status: $([ $VERIFY_STATUS -eq 0 ] && echo "healed" || echo "failed")
attempts: $RETRY_COUNT
solution_applied: $(echo "$SOLUTION" | jq -r '.title')
source_url: $(echo "$SOLUTION" | jq -r '.url')
---END HEAL RESULT---
EOF
```

## Helper Functions | 辅助函数

### Classify Error

```bash
classify_error() {
  local ERROR_MSG=$1

  case "$ERROR_MSG" in
    *"Module"*"not found"*)
      echo "missing_dependency"
      ;;
    *"Cannot find module"*)
      echo "missing_dependency"
      ;;
    *"TypeError"*)
      echo "type_error"
      ;;
    *"ReferenceError"*)
      echo "undefined_reference"
      ;;
    *"SyntaxError"*)
      echo "syntax_error"
      ;;
    *"Test failed"*|*"Expected"*"but got"*)
      echo "test_failure"
      ;;
    *"build failed"*|*"compilation error"*)
      echo "build_error"
      ;;
    *)
      echo "unknown_error"
      ;;
  esac
}
```

### Build Search Query

```bash
build_search_query() {
  local ERROR_TYPE=$1
  local ERROR_MSG=$2
  local TASK_JSON=$3

  # Extract language and framework from task metadata
  local LANGUAGE=$(echo "$TASK_JSON" | jq -r '.metadata.language // "TypeScript"')
  local FRAMEWORK=$(echo "$TASK_JSON" | jq -r '.metadata.framework // "Node.js"')

  case "$ERROR_TYPE" in
    missing_dependency)
      # Extract module name from error
      MODULE=$(echo "$ERROR_MSG" | grep -oP "(?<=Module ').*(?=' not found)" || \
               echo "$ERROR_MSG" | grep -oP "(?<=Cannot find module ').*(?=')")
      echo "$LANGUAGE $FRAMEWORK install $MODULE dependency"
      ;;
    type_error)
      echo "$LANGUAGE $FRAMEWORK TypeError $ERROR_MSG fix"
      ;;
    test_failure)
      echo "$LANGUAGE $FRAMEWORK test failure $ERROR_MSG how to fix"
      ;;
    build_error)
      echo "$LANGUAGE $FRAMEWORK build error $ERROR_MSG solution"
      ;;
    *)
      echo "$LANGUAGE $FRAMEWORK $ERROR_MSG fix"
      ;;
  esac
}
```

### Select Best Solution

```bash
select_best_solution() {
  local SEARCH_RESULTS=$1
  local ERROR_TYPE=$2

  # In real implementation, rank solutions by:
  # 1. Relevance to error type
  # 2. Recency (prefer newer solutions)
  # 3. Source reputation (Stack Overflow, official docs)
  # 4. Code completeness

  # For now, select first result
  echo "$SEARCH_RESULTS" | jq '.[0]'
}
```

### Apply Fix

```bash
apply_fix() {
  local SOLUTION=$1
  local TASK_JSON=$2

  local FIX_TYPE=$(echo "$SOLUTION" | jq -r '.fixType // "code"')

  case "$FIX_TYPE" in
    dependency)
      # Install missing dependency
      PACKAGE=$(echo "$SOLUTION" | jq -r '.package')
      VERSION=$(echo "$SOLUTION" | jq -r '.version // "latest"')

      echo "📦 Installing $PACKAGE@$VERSION..."
      npm install "$PACKAGE@$VERSION" 2>&1

      return $?
      ;;

    code)
      # Apply code changes
      FILE_PATH=$(echo "$SOLUTION" | jq -r '.filePath')
      CODE_CHANGE=$(echo "$SOLUTION" | jq -r '.code')

      echo "📝 Applying code change to $FILE_PATH..."

      # Use Edit tool to apply change
      # In real implementation:
      # Use Edit tool with:
      #   file_path: "$FILE_PATH"
      #   old_string: "..." (from solution)
      #   new_string: "$CODE_CHANGE"

      return 0
      ;;

    config)
      # Update configuration file
      CONFIG_FILE=$(echo "$SOLUTION" | jq -r '.configFile')
      CONFIG_CHANGE=$(echo "$SOLUTION" | jq -r '.config')

      echo "⚙️  Updating $CONFIG_FILE..."

      # Apply config change
      # (implementation depends on config format)

      return 0
      ;;

    *)
      echo "⚠️  Unknown fix type: $FIX_TYPE"
      return 1
      ;;
  esac
}
```

### Verify Task

```bash
verify_task() {
  local TASK_ID=$1

  # Get task's test pattern
  TASK_JSON=$(autopilot-cli tasks get "$TASK_ID" --json)
  TEST_PATTERN=$(echo "$TASK_JSON" | jq -r '.testRequirements.unit.pattern // "**/*.test.*"')

  # Run tests for this task
  echo "Running tests: $TEST_PATTERN"

  # Determine test command from project language
  LANGUAGE=$(echo "$TASK_JSON" | jq -r '.metadata.language // "TypeScript"')

  case "$LANGUAGE" in
    TypeScript|JavaScript)
      npm test -- "$TEST_PATTERN" 2>&1
      ;;
    Python)
      pytest "$TEST_PATTERN" 2>&1
      ;;
    Go)
      go test "$TEST_PATTERN" 2>&1
      ;;
    *)
      echo "Unknown language: $LANGUAGE"
      return 1
      ;;
  esac

  return $?
}
```

### Remove Failed Solution

```bash
remove_failed_solution() {
  local SEARCH_RESULTS=$1
  local FAILED_SOLUTION=$2

  # Remove failed solution from results
  local FAILED_TITLE=$(echo "$FAILED_SOLUTION" | jq -r '.title')

  echo "$SEARCH_RESULTS" | jq --arg title "$FAILED_TITLE" \
    'map(select(.title != $title))'
}
```

## Error Type Handling | 错误类型处理

| Error Type | WebSearch Strategy | Fix Strategy |
|------------|-------------------|--------------|
| `missing_dependency` | "{language} install {module}" | npm/pip/cargo install |
| `type_error` | "{language} TypeError {message}" | Code correction |
| `undefined_reference` | "{language} ReferenceError {var}" | Add import/declaration |
| `syntax_error` | "{language} syntax error {snippet}" | Code correction |
| `test_failure` | "{language} test {assertion} fix" | Implementation fix |
| `build_error` | "{language} {framework} build error" | Config or code fix |

## WebSearch Query Examples | WebSearch 查询示例

```bash
# Missing dependency
"npm install bcrypt"
"pip install requests"
"go get github.com/..."

# Type error
"TypeScript TypeError cannot read property fix"
"Python TypeError int object not callable"

# Test failure
"React Hook Form validation test failure fix"
"pytest assertion error expected vs actual"

# Build error
"Next.js build error module not found"
"Vite build failed cannot resolve path"
```

## Healing Strategies | 修复策略

### Strategy 1: Dependency Installation

When error matches "Module not found" pattern:

1. Extract module name from error message
2. Search: "{package_manager} install {module}"
3. Find official package and version
4. Install: `npm install {module}@{version}`
5. Verify: Re-run tests

### Strategy 2: Code Correction

When error is type/syntax/reference error:

1. Extract error location (file:line)
2. Read surrounding code context
3. Search: "{language} {error_type} {context} fix"
4. Apply code change using Edit tool
5. Verify: Re-run tests

### Strategy 3: Configuration Fix

When error is build/config related:

1. Identify config file (tsconfig.json, vite.config.ts, etc.)
2. Search: "{tool} {config} {error} solution"
3. Apply config change
4. Verify: Re-run build

## Progress Updates | 进度更新

Show healing progress:

```
🔧 Invoking auto-heal for task: auth.signup.api

🔍 Analyzing error...
   Task: auth.signup.api
   Error: Module 'bcrypt' not found
   Type: missing_dependency

🔎 Searching for solutions...
   Query: npm install bcrypt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Healing Attempt 1/3

Applying fix:
1. Install bcrypt package
2. Version: 5.1.0 (stable)

📦 Installing bcrypt@5.1.0...
✓ bcrypt@5.1.0 installed successfully

🧪 Verifying fix...
Running tests: tests/auth/**/*.test.ts
✅ 8/8 tests passed

✅ Verification passed!

📊 Healing Summary:
   Attempts: 1
   Solution: How to install bcrypt in Node.js
   Source: https://npmjs.com/package/bcrypt

🎉 Task healed successfully!
```

For failures:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Healing Attempt 3/3

Applying fix:
1. Update TypeScript config
2. Add "esModuleInterop": true

⚙️  Updating tsconfig.json...
✓ Config updated

🧪 Verifying fix...
Running tests: tests/auth/**/*.test.ts
❌ 2/8 tests failed
   - should hash password: TypeError still present

❌ Verification failed
Error: Type error persists after config change

❌ Healing failed after 3 attempts

💡 Manual intervention required:
   - Review error details above
   - Check task file: ai/tasks/auth/signup.api.md
   - Task marked as 'failed' in index
```

## Rules | 规则

1. **Maximum 3 retries** - Stop after 3 failed healing attempts
2. **One solution at a time** - Don't apply multiple fixes simultaneously
3. **Verify after each fix** - Always run tests/build after applying fix
4. **Use WebSearch** - Don't guess solutions, search for proven answers
5. **Prefer official sources** - npm docs, official framework docs over blog posts
6. **Log all attempts** - Record what was tried for manual review if healing fails
7. **Clean state** - Revert failed fixes before trying next solution

## Notes | 注意事项

- Healing works best for common errors (missing dependencies, type errors)
- Complex logic errors may need human intervention
- Always verify fixes with tests, not just successful builds
- WebSearch results quality determines healing success rate
- 3-retry limit prevents infinite loops on unsolvable errors
- Failed healing should mark task as 'failed' for manual review
