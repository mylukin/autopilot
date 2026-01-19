---
name: dev-orchestrator
description: Autonomous end-to-end development from requirement to delivery. Use when user wants complete automation, "build X for me", or full feature implementation without manual steps.
allowed-tools: [Task, Read, Write, Bash]
user-invocable: true
---

# Ralph-dev Orchestrator

## Overview

You are the ralph-dev system orchestrator. Your mission: Transform a user requirement into delivered, tested, production-ready code with ZERO manual intervention after initial clarification.

## Workflow Phases

```
1. CLARIFY    → Questions & PRD (interactive)
2. BREAKDOWN  → Atomic tasks (autonomous)
3. IMPLEMENT  → Code + tests (autonomous)
4. HEAL       → Auto-fix errors (on-demand)
5. DELIVER    → Verify + commit + PR (autonomous)
```

## State Management

All state persists in `.ralph-dev/`:
- `state.json` - Current phase, progress, errors (managed by CLI)
- `prd.md` - Product requirements document
- `tasks/` - Modular task storage (agent-ralph-dev style)
- `tasks/index.json` - Task index (managed by CLI)
- `progress.log` - Audit trail
- `debug.log` - Error recovery log

## Execution

### Initialize

```bash
# Change to project root
cd $PROJECT_ROOT

# Detect project language and save configuration
ralph-dev detect --save

# Check if resuming existing session or starting new
CURRENT_STATE=$(ralph-dev state get --json 2>/dev/null)

if echo "$CURRENT_STATE" | jq -e '.phase' > /dev/null 2>&1; then
  CURRENT_PHASE=$(echo "$CURRENT_STATE" | jq -r '.phase')
  echo "🔄 Resuming from phase: $CURRENT_PHASE"
else
  # New session - initialize to clarify phase
  ralph-dev state set --phase clarify
  CURRENT_PHASE="clarify"
  echo "🚀 Starting new Ralph-dev session"
fi
```

### Main Execution Loop (Context-Compression Resilient)

**CRITICAL:** This loop is state-driven and can recover from context compression at any point.

```bash
# Store user requirement for clarify phase
USER_REQUIREMENT="$1"  # From skill invocation

# Loop start time for safety timeout
ORCHESTRATOR_START_TIME=$(date +%s)
MAX_ORCHESTRATOR_DURATION=$((12 * 3600))  # 12 hours max

while true; do
  # ═══════════════════════════════════════════
  # SAFETY: Timeout check (context-compression safe)
  # ═══════════════════════════════════════════
  CURRENT_TIME=$(date +%s)
  ELAPSED_TIME=$((CURRENT_TIME - ORCHESTRATOR_START_TIME))

  if [ $ELAPSED_TIME -gt $MAX_ORCHESTRATOR_DURATION ]; then
    echo "❌ CRITICAL ERROR: Orchestrator exceeded $MAX_ORCHESTRATOR_DURATION seconds!"
    echo "   Elapsed: $(($ELAPSED_TIME / 3600)) hours"
    echo "   This likely indicates a stuck phase. Check logs."
    exit 1
  fi

  # ═══════════════════════════════════════════
  # RE-QUERY current phase from CLI (context-compression safe)
  # ═══════════════════════════════════════════
  CURRENT_STATE=$(ralph-dev state get --json 2>/dev/null)

  if ! echo "$CURRENT_STATE" | jq -e '.phase' > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot read state from CLI"
    echo "   Run: ralph-dev state get --json"
    exit 1
  fi

  CURRENT_PHASE=$(echo "$CURRENT_STATE" | jq -r '.phase')

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📍 Current Phase: $CURRENT_PHASE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # ═══════════════════════════════════════════
  # PHASE DISPATCH: Execute current phase
  # ═══════════════════════════════════════════
  case "$CURRENT_PHASE" in
    clarify)
      # Phase 1 logic (see below)
      execute_phase_1_clarify
      # Phase 1 updates state to "breakdown" on success
      continue
      ;;

    breakdown)
      # Phase 2 logic (see below)
      execute_phase_2_breakdown
      # Phase 2 updates state to "implement" on success
      continue
      ;;

    implement)
      # Phase 3 logic (see below)
      execute_phase_3_implement
      # Phase 3 updates state to "deliver" on success
      continue
      ;;

    deliver)
      # Phase 5 logic (see below)
      execute_phase_5_deliver
      # Phase 5 updates state to "complete" on success
      continue
      ;;

    complete)
      echo "✅ All phases complete!"
      echo ""
      break
      ;;

    *)
      echo "❌ ERROR: Unknown phase: $CURRENT_PHASE"
      echo "   Valid phases: clarify, breakdown, implement, deliver, complete"
      exit 1
      ;;
  esac
done
```

### Phase 1: CLARIFY (Interactive)

**Function: execute_phase_1_clarify**

