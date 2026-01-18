# Autopilot Pseudocode Reference | 伪代码参考

This document contains the core algorithms in pseudocode for easy understanding and implementation.

本文档包含核心算法的伪代码，便于理解和实现。

## Table of Contents | 目录

1. [Main Orchestrator](#main-orchestrator--主编排器)
2. [Phase 1: Clarify](#phase-1-clarify--阶段1澄清)
3. [Phase 2: Breakdown](#phase-2-breakdown--阶段2拆解)
4. [Phase 3: Implement](#phase-3-implement--阶段3实现)
5. [Phase 4: Heal](#phase-4-heal--阶段4修复)
6. [Phase 5: Deliver](#phase-5-deliver--阶段5交付)
7. [Agent: Implementer](#agent-implementer--代理实现者)
8. [Agent: Debugger](#agent-debugger--代理调试器)
9. [Agent: Reviewer](#agent-reviewer--代理审查者)

---

## Main Orchestrator | 主编排器

```python
def autopilot_orchestrator(user_requirement, mode="NEW"):
    """
    Main entry point for autopilot system.

    Args:
        user_requirement: String describing what to build
        mode: "NEW" | "RESUME" | "STATUS" | "CANCEL"

    Returns:
        Delivery summary with PR link
    """

    # ========== MODE HANDLING ==========
    if mode == "RESUME":
        state = load_state(".claude/autopilot/state.json")
        current_phase = state.phase
        # Jump to current phase
        goto execute_phase(current_phase)

    elif mode == "STATUS":
        state = load_state(".claude/autopilot/state.json")
        return display_status(state)

    elif mode == "CANCEL":
        archive_session()
        return "Session cancelled"

    # ========== NEW SESSION ==========
    # Initialize state
    state = {
        "phase": "clarify",
        "requirement": user_requirement,
        "currentTask": null,
        "currentTaskIndex": 0,
        "totalTasks": 0,
        "completed": [],
        "failed": [],
        "autoFixes": 0,
        "startedAt": now(),
        "estimatedCompletion": null
    }
    save_state(state)

    # ========== PHASE 1: CLARIFY ==========
    display_progress("Phase 1/5: Clarifying requirements...")

    prd_result = invoke_skill(
        skill="phase-1-clarify",
        context={
            "requirement": user_requirement,
            "mode": "fork"  # Fresh context
        }
    )

    if prd_result.status != "complete":
        return error("Failed to clarify requirements")

    save_file(".claude/autopilot/prd.md", prd_result.content)
    state.phase = "breakdown"
    save_state(state)

    # ========== PHASE 2: BREAKDOWN ==========
    display_progress("Phase 2/5: Breaking down into tasks...")

    prd = read_file(".claude/autopilot/prd.md")

    breakdown_result = invoke_skill(
        skill="phase-2-breakdown",
        context={
            "prd": prd,
            "mode": "fork"
        }
    )

    if breakdown_result.status != "complete":
        return error("Failed to break down tasks")

    tasks = breakdown_result.tasks
    save_file(".claude/autopilot/tasks.json", tasks)

    # Show plan and get approval
    display_task_plan(tasks)
    approval = ask_user("Approve this plan? (yes/no/modify)")

    if approval == "no":
        return "Plan rejected by user"
    elif approval == "modify":
        # Allow user to edit tasks.json
        wait_for_user_edits(".claude/autopilot/tasks.json")
        tasks = load_file(".claude/autopilot/tasks.json")

    state.phase = "implement"
    state.totalTasks = len(tasks)
    save_state(state)

    # ========== PHASE 3: IMPLEMENT ==========
    display_progress("Phase 3/5: Implementing tasks...")

    implement_result = invoke_skill(
        skill="phase-3-implement",
        context={
            "tasks": tasks,
            "mode": "fork"
        }
    )

    # Phase 3 handles Phase 4 (healing) internally
    # Update state from implement_result
    state.completed = implement_result.completed
    state.failed = implement_result.failed
    state.autoFixes = implement_result.autoFixes
    state.phase = "deliver"
    save_state(state)

    # ========== PHASE 5: DELIVER ==========
    display_progress("Phase 5/5: Delivering with quality gates...")

    delivery_result = invoke_skill(
        skill="phase-5-deliver",
        context={
            "state": state,
            "mode": "fork"
        }
    )

    if delivery_result.status != "success":
        return error(f"Delivery failed: {delivery_result.reason}")

    # ========== COMPLETE ==========
    display_delivery_summary(delivery_result)

    # Archive session
    archive_session()

    return delivery_result


def display_progress(message):
    """Show progress update to user."""
    print(f"""
┌─────────────────────────────────────────┐
│ 🚀 AUTOPILOT PROGRESS                   │
├─────────────────────────────────────────┤
│ {message}                                │
└─────────────────────────────────────────┘
    """)


def display_task_plan(tasks):
    """Show task breakdown for user approval."""
    total_time = sum(task.estimatedMinutes for task in tasks)

    print(f"""
📋 Task Plan ({len(tasks)} tasks, est. {total_time/60:.1f} hours)

{enumerate_tasks(tasks)}

Approve? (yes/no/modify)
    """)


def display_delivery_summary(delivery):
    """Show final delivery summary."""
    print(f"""
🚀 DELIVERY COMPLETE

┌──────────────────────────────────────────────┐
│ 📦 Deliverable                               │
├──────────────────────────────────────────────┤
│ Commit:      {delivery.commit_hash}          │
│ Branch:      {delivery.branch_name}          │
│ PR:          #{delivery.pr_number}           │
│ URL:         {delivery.pr_url}               │
├──────────────────────────────────────────────┤
│ 📊 Statistics                                │
├──────────────────────────────────────────────┤
│ Tasks:       {delivery.stats.completed}/{delivery.stats.total}  │
│ Tests:       {delivery.stats.tests_passed}/{delivery.stats.tests_total}  │
│ Coverage:    {delivery.stats.coverage}%     │
│ Duration:    {delivery.stats.duration}      │
│ Auto-fixes:  {delivery.stats.auto_fixes}    │
└──────────────────────────────────────────────┘
    """)
```

---

## Phase 1: Clarify | 阶段1：澄清

```python
def phase_1_clarify(user_requirement):
    """
    Ask structured questions to generate detailed PRD.

    Args:
        user_requirement: Initial requirement string

    Returns:
        PRD markdown content
    """

    # Define question templates
    questions = [
        {
            "id": "app_type",
            "text": "What type of application?",
            "options": [
                "A) Web app (React/Vue/Angular)",
                "B) Mobile app (React Native/Flutter)",
                "C) API backend only",
                "D) Full-stack (frontend + backend)"
            ]
        },
        {
            "id": "features",
            "text": "Core features to include? (Select multiple)",
            "options": [
                "A) User authentication",
                "B) Data CRUD operations",
                "C) Real-time updates",
                "D) File uploads",
                "E) Search & filtering"
            ],
            "multiselect": true
        },
        {
            "id": "tech_stack",
            "text": "Preferred technologies?",
            "options": [
                "A) TypeScript + Node.js + PostgreSQL",
                "B) Python + FastAPI + MongoDB",
                "C) Go + Gin + MySQL",
                "D) Choose for me (best practices)"
            ]
        },
        {
            "id": "testing",
            "text": "Testing requirements?",
            "options": [
                "A) Unit tests only",
                "B) Unit + integration tests",
                "C) Unit + integration + E2E",
                "D) TDD strict mode (tests first, mandatory)"
            ]
        },
        {
            "id": "deployment",
            "text": "Deployment target?",
            "options": [
                "A) Local development only",
                "B) Docker containers",
                "C) Cloud platform (AWS/GCP/Azure)",
                "D) Serverless (Lambda/Cloud Functions)"
            ]
        }
    ]

    # Collect answers
    answers = {}
    for i, question in enumerate(questions):
        display_question(i + 1, len(questions), question)
        answer = get_user_answer(question)
        answers[question.id] = answer

    # Generate PRD from answers
    prd = generate_prd(user_requirement, answers)

    return prd


def generate_prd(requirement, answers):
    """Generate PRD from requirement and answers."""

    # Extract tech stack components
    tech = parse_tech_stack(answers.tech_stack)

    # Generate user stories from features
    user_stories = []
    for feature in answers.features:
        user_stories.extend(
            feature_to_user_stories(feature)
        )

    # Determine TDD mode
    tdd_mode = answer_to_tdd_mode(answers.testing)

    # Build PRD template
    prd = f"""
# Product Requirements Document

## Project Goal
{requirement}

## Answers Summary
- Application type: {answers.app_type}
- Core features: {', '.join(answers.features)}
- Tech stack: {answers.tech_stack}
- Testing: {answers.testing}
- Deployment: {answers.deployment}

## User Stories

{format_user_stories(user_stories)}

## Technical Specifications

### Architecture
- Type: {answers.app_type}
- Frontend: {tech.frontend or 'N/A'}
- Backend: {tech.backend}
- Database: {tech.database}

### Core Features

{expand_features(answers.features)}

### Quality Requirements
- Test coverage: >80%
- TDD mode: {tdd_mode}
- Code review: 2-stage required

## Acceptance Criteria

Global (apply to ALL tasks):
- [ ] TypeScript compiles with no errors (if TypeScript)
- [ ] All tests passing
- [ ] Linter passing (0 errors)
- [ ] Code reviewed and approved

## Non-Functional Requirements
- Performance: API response < 200ms
- Security: OWASP top 10 compliance
- Accessibility: WCAG 2.1 AA (if web app)
"""

    return prd


def feature_to_user_stories(feature):
    """Convert feature to user stories."""

    feature_map = {
        "authentication": [
            "As a user, I can register an account so that I can access the app",
            "As a user, I can log in with email/password so that I can access my data",
            "As a user, I can log out so that I can secure my session",
            "As a user, I can reset my password so that I can regain access if forgotten"
        ],
        "crud": [
            "As a user, I can create items so that I can add new data",
            "As a user, I can view items so that I can see my data",
            "As a user, I can update items so that I can modify data",
            "As a user, I can delete items so that I can remove unwanted data"
        ],
        "realtime": [
            "As a user, I can see live updates so that I get real-time information",
            "As a user, I can receive notifications so that I know when changes occur"
        ],
        "file_upload": [
            "As a user, I can upload files so that I can store documents",
            "As a user, I can download files so that I can access stored documents"
        ]
    }

    return feature_map.get(feature, [])
```

---

## Phase 2: Breakdown | 阶段2：拆解

```python
def phase_2_breakdown(prd):
    """
    Convert PRD to atomic tasks.

    Args:
        prd: PRD markdown content

    Returns:
        tasks.json structure
    """

    # Parse PRD
    user_stories = extract_user_stories(prd)
    tech_stack = extract_tech_stack(prd)
    tdd_mode = extract_tdd_mode(prd)

    tasks = []

    # Step 1: Create setup tasks (always first)
    tasks.extend(generate_setup_tasks(tech_stack))

    # Step 2: Convert each user story to tasks
    for story in user_stories:
        story_tasks = decompose_user_story(story, tech_stack, tdd_mode)

        # Validate task size
        for task in story_tasks:
            if task.estimatedMinutes > 30:
                # Split into smaller tasks
                subtasks = split_task(task)
                tasks.extend(subtasks)
            else:
                tasks.append(task)

    # Step 3: Add dependencies
    tasks = add_task_dependencies(tasks)

    # Step 4: Assign priorities
    tasks = assign_task_priorities(tasks)

    # Build output structure
    output = {
        "tasks": tasks,
        "metadata": {
            "totalTasks": len(tasks),
            "estimatedHours": sum(t.estimatedMinutes for t in tasks) / 60,
            "tddMode": tdd_mode,
            "createdAt": now()
        }
    }

    return output


def decompose_user_story(story, tech_stack, tdd_mode):
    """
    Convert ONE user story to 1-3 tasks.

    Example:
    Story: "As a user, I can log in"
    Tasks:
      1. auth.login.ui - Create login form
      2. auth.login.api - Create login endpoint
      3. (tests bundled with above if TDD strict)
    """

    tasks = []
    module = infer_module_from_story(story)
    action = infer_action_from_story(story)

    # Determine if needs UI + API or just one
    needs_ui = requires_ui_component(story, tech_stack)
    needs_api = requires_api_endpoint(story, tech_stack)

    if needs_ui:
        ui_task = {
            "id": f"{module}.{action}.ui",
            "priority": 0,  # Will be assigned later
            "module": module,
            "title": f"Create {action} UI component",
            "description": generate_ui_description(story),
            "dependencies": [f"setup.scaffold"],
            "estimatedMinutes": 25,
            "acceptanceCriteria": generate_ui_criteria(story),
            "testRequirements": generate_test_requirements(
                f"{module}.{action}.ui",
                tdd_mode
            ),
            "status": "pending"
        }
        tasks.append(ui_task)

    if needs_api:
        api_task = {
            "id": f"{module}.{action}.api",
            "priority": 0,
            "module": module,
            "title": f"Create {action} API endpoint",
            "description": generate_api_description(story),
            "dependencies": [f"setup.database"],
            "estimatedMinutes": 20,
            "acceptanceCriteria": generate_api_criteria(story),
            "testRequirements": generate_test_requirements(
                f"{module}.{action}.api",
                tdd_mode
            ),
            "status": "pending"
        }
        tasks.append(api_task)

    return tasks


def split_task(task):
    """
    Split a task that's too large (>30 min).

    Strategy:
    - If implementation task → split into subtasks by component
    - If test task → split by test category (unit/integration/e2e)
    """

    if task.estimatedMinutes <= 30:
        return [task]

    # Heuristic: Split into N subtasks
    n_subtasks = ceil(task.estimatedMinutes / 25)

    subtasks = []
    for i in range(n_subtasks):
        subtask = copy(task)
        subtask.id = f"{task.id}.part{i+1}"
        subtask.estimatedMinutes = task.estimatedMinutes / n_subtasks
        subtask.title = f"{task.title} (Part {i+1})"
        subtasks.append(subtask)

    return subtasks


def add_task_dependencies(tasks):
    """
    Add dependencies between tasks.

    Rules:
    1. All tasks depend on setup tasks
    2. UI tasks may depend on API tasks
    3. Test tasks depend on implementation tasks
    """

    dependency_rules = [
        # Setup must be first
        ("setup.scaffold", []),
        ("setup.dependencies", ["setup.scaffold"]),
        ("setup.database", ["setup.dependencies"]),

        # API before UI (if both exist for same module.action)
        ("*.*.ui", ["*.*.api"]),

        # Tests after implementation (if not bundled)
        ("*.*.tests", ["*.*.ui", "*.*.api"])
    ]

    for task in tasks:
        for pattern, deps in dependency_rules:
            if matches_pattern(task.id, pattern):
                resolved_deps = resolve_dependency_patterns(deps, tasks)
                task.dependencies.extend(resolved_deps)

    return tasks


def assign_task_priorities(tasks):
    """
    Assign priorities based on dependencies.

    Priority order:
    1. Setup tasks (priority 1)
    2. Backend/API tasks (priority 2)
    3. Frontend/UI tasks (priority 3)
    4. Integration tasks (priority 4)
    5. Polish tasks (priority 5)
    """

    priority_map = {
        "setup": 1,
        "api": 2,
        "backend": 2,
        "ui": 3,
        "frontend": 3,
        "integration": 4,
        "e2e": 4,
        "polish": 5,
        "optimization": 5
    }

    for task in tasks:
        category = infer_task_category(task)
        task.priority = priority_map.get(category, 3)

    return tasks
```

---

## Phase 3: Implement | 阶段3：实现

```python
def phase_3_implement(tasks_json):
    """
    Execute all tasks with auto-healing.

    Args:
        tasks_json: Task list with metadata

    Returns:
        Implementation summary
    """

    tasks = load_tasks(tasks_json)
    state = load_state()

    completed = []
    failed = []
    auto_fixes = 0

    while True:
        # Get next pending task
        task = get_next_pending_task(tasks)

        if task is None:
            break  # All tasks processed

        # Update state
        state.currentTask = task.id
        state.currentTaskIndex += 1
        save_state(state)

        # Show progress
        display_task_start(task, state.currentTaskIndex, len(tasks))

        # Spawn implementer agent (fresh context)
        result = invoke_agent(
            agent="implementer",
            context={
                "task_id": task.id,
                "title": task.title,
                "description": task.description,
                "acceptance_criteria": task.acceptanceCriteria,
                "test_requirements": task.testRequirements,
                "tdd_mode": tasks.metadata.tddMode
            },
            mode="fork"  # Fresh context
        )

        # Parse agent result
        if result.status == "success" and result.verification_passed:
            # Task completed successfully
            completed.append({
                "id": task.id,
                "duration": result.duration,
                "files_modified": result.files_modified,
                "tests_passed": result.tests_passed
            })

            display_task_complete(task, result)
            mark_task_complete(tasks, task.id)

        elif result.status == "error":
            # Auto-heal
            display_healing_start(task, result.error_details)

            heal_result = invoke_agent(
                agent="debugger",
                context={
                    "task_id": task.id,
                    "error": result.error_details,
                    "failed_command": result.failed_command
                },
                mode="fork"
            )

            if heal_result.status == "fixed":
                # Healing successful
                auto_fixes += 1
                completed.append({
                    "id": task.id,
                    "duration": result.duration + heal_result.duration,
                    "files_modified": result.files_modified,
                    "auto_healed": true
                })

                display_healing_success(task, heal_result)
                mark_task_complete(tasks, task.id)

            else:
                # Healing failed
                failed.append({
                    "id": task.id,
                    "reason": heal_result.diagnostics,
                    "attempts": heal_result.attempts
                })

                display_healing_failed(task, heal_result)
                mark_task_failed(tasks, task.id)

        else:
            # Verification failed
            failed.append({
                "id": task.id,
                "reason": "Verification failed",
                "details": result.verification_output
            })

            display_task_failed(task, result)
            mark_task_failed(tasks, task.id)

        # Update state
        state.completed = completed
        state.failed = failed
        state.autoFixes = auto_fixes
        save_state(state)

        # Show summary every 3 tasks
        if state.currentTaskIndex % 3 == 0:
            display_progress_summary(state, len(tasks))

    # All tasks processed
    return {
        "completed": completed,
        "failed": failed,
        "autoFixes": auto_fixes
    }


def display_task_start(task, index, total):
    """Show task start message."""
    print(f"""
⏳ Starting task {index}/{total}: {task.id}
   {task.title}
    """)


def display_task_complete(task, result):
    """Show task completion message."""
    print(f"""
✅ {task.id} completed ({index}/{total})
   Duration: {result.duration}
   Tests: {result.tests_passed}/{result.tests_total} passed
   Coverage: {result.coverage}%
   Files:
{format_file_list(result.files_modified)}
   Next: {get_next_task_id()}
    """)


def display_progress_summary(state, total):
    """Show overall progress summary."""
    percent = (len(state.completed) / total) * 100

    print(f"""
📊 Progress Summary ({percent:.0f}% complete)

   ✅ Completed: {len(state.completed)}/{total} tasks
   ⏱️  Time elapsed: {calculate_elapsed_time(state.startedAt)}
   ⏱️  Estimated remaining: {estimate_remaining_time(state, total)}
   🔧 Auto-fixes: {state.autoFixes} errors healed

   Recent:
{format_recent_tasks(state.completed[-3:])}

   Next up:
{format_upcoming_tasks(get_pending_tasks()[:2])}
    """)
```

---

## Phase 4: Heal | 阶段4：修复

```python
def phase_4_heal(error_context):
    """
    Self-healing protocol (4 phases).

    Args:
        error_context: {
            task_id, error, failed_command, stack_trace
        }

    Returns:
        Healing result
    """

    MAX_ATTEMPTS = 3

    for attempt in range(1, MAX_ATTEMPTS + 1):
        # ========== PHASE 1: CAPTURE ==========
        error_info = {
            "message": extract_error_message(error_context.error),
            "stack_trace": error_context.stack_trace,
            "failed_command": error_context.failed_command,
            "file": extract_file_from_stack(error_context.stack_trace),
            "line": extract_line_from_stack(error_context.stack_trace),
            "error_type": classify_error_type(error_context.error)
        }

        display_healing_phase_1(error_info, attempt)

        # ========== PHASE 2: SEARCH ==========
        # Build search query
        query = build_search_query(error_info)
        # Example: "npm express module not found fix 2026"

        display_healing_phase_2(query)

        # Perform web search
        search_results = web_search(query)

        # Parse top 3 results for solution
        solution = parse_solution_from_results(search_results)

        # ========== PHASE 3: APPLY ==========
        display_healing_phase_3(solution)

        fix_applied = apply_fix_by_error_type(error_info, solution)

        if not fix_applied:
            continue  # Try next attempt

        # ========== PHASE 4: VERIFY ==========
        display_healing_phase_4(error_context.failed_command)

        # Re-run the failed command
        result = execute_command(error_context.failed_command)

        if result.exit_code == 0:
            # Success!
            return {
                "status": "fixed",
                "attempts": attempt,
                "solution": solution.description,
                "verification": result.output
            }

        # Failed, will retry
        log_healing_attempt(attempt, error_info, solution, result)

    # Failed after max attempts
    return {
        "status": "failed",
        "attempts": MAX_ATTEMPTS,
        "diagnostics": collect_diagnostics(error_info),
        "solutions_tried": get_solutions_tried(),
        "recommendation": "Manual intervention required"
    }


def classify_error_type(error_message):
    """Classify error into known types."""

    patterns = {
        "MODULE_NOT_FOUND": r"Cannot find module ['\"](.+)['\"]",
        "SYNTAX_ERROR": r"SyntaxError: (.+)",
        "TYPE_ERROR": r"TypeError: (.+)",
        "PORT_IN_USE": r"EADDRINUSE.*:(\d+)",
        "PERMISSION_DENIED": r"(EACCES|Permission denied)",
        "DATABASE_CONNECTION": r"(Connection refused|ECONNREFUSED)",
        "FILE_NOT_FOUND": r"ENOENT.*'(.+)'"
    }

    for error_type, pattern in patterns.items():
        if re.search(pattern, error_message):
            return error_type

    return "UNKNOWN"


def apply_fix_by_error_type(error_info, solution):
    """Apply fix based on error type."""

    handlers = {
        "MODULE_NOT_FOUND": fix_missing_module,
        "SYNTAX_ERROR": fix_syntax_error,
        "TYPE_ERROR": fix_type_error,
        "PORT_IN_USE": fix_port_conflict,
        "PERMISSION_DENIED": fix_permission,
        "DATABASE_CONNECTION": fix_database_connection,
        "FILE_NOT_FOUND": fix_missing_file,
        "UNKNOWN": fix_unknown_error
    }

    handler = handlers.get(error_info.error_type, fix_unknown_error)

    try:
        handler(error_info, solution)
        return true
    except Exception as e:
        log_error(f"Fix failed: {e}")
        return false


def fix_missing_module(error_info, solution):
    """Fix MODULE_NOT_FOUND error."""

    # Extract package name
    match = re.search(r"Cannot find module ['\"](.+)['\"]", error_info.message)
    package = match.group(1)

    # Determine package manager
    if file_exists("package.json"):
        pkg_manager = detect_package_manager()  # npm, yarn, pnpm
        execute(f"{pkg_manager} install {package}")

    elif file_exists("requirements.txt"):
        execute(f"pip install {package}")

    elif file_exists("go.mod"):
        execute(f"go get {package}")


def fix_syntax_error(error_info, solution):
    """Fix SyntaxError."""

    # Read file
    file_content = read_file(error_info.file)

    # Apply fix from solution
    if solution.code_fix:
        # Use solution's suggested fix
        fixed_content = apply_code_fix(
            file_content,
            error_info.line,
            solution.code_fix
        )
    else:
        # Common fixes
        fixed_content = auto_fix_common_syntax_errors(
            file_content,
            error_info.line
        )

    # Write back
    write_file(error_info.file, fixed_content)


def fix_port_conflict(error_info, solution):
    """Fix PORT_IN_USE error."""

    # Extract port number
    match = re.search(r":(\d+)", error_info.message)
    port = match.group(1)

    # Option 1: Kill process on port
    result = execute(f"lsof -ti:{port}")
    if result.exit_code == 0:
        pid = result.output.strip()
        execute(f"kill -9 {pid}")

    # Option 2: Change port in config
    # (if kill didn't work or not preferred)
    # update_config_port(port, find_free_port())
```

---

## Phase 5: Deliver | 阶段5：交付

```python
def phase_5_deliver(state):
    """
    Run quality gates, create commit, open PR.

    Args:
        state: Current autopilot state

    Returns:
        Delivery result
    """

    # ========== QUALITY GATES ==========
    display_progress("Running quality gates...")

    gates = [
        ("All tasks complete", gate_all_tasks_complete),
        ("All tests passing", gate_tests_passing),
        ("Type checking", gate_typescript),
        ("Linting", gate_linting),
        ("Build success", gate_build),
        ("Code review: Spec compliance", gate_review_spec),
        ("Code review: Code quality", gate_review_quality)
    ]

    gate_results = {}

    for gate_name, gate_func in gates:
        display_gate_running(gate_name)

        result = gate_func(state)
        gate_results[gate_name] = result

        if result.passed:
            display_gate_passed(gate_name, result)
        else:
            display_gate_failed(gate_name, result)
            return {
                "status": "failed",
                "failed_gate": gate_name,
                "details": result.details,
                "recommendation": result.recommendation
            }

    # All gates passed
    display_all_gates_passed(gate_results)

    # ========== GIT COMMIT ==========
    display_progress("Creating git commit...")

    commit_message = generate_commit_message(state)
    commit_hash = create_git_commit(commit_message)

    # ========== PULL REQUEST ==========
    display_progress("Creating pull request...")

    pr_description = generate_pr_description(state)
    pr_number = create_pull_request(
        title=extract_prd_title(state),
        body=pr_description,
        labels=["autopilot", "ready-for-review"]
    )

    # ========== SUCCESS ==========
    return {
        "status": "success",
        "commit_hash": commit_hash,
        "branch_name": get_current_branch(),
        "pr_number": pr_number,
        "pr_url": get_pr_url(pr_number),
        "stats": {
            "completed": len(state.completed),
            "total": state.totalTasks,
            "tests_passed": count_tests_passed(),
            "tests_total": count_tests_total(),
            "coverage": calculate_coverage(),
            "duration": calculate_duration(state.startedAt),
            "auto_fixes": state.autoFixes
        },
        "quality_results": gate_results
    }


def gate_tests_passing(state):
    """Quality gate: All tests must pass."""

    # Run full test suite
    result = execute("npm test -- --coverage")

    if result.exit_code != 0:
        return {
            "passed": false,
            "details": result.output,
            "recommendation": "Fix failing tests"
        }

    # Parse test results
    tests_passed = extract_tests_passed(result.output)
    tests_total = extract_tests_total(result.output)

    if tests_passed < tests_total:
        return {
            "passed": false,
            "details": f"{tests_passed}/{tests_total} tests passed",
            "recommendation": "All tests must pass"
        }

    return {
        "passed": true,
        "details": f"{tests_passed}/{tests_total} tests passed",
        "output": result.output
    }


def gate_review_spec(state):
    """Quality gate: Spec compliance review."""

    prd = read_file(".claude/autopilot/prd.md")
    code_diff = execute("git diff main...HEAD").output

    # Invoke reviewer agent (spec compliance mode)
    result = invoke_agent(
        agent="reviewer",
        context={
            "mode": "SPEC_COMPLIANCE",
            "prd": prd,
            "code_diff": code_diff
        },
        mode="fork"
    )

    if result.status == "FAIL":
        return {
            "passed": false,
            "details": result.issues,
            "recommendation": "Fix spec compliance issues"
        }

    return {
        "passed": true,
        "details": result.summary
    }


def generate_commit_message(state):
    """Generate commit message from state."""

    prd_title = extract_prd_title(state)
    tasks_summary = summarize_completed_tasks(state.completed)

    message = f"""feat: {prd_title}

{tasks_summary}

Tests: {count_tests_passed()}/{count_tests_total()} passing
Coverage: {calculate_coverage()}%
Duration: {calculate_duration(state.startedAt)}

Co-authored-by: Autopilot <autopilot@claude.ai>
"""

    return message


def generate_pr_description(state):
    """Generate PR description from state."""

    prd = read_file(".claude/autopilot/prd.md")
    prd_summary = extract_prd_summary(prd)
    tasks_list = format_completed_tasks(state.completed)
    quality_summary = format_quality_results(state)

    description = f"""
## Summary
{prd_summary}

## Changes
{tasks_list}

## Testing
- ✅ Unit tests: {count_unit_tests_passed()}/{count_unit_tests_total()} passing
- ✅ Integration tests: {count_integration_tests_passed()}/{count_integration_tests_total()} passing
- ✅ E2E tests: {count_e2e_tests_passed()}/{count_e2e_tests_total()} passing

## Quality Checks
{quality_summary}

## Auto-Healing
- 🔧 {state.autoFixes} errors automatically fixed

---
🤖 Generated by Autopilot in {calculate_duration(state.startedAt)}
"""

    return description
```

---

## Agent: Implementer | 代理：实现者

```python
def implementer_agent(task_context):
    """
    Execute single task with TDD workflow.

    Args:
        task_context: {
            task_id, title, description,
            acceptance_criteria, test_requirements,
            tdd_mode
        }

    Returns:
        Structured result
    """

    task_id = task_context.task_id
    tdd_mode = task_context.tdd_mode

    # ========== STEP 1: UNDERSTAND ==========
    display(f"📋 Task: {task_context.title}")
    display(f"📝 Acceptance Criteria:")
    for criterion in task_context.acceptance_criteria:
        display(f"   - {criterion}")

    # ========== STEP 2: IMPLEMENT ==========
    if tdd_mode == "strict":
        # TDD workflow mandatory
        result = implement_with_tdd(task_context)
    else:
        # Standard workflow
        result = implement_standard(task_context)

    # ========== STEP 3: VERIFY ==========
    verification = verify_implementation(task_id)

    # ========== STEP 4: RETURN RESULT ==========
    return {
        "agent": "implementer",
        "task_id": task_id,
        "status": result.status,  # success|partial|error|blocked
        "verification_passed": verification.passed,
        "files_modified": result.files_modified,
        "tests_passed": verification.tests_passed,
        "tests_total": verification.tests_total,
        "coverage": verification.coverage,
        "duration": calculate_duration(result.start_time),
        "error_details": result.error if result.status == "error" else null,
        "notes": result.notes
    }


def implement_with_tdd(task_context):
    """
    TDD workflow: RED → GREEN → REFACTOR.
    """

    # ========== RED: Write failing tests first ==========
    display("🔴 RED: Writing failing tests...")

    test_file = task_context.test_requirements.unit.pattern
    test_cases = task_context.test_requirements.unit.cases

    # Create test file
    test_content = generate_test_file(
        task_context.title,
        task_context.acceptance_criteria,
        test_cases
    )

    write_file(test_file, test_content)
    display(f"   Created: {test_file}")

    # Run tests - MUST FAIL
    result = execute("npm test " + test_file)

    if result.exit_code == 0:
        # Tests passed - BAD! Tests should fail before implementation
        return {
            "status": "error",
            "notes": "Tests passed before implementation (invalid TDD)"
        }

    display("   ✅ Tests failed as expected")

    # ========== GREEN: Minimal implementation ==========
    display("🟢 GREEN: Writing minimal implementation...")

    impl_file = infer_implementation_file(task_context)

    impl_content = generate_minimal_implementation(
        task_context.description,
        task_context.acceptance_criteria
    )

    write_file(impl_file, impl_content)
    display(f"   Created: {impl_file}")

    # Run tests - MUST PASS
    result = execute("npm test " + test_file)

    if result.exit_code != 0:
        return {
            "status": "error",
            "notes": "Tests still failing after implementation",
            "error": result.output
        }

    display("   ✅ Tests passed")

    # ========== REFACTOR: Clean up ==========
    display("🔵 REFACTOR: Cleaning up code...")

    refactored_content = refactor_code(impl_content)

    write_file(impl_file, refactored_content)

    # Run tests again - MUST STILL PASS
    result = execute("npm test " + test_file)

    if result.exit_code != 0:
        # Revert refactor
        write_file(impl_file, impl_content)
        display("   ⚠️  Refactor broke tests, reverted")

    display("   ✅ Refactor complete, tests still passing")

    return {
        "status": "success",
        "files_modified": [impl_file, test_file],
        "notes": "Implemented with TDD (RED-GREEN-REFACTOR)"
    }


def implement_standard(task_context):
    """
    Standard workflow (non-TDD).
    """

    # Implement code
    impl_file = infer_implementation_file(task_context)

    impl_content = generate_implementation(
        task_context.description,
        task_context.acceptance_criteria
    )

    write_file(impl_file, impl_content)

    # Write tests (recommended but not enforced)
    if should_write_tests(task_context):
        test_file = infer_test_file(impl_file)
        test_content = generate_test_file_for_implementation(
            impl_content,
            task_context.acceptance_criteria
        )
        write_file(test_file, test_content)
        files_modified = [impl_file, test_file]
    else:
        files_modified = [impl_file]

    return {
        "status": "success",
        "files_modified": files_modified,
        "notes": "Implemented (standard workflow)"
    }


def verify_implementation(task_id):
    """
    Verify implementation meets criteria.
    """

    # Run type check
    typecheck_result = execute("npx tsc --noEmit")
    if typecheck_result.exit_code != 0:
        return {
            "passed": false,
            "reason": "Type checking failed",
            "output": typecheck_result.output
        }

    # Run lint
    lint_result = execute("npm run lint")
    if lint_result.exit_code != 0:
        return {
            "passed": false,
            "reason": "Linting failed",
            "output": lint_result.output
        }

    # Run tests
    test_result = execute("npm test -- --coverage")
    if test_result.exit_code != 0:
        return {
            "passed": false,
            "reason": "Tests failed",
            "output": test_result.output
        }

    # Parse test results
    tests_passed = extract_tests_passed(test_result.output)
    tests_total = extract_tests_total(test_result.output)
    coverage = extract_coverage(test_result.output)

    return {
        "passed": true,
        "tests_passed": tests_passed,
        "tests_total": tests_total,
        "coverage": coverage,
        "output": test_result.output
    }
```

---

**This pseudocode provides the complete algorithmic foundation for implementing the Autopilot system.**

**这些伪代码为实现 Autopilot 系统提供了完整的算法基础。**

For actual implementations in markdown format, see the `skills/` and `agents/` directories.

有关 markdown 格式的实际实现，请参阅 `skills/` 和 `agents/` 目录。
