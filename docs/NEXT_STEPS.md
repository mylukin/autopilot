# ⏭️  下一步行动计划 | Next Steps Action Plan

**当前进度**: 40% → 目标: 80% (本周完成核心功能)

---

## 🚀 立即执行（今天，1小时）| Execute Now (Today, 1 hour)

### ✅ 任务 1: 构建 CLI 工具 (10分钟)

```bash
cd /Users/lukin/Projects/autopilot/cli
npm install
npm run build
```

**验证成功**:
```bash
./bin/autopilot-cli --version
# 输出: 1.0.0
```

---

### ✅ 任务 2: 安装插件 (5分钟)

```bash
cd /Users/lukin/Projects/autopilot
ln -s $(pwd) ~/.claude/plugins/autopilot
```

**验证成功**:
```bash
ls -la ~/.claude/plugins/autopilot
# 应该看到符号链接
```

---

### ✅ 任务 3: 测试基础功能 (10分钟)

在 Claude Code 对话中运行:

```
/autopilot "Build a simple TODO app"
```

**预期结果**:
- ✅ 命令被识别
- ⚠️  提示 "Phase skills not implemented"
- ✅ 这说明插件配置正确！

测试语言检测:

```
/detect-language
```

**预期结果**:
- ✅ Agent 开始扫描项目
- ✅ 返回语言配置

---

### ✅ 任务 4: 验证 CLI 命令 (10分钟)

```bash
cd /Users/lukin/Projects/autopilot/workspace

# 测试任务列表
../cli/bin/autopilot-cli tasks list

# 测试获取下一个任务
../cli/bin/autopilot-cli tasks next

# 测试状态管理
../cli/bin/autopilot-cli state get
```

**完成上述 4 个任务后**: 🎉 基础设施就绪！（进度 → 50%）

---

## 📝 本周任务（3-5天，12-15小时）| This Week (3-5 days, 12-15 hours)

### Day 1: Phase 1 - Clarify (2-3小时)

**创建文件**: `skills/phase-1-clarify/SKILL.md`

**要实现**:
1. 生成 3-5 个结构化问题（A/B/C/D 选项）
2. 收集用户答案
3. 生成 PRD 文档
4. 保存到 `workspace/ai/prd.md`
5. 更新状态: `autopilot-cli state update --phase breakdown`

**参考**:
- `docs/PSEUDOCODE.md` 第 71-118 行
- `docs/IMPLEMENTATION_GUIDE.md` Phase 1 部分

**验证**: 运行 `/autopilot "test"` 能提问并生成 PRD

---

### Day 2: Phase 2 - Breakdown (2-3小时)

**创建文件**: `skills/phase-2-breakdown/SKILL.md`

**要实现**:
1. 读取 `workspace/ai/prd.md`
2. 分解为原子任务（每个 <30分钟）
3. 为每个任务调用 CLI 创建文件:
   ```bash
   # 伪代码（在 skill 中会是实际命令）
   for task in tasks:
       create task markdown file
       update index.json
   ```
4. 显示任务计划给用户批准
5. 等待用户输入 (yes/no/modify)

**参考**:
- `workspace/ai/tasks/` 的示例任务文件
- `cli/src/core/task-writer.ts`

**验证**: Phase 1 → Phase 2 能生成任务文件

---

### Day 3: Phase 3 - Implement (3-4小时)

**创建文件**: `skills/phase-3-implement/SKILL.md`

**要实现**:
1. 循环获取下一个任务:
   ```bash
   TASK=$(autopilot-cli tasks next --json)
   TASK_ID=$(echo $TASK | jq -r '.id')
   ```
2. 为每个任务:
   - Mark as started: `autopilot-cli tasks start $TASK_ID`
   - Spawn fresh implementer agent (使用 Task tool)
   - If error → spawn debugger agent
   - Mark done: `autopilot-cli tasks done $TASK_ID --duration "4m"`
   - Show progress
3. Continue until all tasks complete

**参考**:
- `skills/autopilot-orchestrator/SKILL.md` 第 154-173 行

**验证**: 能循环执行多个任务

---

### Day 4: Phase 4 - Heal (2小时)

**创建文件**: `skills/phase-4-heal/SKILL.md`