```bash
execute_phase_1_clarify() {
  echo "🚀 Starting Ralph-dev..."
  echo ""
  echo "Requirement: $USER_REQUIREMENT"
  echo "Mode: Full autonomous development"
  echo "Phases: 5 (Clarify → Breakdown → Implement → Heal → Deliver)"
  echo ""
  echo "Phase 1/5: Clarifying requirements..."
  echo ""

  # Delegate to phase-1-clarify skill using Task tool
  # NOTE: This is placeholder - actual implementation uses Task tool
  # Use the Task tool to invoke:
  #   subagent_type: "phase-1-clarify"
  #   prompt: "User requirement: $USER_REQUIREMENT
  #
  #   Execute requirement clarification:
  #   1. Ask 3-5 structured questions with lettered options
  #   2. Generate detailed PRD from answers
  #   3. Save to .ralph-dev/prd.md
  #   4. Return completion signal"

  # Wait for phase-1-clarify to complete
  # Expected output:
  # ---PHASE RESULT---
  # phase: clarify
  # status: complete
  # output_file: .ralph-dev/prd.md
  # next_phase: breakdown
  # ---END PHASE RESULT---

  # Verify PRD was created
  if [ ! -f ".ralph-dev/prd.md" ]; then
    echo "❌ ERROR: Phase 1 did not create PRD file"
    exit 1
  fi

  # Update state to breakdown (phase completed successfully)
  ralph-dev state update --phase breakdown
  echo "✅ Phase 1 complete: PRD generated"
  echo ""
}
```

### Phase 2: BREAKDOWN (Autonomous)

**Function: execute_phase_2_breakdown**

```bash
execute_phase_2_breakdown() {
  echo "Phase 2/5: Breaking down into tasks..."
  echo ""

  # Read PRD (context-compression safe - from file)
  if [ ! -f ".ralph-dev/prd.md" ]; then
    echo "❌ ERROR: PRD file not found (.ralph-dev/prd.md)"
    exit 1
  fi

  PRD=$(cat .ralph-dev/prd.md)

  # Delegate to phase-2-breakdown skill using Task tool
  # NOTE: This is placeholder - actual implementation uses Task tool
  # Use the Task tool to invoke:
  #   subagent_type: "phase-2-breakdown"
  #   prompt: "PRD Content: $PRD
  #
  #   Execute task breakdown:
  #   1. Extract user stories from PRD
  #   2. Convert each story to 1-3 atomic tasks (max 30 min each)
  #   3. Use CLI to create tasks: ralph-dev tasks create
  #   4. Assign dependencies and priorities
  #   5. Return task summary"

  # Wait for phase-2-breakdown to complete
  # phase-2-breakdown will create .ralph-dev/tasks/*.md files via CLI

  # Verify tasks were created (context-compression safe - query CLI)
  TASK_LIST_RESULT=$(ralph-dev tasks list --json)

  if ! echo "$TASK_LIST_RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "❌ ERROR: Phase 2 did not create tasks"
    exit 1
  fi

  TOTAL_TASKS=$(echo "$TASK_LIST_RESULT" | jq -r '.data.total // 0')

  if [ "$TOTAL_TASKS" -eq 0 ]; then
    echo "❌ ERROR: Phase 2 created 0 tasks"
    exit 1
  fi

  echo "✅ Phase 2 complete: $TOTAL_TASKS tasks created"
  echo ""

  # phase-2-breakdown will handle user approval internally
  # and update state to "implement" when approved
  # This function just verifies completion
}
```

### Phase 3: IMPLEMENT (Autonomous Loop)

**Function: execute_phase_3_implement**

```bash
execute_phase_3_implement() {
  echo "Phase 3/5: Implementing tasks..."
  echo ""

  # Delegate to phase-3-implement skill using Task tool
  # NOTE: phase-3-implement handles Phase 4 (healing) internally
  # NOTE: This is placeholder - actual implementation uses Task tool
  # Use the Task tool to invoke:
  #   subagent_type: "phase-3-implement"
  #   prompt: "Use ralph-dev CLI to manage tasks
  #
  #   Execute implementation loop:
  #   1. Get next task: ralph-dev tasks next --json
  #   2. For each pending task:
  #      a. Mark as started: ralph-dev tasks start <task_id>
  #      b. Spawn implementer agent (fresh context)
  #      c. If error → invoke phase-4-heal (auto-heal)
  #      d. Mark complete: ralph-dev tasks done <task_id>
  #      e. Or mark failed: ralph-dev tasks fail <task_id>
  #      f. Show progress update
  #   3. Continue until all tasks processed
  #   4. Return summary"

  # Wait for phase-3-implement to complete
  # phase-3-implement is 100% context-compression resilient
  # It will update state to "deliver" when done

  # Verify implementation completed (context-compression safe - query CLI)
  FINAL_STATS=$(ralph-dev tasks list --json)
  TOTAL_TASKS=$(echo "$FINAL_STATS" | jq -r '.data.total // 0')
  COMPLETED=$(echo "$FINAL_STATS" | jq -r '.data.completed // 0')
  FAILED=$(echo "$FINAL_STATS" | jq -r '.data.failed // 0')

  echo "✅ Phase 3 complete: $COMPLETED/$TOTAL_TASKS tasks completed, $FAILED failed"
  echo ""

  # phase-3-implement updates state to "deliver" automatically
}
```

