#!/usr/bin/env bash
#
# Foreman CLI Fallback Functions
# Provides basic task operations when the TypeScript CLI is unavailable
#
# Usage:
#   source ${CLAUDE_PLUGIN_ROOT}/shared/cli-fallback.sh
#
# These are simplified bash implementations for critical operations.
# They provide limited functionality compared to the full CLI.
#

set -euo pipefail

# ============================================================
# Color Output (reuse from bootstrap if available)
# ============================================================

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  GRAY='\033[0;90m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  GRAY=''
  NC=''
fi

# ============================================================
# Helper Functions
# ============================================================

fallback_log_warning() {
  echo -e "${YELLOW}⚠ FALLBACK MODE:${NC} $*" >&2
}

fallback_log_error() {
  echo -e "${RED}✗ FALLBACK ERROR:${NC} $*" >&2
}

# Extract YAML frontmatter value from markdown file
extract_yaml_value() {
  local file="$1"
  local key="$2"

  # Extract frontmatter (between --- lines)
  # Then find key and get its value
  sed -n '/^---$/,/^---$/p' "$file" | \
    grep "^${key}:" | \
    sed "s/^${key}:[[:space:]]*//" | \
    tr -d '"' | \
    tr -d "'"
}

# ============================================================
# Fallback: Task Operations
# ============================================================

# Get next pending task (simple version)
# Returns: path to task file, or empty if none found
fallback_get_next_task() {
  local tasks_dir="${1:-workspace/ai/tasks}"

  if [ ! -d "$tasks_dir" ]; then
    fallback_log_error "Tasks directory not found: $tasks_dir"
    return 1
  fi

  # Find all .md files, check status, sort by priority
  local task_file=""
  local min_priority=9999

  while IFS= read -r -d '' file; do
    local status
    status=$(extract_yaml_value "$file" "status")

    if [ "$status" = "pending" ]; then
      local priority
      priority=$(extract_yaml_value "$file" "priority")
      priority=${priority:-999}  # Default priority if not found

      if [ "$priority" -lt "$min_priority" ]; then
        min_priority=$priority
        task_file="$file"
      fi
    fi
  done < <(find "$tasks_dir" -name "*.md" -type f -print0)

  if [ -n "$task_file" ]; then
    echo "$task_file"
    return 0
  else
    fallback_log_warning "No pending tasks found"
    return 1
  fi
}

# Read task details from file
# Outputs: Simple text format with task info
fallback_read_task() {
  local task_file="$1"

  if [ ! -f "$task_file" ]; then
    fallback_log_error "Task file not found: $task_file"
    return 1
  fi

  echo "Task File: $task_file"
  echo "ID: $(extract_yaml_value "$task_file" "id")"
  echo "Module: $(extract_yaml_value "$task_file" "module")"
  echo "Priority: $(extract_yaml_value "$task_file" "priority")"
  echo "Status: $(extract_yaml_value "$task_file" "status")"
  echo "Estimated: $(extract_yaml_value "$task_file" "estimatedMinutes") min"
  echo ""

  # Extract description (first line after frontmatter heading)
  echo "Description:"
  sed -n '/^---$/,/^---$/!p' "$task_file" | \
    grep -A1 "^# " | \
    tail -1
  echo ""
}

# Update task status in file
# Usage: fallback_update_status <task_file> <new_status>
fallback_update_status() {
  local task_file="$1"
  local new_status="$2"

  if [ ! -f "$task_file" ]; then
    fallback_log_error "Task file not found: $task_file"
    return 1
  fi

  # Create backup
  cp "$task_file" "${task_file}.bak"

  # Update status using sed
  if sed -i.tmp "s/^status: .*/status: $new_status/" "$task_file"; then
    rm -f "${task_file}.tmp"
    echo -e "${GREEN}✓${NC} Status updated: $new_status"
    return 0
  else
    # Restore backup on failure
    mv "${task_file}.bak" "$task_file"
    fallback_log_error "Failed to update status"
    return 1
  fi
}