**要实现**:
1. 接收错误信息（从 Phase 3 传入）
2. WebSearch: `"<language> <error-message> solution"`
3. 提取解决方案
4. 应用修复（修改代码）
5. 重新运行测试
6. 如果成功 → 返回 success
7. 如果失败 → 最多重试 3 次

**参考**:
- `docs/PSEUDOCODE.md` 第 345-436 行

**验证**: 能自动修复简单错误（如缺少依赖）

---

### Day 5: Phase 5 - Deliver (2-3小时)

**创建文件**: `skills/phase-5-deliver/SKILL.md`

**要实现**:
1. 获取语言配置:
   ```bash
   CONFIG=$(autopilot-cli detect --json)
   ```
2. 运行验证命令:
   ```bash
   for cmd in verifyCommands:
       run $cmd
       if failed: record error
   ```
3. 如果全部通过:
   - 创建 commit: `git commit -m "..."`
   - 创建 PR: `gh pr create --title "..." --body "..."`
4. 显示交付报告

**参考**:
- `docs/PSEUDOCODE.md` 第 438-526 行

**验证**: 能创建 commit 和 PR

---

## 🎯 完成标准 | Completion Criteria

你可以认为 Autopilot V2 基本完成，当:

```bash
# 运行完整工作流
/autopilot "Build a simple TODO app with add/remove/complete features"

# 结果:
✅ Phase 1: 问了 5 个问题，生成了 PRD
✅ Phase 2: 分解为 8 个任务
✅ Phase 3: 实现了所有任务（可能有些失败）
✅ Phase 4: 自动修复了 2 个错误
✅ Phase 5: 创建了 commit 和 PR

🎉 整个流程走通！
```

**进度**: 40% → 80%

---

## 📚 重要文档索引 | Important Docs Index

| 文档 | 用途 |
|------|------|
| **PROJECT_STATUS.md** | 项目完整分析和优先级 |
| **GETTING_STARTED.md** | 详细安装和开发指南 |
| **docs/IMPLEMENTATION_GUIDE.md** | 分步实现说明 |
| **docs/PSEUDOCODE.md** | 所有算法伪代码 |
| **docs/ARCHITECTURE.md** | V2 架构文档 |

---

## ⚡ 快速参考 | Quick Reference

### CLI 命令速查

```bash
# 任务管理
autopilot-cli tasks list
autopilot-cli tasks next
autopilot-cli tasks get <id>
autopilot-cli tasks done <id>
autopilot-cli tasks fail <id> --reason "..."

# 状态管理
autopilot-cli state get
autopilot-cli state set --phase <phase>
autopilot-cli state update --phase <phase>

# 语言检测
autopilot-cli detect
autopilot-cli detect --save
```

### Skills 调用 CLI

```bash
# 在 skill 中
TASK=$(autopilot-cli tasks next --json)
echo "$TASK" | jq .

# 或使用绝对路径
/Users/lukin/Projects/autopilot/cli/bin/autopilot-cli tasks list
```

### Agent 调用模板

```markdown
Use Task tool with:
  subagent_type: "general-purpose"
  description: "Implement task X"
  prompt: "..."
```

---

## 🆘 遇到问题？| Need Help?

### 常见问题

**Q1: npm install 失败**
```bash
cd cli
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Q2: /autopilot 命令不识别**
- 重启 Claude Code
- 检查 `~/.claude/plugins/autopilot` 符号链接
- 检查 `plugin.json` 格式

**Q3: CLI 命令找不到**
- 使用绝对路径
- 或添加到 PATH: `export PATH=$PATH:/Users/lukin/Projects/autopilot/cli/bin`

---

## 🎯 本周目标 | This Week's Goal

```
Day 1 (今天):
  ✅ 构建 CLI
  ✅ 安装插件
  ✅ 实现 Phase 1

Day 2:
  ✅ 实现 Phase 2
  ✅ 测试 Phase 1 + 2

Day 3:
  ✅ 实现 Phase 3

Day 4:
  ✅ 实现 Phase 4

Day 5:
  ✅ 实现 Phase 5
  ✅ 端到端测试

完成后: 🎉 Autopilot V2 核心功能完整！
```

---

**准备好了吗？从"立即执行"部分开始！** 🚀

**Ready? Start with the "Execute Now" section!** 🚀
