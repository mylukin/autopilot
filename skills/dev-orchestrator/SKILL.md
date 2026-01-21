---
name: dev-orchestrator
description: Autonomous end-to-end development from requirement to delivery. Use when user wants complete automation, "build X for me", or full feature implementation without manual steps.
allowed-tools: [Task, Read, Write, Bash]
user-invocable: true
---

# Ralph-dev Orchestrator

## Goal

Transform a user requirement into delivered, tested, production-ready code with ZERO manual intervention after initial clarification.

## Workflow Phases

```
1. CLARIFY    → Questions & PRD (interactive)
2. BREAKDOWN  → Atomic tasks (autonomous)
3. IMPLEMENT  → Code + tests (autonomous)
4. HEAL       → Auto-fix errors (on-demand, invoked by Phase 3)
5. DELIVER    → Verify + commit + PR (autonomous)
```

## State Management

All state persists in `.ralph-dev/`:
- `state.json` - Current phase, progress (managed by CLI)
- `prd.md` - Product requirements document
- `tasks/` - Task files with index.json

---

## Execution

### Initialize

```bash
# Parse mode from arguments
MODE="new"  # or "resume", "status", "cancel"

case "$MODE" in
  resume)
    # Load existing state
    PHASE=$(ralph-dev state get --json | jq -r '.phase')
    ;;
  new)
    # Archive existing session if present
    ralph-dev state archive --force --json 2>/dev/null
    ralph-dev state set --phase clarify
    ralph-dev detect --save  # Detect language config
    PHASE="clarify"
    ;;
esac
```

### Main Loop (Context-Compression Resilient)

```bash
while true; do
  # Always re-query phase from CLI (context-compression safe)
  PHASE=$(ralph-dev state get --json | jq -r '.phase')

  case "$PHASE" in
    clarify)   invoke_skill "phase-1-clarify"   ;;
    breakdown) invoke_skill "phase-2-breakdown" ;;
    implement) invoke_skill "phase-3-implement" ;;
    deliver)   invoke_skill "phase-5-deliver"   ;;
    complete)  echo "✅ All phases complete!"; break ;;
    *)         echo "❌ Unknown phase: $PHASE"; exit 1 ;;
  esac
done
```

### Phase Invocation

Use Task tool to invoke each phase skill:

```
Tool: Task
Parameters:
  subagent_type: "{phase-skill-name}"
  description: "Execute {phase} phase"
  prompt: "{phase-specific context}"
  run_in_background: false
```

---

## Phase Summary

| Phase | Skill | Interactive | Key Output |
|-------|-------|-------------|------------|
| 1. Clarify | `phase-1-clarify` | Yes | `.ralph-dev/prd.md` |
| 2. Breakdown | `phase-2-breakdown` | Yes (approval) | `.ralph-dev/tasks/` |
| 3. Implement | `phase-3-implement` | No | Code + tests |
| 4. Heal | `phase-4-heal` | No | (invoked by Phase 3) |
| 5. Deliver | `phase-5-deliver` | Optional | Commit + PR |

---

## Mode Commands

| Command | Action |
|---------|--------|
| `/ralph-dev {requirement}` | Start new session |
| `/ralph-dev resume` | Continue from saved state |
| `/ralph-dev status` | Show current progress |
| `/ralph-dev cancel` | Archive and clear session |

---

## State Transitions

```
clarify → breakdown → implement ⇄ heal → deliver → complete
```

- Each phase updates state via `ralph-dev state update --phase {next}`
- Phase 4 (heal) is invoked on-demand, not a state transition
- Phases can only move forward (except implement ⇄ heal loop)

---

## Safety Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Orchestrator timeout | 12 hours | Prevent infinite loops |
| Per-phase timeout | Varies | Defined in each phase skill |
| Heal attempts | 3 per task | Circuit breaker |

---

## Constraints

- **NEVER** skip phases (must complete in order)
- **NEVER** rely on memory variables (always query CLI)
- **ALWAYS** get user approval before implement phase
- **ALWAYS** save state after each phase completion
- **ALWAYS** show progress updates during long operations

---

## Error Handling

| Error | Action |
|-------|--------|
| Phase fails | Log error, show diagnostics, don't auto-retry |
| User cancels | Save state, show resume command |
| Interrupted | State persists, resume on next session |
| Unknown phase | Report error, suggest manual state reset |

---

## Resume Behavior

When resuming from each phase:

| Phase | Resume Action |
|-------|---------------|
| clarify | Continue with remaining questions |
| breakdown | Show plan again for approval |
| implement | Get next task via `ralph-dev tasks next` |
| deliver | Re-run delivery checks |