### Phase 5: DELIVER (Final Verification)

**Function: execute_phase_5_deliver**

```bash
execute_phase_5_deliver() {
  echo "Phase 5/5: Delivering with quality gates..."
  echo ""

  # Delegate to phase-5-deliver skill using Task tool
  # NOTE: This is placeholder - actual implementation uses Task tool
  # Use the Task tool to invoke:
  #   subagent_type: "phase-5-deliver"
  #   prompt: "Execute delivery workflow:
  #
  #   1. Get language config: ralph-dev detect --json
  #   2. Run quality gates (tests, lint, build)
  #   3. Create git commit
  #   4. Create pull request
  #   5. Return delivery summary"

  # Wait for phase-5-deliver to complete
  # phase-5-deliver will update state to "complete" when done

  # Verify delivery completed
  CURRENT_STATE=$(ralph-dev state get --json)
  FINAL_PHASE=$(echo "$CURRENT_STATE" | jq -r '.phase')

  if [ "$FINAL_PHASE" = "complete" ]; then
    echo "✅ Phase 5 complete: Delivery successful"
    echo ""
  else
    echo "❌ ERROR: Phase 5 did not complete successfully"
    echo "   Current phase: $FINAL_PHASE"
    exit 1
  fi
}
```

### Final Summary

```markdown
🚀 DELIVERY COMPLETE

┌──────────────────────────────────────────────┐
│ 📦 Deliverable                               │
├──────────────────────────────────────────────┤
│ Commit:      abc123f "feat: Add feature"    │
│ Branch:      feature/task-management        │
│ PR:          #456 (ready for review)        │
│ URL:         github.com/mylukin/ralph-dev/pull/456  │
├──────────────────────────────────────────────┤
│ 📊 Statistics                                │
├──────────────────────────────────────────────┤
│ Tasks:       15/15 completed                 │
│ Tests:       124/124 passing                 │
│ Coverage:    87%                             │
│ Duration:    47 minutes                      │
│ Auto-fixes:  2 errors healed                 │
└──────────────────────────────────────────────┘

Next steps:
1. Review PR: github.com/mylukin/ralph-dev/pull/456
2. Merge when approved
3. Deploy to production

Thank you for using Ralph-dev! 🎉
```

**Archive session:**
```bash
# Clear state
ralph-dev state clear

# Archive workspace
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p workspace-archive
cp -r workspace workspace-archive/$TIMESTAMP
```

## Error Handling

| Situation | Action |
|-----------|--------|
| User cancels | Save state, show resume command |
| Phase fails | Log error, escalate to user with diagnostics |
| Interrupted | Auto-save state, show resume command on next session |

## Resume Mode

When user runs `/ralph-dev resume`:

1. Load state using CLI: `ralph-dev state get --json`
2. Check current phase
3. Resume from current phase:
   - `clarify` → Continue with remaining questions
   - `breakdown` → Show plan again for approval
   - `implement` → Get next task: `ralph-dev tasks next`
   - `deliver` → Re-run delivery

```markdown
┌────────────────────────────────────┐
│ 🚀 FOREMAN SESSION RESUMED       │
├────────────────────────────────────┤
│ Phase:    $PHASE                   │
│ Progress: $COMPLETED/$TOTAL tasks  │
│ Current:  $CURRENT_TASK            │
├────────────────────────────────────┤
│ Resuming...                        │
└────────────────────────────────────┘
```

## Status Mode

When user runs `/ralph-dev status`:

```bash
# Get state from CLI
ralph-dev state get

# Get task list
ralph-dev tasks list --status completed
ralph-dev tasks list --status pending
```

## Cancel Mode

When user runs `/ralph-dev cancel`:

```bash
# Clear state using CLI
ralph-dev state clear

# Archive workspace
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p workspace-cancelled
cp -r workspace workspace-cancelled/$TIMESTAMP

echo "✅ Session cancelled and archived to:"
echo "   workspace-cancelled/$TIMESTAMP"
```

## Rules

1. **Sequential phases** - Must complete each phase before next
2. **User approval** - Get approval for task plan before implementing
3. **Progress updates** - Show status after each task and every 3 tasks
4. **State persistence** - Save state after every phase
5. **Error transparency** - Show healing attempts, don't hide failures
6. **Clean exit** - Archive session when complete or cancelled

## Notes

- Phase 4 (HEAL) is not a separate phase - it's invoked on-demand by Phase 3
- All subagents use `context: fork` for fresh context
- State file is the source of truth for progress
- Progress log provides audit trail for debugging