# Mark task as completed
fallback_mark_done() {
  local task_file="$1"
  fallback_update_status "$task_file" "completed"
}

# Mark task as in progress
fallback_mark_started() {
  local task_file="$1"
  fallback_update_status "$task_file" "in_progress"
}

# Mark task as failed
fallback_mark_failed() {
  local task_file="$1"
  local reason="${2:-Unknown error}"

  if fallback_update_status "$task_file" "failed"; then
    # Append failure reason to notes section
    echo "" >> "$task_file"
    echo "## Failure Notes" >> "$task_file"
    echo "" >> "$task_file"
    echo "Failed: $reason" >> "$task_file"
    echo "Date: $(date '+%Y-%m-%d %H:%M:%S')" >> "$task_file"
  fi
}

# ============================================================
# Fallback: List Tasks
# ============================================================

# List all tasks with status
fallback_list_tasks() {
  local tasks_dir="${1:-workspace/ai/tasks}"
  local filter_status="${2:-}"  # Optional: filter by status

  if [ ! -d "$tasks_dir" ]; then
    fallback_log_error "Tasks directory not found: $tasks_dir"
    return 1
  fi

  echo -e "${GRAY}Tasks (fallback mode - limited info):${NC}"
  echo ""

  local count=0

  while IFS= read -r -d '' file; do
    local id
    id=$(extract_yaml_value "$file" "id")
    local status
    status=$(extract_yaml_value "$file" "status")
    local priority
    priority=$(extract_yaml_value "$file" "priority")

    # Apply filter if specified
    if [ -n "$filter_status" ] && [ "$status" != "$filter_status" ]; then
      continue
    fi

    # Color code by status
    local status_color=""
    case "$status" in
      completed) status_color="$GREEN" ;;
      in_progress) status_color="$YELLOW" ;;
      failed) status_color="$RED" ;;
      *) status_color="$GRAY" ;;
    esac

    echo -e "  ${status_color}[$status]${NC} $id (P$priority)"
    count=$((count + 1))
  done < <(find "$tasks_dir" -name "*.md" -type f -print0 | sort -z)

  echo ""
  echo -e "${GRAY}Total: $count tasks${NC}"
}

# ============================================================
# Fallback: State Management
# ============================================================

# Read state.json
fallback_read_state() {
  local state_file="${1:-workspace/ai/state.json}"

  if [ ! -f "$state_file" ]; then
    echo "{}"
    return 1
  fi

  cat "$state_file"
}

# Update state phase
fallback_update_state_phase() {
  local new_phase="$1"
  local state_file="${2:-workspace/ai/state.json}"

  # Create state directory if needed
  mkdir -p "$(dirname "$state_file")"

  # Create or update state
  if [ -f "$state_file" ]; then
    # Update existing
    local temp_file
    temp_file=$(mktemp)
    jq ".phase = \"$new_phase\" | .lastUpdated = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$state_file" > "$temp_file"
    mv "$temp_file" "$state_file"
  else
    # Create new
    cat > "$state_file" <<EOF
{
  "phase": "$new_phase",
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  fi

  echo -e "${GREEN}✓${NC} State updated: $new_phase"
}

# ============================================================
# Export Functions
# ============================================================

export -f fallback_get_next_task
export -f fallback_read_task
export -f fallback_update_status
export -f fallback_mark_done
export -f fallback_mark_started
export -f fallback_mark_failed
export -f fallback_list_tasks
export -f fallback_read_state
export -f fallback_update_state_phase

# ============================================================
# Fallback Mode Warning
# ============================================================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠  FALLBACK MODE ACTIVE${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "The TypeScript CLI is unavailable."
echo "Using limited bash implementations."
echo ""
echo "Available functions:"
echo "  - fallback_get_next_task"
echo "  - fallback_read_task"
echo "  - fallback_mark_done"
echo "  - fallback_mark_started"
echo "  - fallback_mark_failed"
echo "  - fallback_list_tasks"
echo "  - fallback_update_state_phase"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
