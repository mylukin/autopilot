# Autopilot 快速开始指南 | Getting Started Guide

**当前版本**: 2.0.0
**状态**: 基础设施就绪，核心 Skills 待实现

---

## ✅ 第一步：安装和测试基础设施 | Step 1: Install and Test Infrastructure

**预计时间**: 15-20 分钟

### 1.1 构建 CLI 工具 | Build CLI Tool

```bash
# 进入 CLI 目录
cd /Users/lukin/Projects/autopilot/cli

# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 验证构建成功
ls -la dist/

# 测试 CLI
./bin/autopilot-cli --version
```

**预期输出**:
```
1.0.0
```

### 1.2 安装插件 | Install Plugin

```bash
# 返回项目根目录
cd /Users/lukin/Projects/autopilot

# 创建符号链接到 Claude Code 插件目录
ln -s $(pwd) ~/.claude/plugins/autopilot

# 验证安装
ls -la ~/.claude/plugins/autopilot
```

### 1.3 测试 CLI 命令 | Test CLI Commands

```bash
# 回到项目目录
cd /Users/lukin/Projects/autopilot

# 测试语言检测
./cli/bin/autopilot-cli detect

# 测试状态管理
./cli/bin/autopilot-cli state get

# 测试任务列表
cd workspace
../cli/bin/autopilot-cli tasks list
```

**如果成功**: ✅ CLI 工具工作正常

### 1.4 在 Claude Code 中测试 | Test in Claude Code

打开 Claude Code，在对话中运行:

```
/autopilot "Build a simple TODO app"
```

**预期行为**:
- ✅ 命令被识别
- ⚠️  会显示 "Phase 1-5 skills not implemented yet" 或类似消息
- ✅ 这是正常的！说明插件已正确安装

---

## ⏳ 第二步：实现核心 Skills（本周任务）| Step 2: Implement Core Skills

**预计时间**: 12-15 小时（分 3-5 天完成）

### 2.1 Phase 1: Clarify (2-3小时)

**目标**: 实现交互式需求澄清

**创建文件**: `skills/phase-1-clarify/SKILL.md`

**核心功能**:
- 生成 3-5 个结构化问题
- 收集用户答案
- 生成 PRD 文档
- 保存到 `workspace/ai/prd.md`

**参考**:
- `docs/PSEUDOCODE.md` - Phase 1 算法
- `docs/IMPLEMENTATION_GUIDE.md` - Phase 1 实现指南

### 2.2 Phase 2: Breakdown (2-3小时)

**目标**: 将 PRD 分解为原子任务

**创建文件**: `skills/phase-2-breakdown/SKILL.md`

**核心功能**:
- 读取 PRD
- 分解为 1-3 小时的小任务
- 使用 `autopilot-cli tasks create` 创建任务文件
- 显示任务计划给用户审批

**参考**:
- `workspace/ai/tasks/` - 任务文件示例
- `cli/README.md` - CLI tasks 命令

### 2.3 Phase 3: Implement (3-4小时)

**目标**: 循环执行所有任务

**创建文件**: `skills/phase-3-implement/SKILL.md`

**核心功能**:
- 循环: `autopilot-cli tasks next`
- 为每个任务创建 fresh agent
- 实现 + 测试（TDD）
- 使用 `autopilot-cli tasks done <id>` 标记完成
- 错误时调用 phase-4-heal

**参考**:
- `skills/autopilot-orchestrator/SKILL.md` - Phase 3 部分

### 2.4 Phase 4: Heal (2小时)

**目标**: 自动修复错误

**创建文件**: `skills/phase-4-heal/SKILL.md`

**核心功能**:
- 捕获错误信息
- WebSearch 搜索解决方案
- 应用修复
- 重新运行测试
- 最多 3 次尝试

**参考**:
- `superpowers` 项目的 systematic-debugging

### 2.5 Phase 5: Deliver (2-3小时)

**目标**: 质量验证和交付

**创建文件**: `skills/phase-5-deliver/SKILL.md`

**核心功能**:
- 获取语言配置: `autopilot-cli detect --json`
- 运行验证命令（lint, test, build）
- 创建 git commit
- 创建 PR（使用 gh cli）
- 生成交付报告

**参考**:
- `docs/PSEUDOCODE.md` - Phase 5 算法

---

## 📝 实现 Skills 的模板 | Template for Implementing Skills

使用这个模板创建每个 skill:

```markdown
---
name: phase-X-<name>
description: <skill-description>
allowed-tools: [Task, Read, Write, Bash, Grep, Glob]
user-invocable: false
---

# Phase X: <Name>

## Overview | 概述

<描述这个 phase 做什么>

## When to Use | 何时使用

Invoked by autopilot-orchestrator during Phase X of the workflow.

## Execution | 执行

### Step 1: <First Step Name>

<详细说明第一步>

```bash
# 示例命令
autopilot-cli <command>
```

### Step 2: <Second Step Name>

<详细说明第二步>

...

## Output | 输出

Return structured result to orchestrator:

```yaml
---PHASE RESULT---
phase: <phase-name>
status: success/failure
<phase-specific-data>
---END PHASE RESULT---
```

## Error Handling | 错误处理

| Error | Action |
|-------|--------|
| <error-type> | <how-to-handle> |

## Rules | 规则

1. <rule-1>
2. <rule-2>
...
```

---

## 🎯 完成度检查清单 | Completion Checklist

### 阶段 1: 基础设施 ✅

- [x] CLI 工具代码完成
- [x] plugin.json 创建
- [x] marketplace.json 创建
- [x] /autopilot 命令创建
- [ ] CLI 构建成功（运行 npm install && npm run build）
- [ ] 插件安装到 Claude Code
- [ ] /autopilot 命令可调用

### 阶段 2: 核心 Skills ⏳

- [ ] phase-1-clarify 实现
- [ ] phase-2-breakdown 实现
- [ ] phase-3-implement 实现
- [ ] phase-4-heal 实现
- [ ] phase-5-deliver 实现

### 阶段 3: 端到端测试 ⏳

- [ ] 运行 /autopilot 完整工作流
- [ ] Phase 1 交互式澄清工作
- [ ] Phase 2 任务分解生成
- [ ] Phase 3 任务实现循环
- [ ] Phase 4 错误自愈
- [ ] Phase 5 交付和 PR 创建

---

## 🔧 故障排除 | Troubleshooting

### CLI 构建失败

**错误**: `Cannot find module 'commander'`

**解决**:
```bash
cd cli
rm -rf node_modules package-lock.json
npm install
```

### 插件未被识别

**错误**: `/autopilot` command not found

**解决**:
1. 检查符号链接:
   ```bash
   ls -la ~/.claude/plugins/autopilot
   ```
2. 重启 Claude Code
3. 检查 plugin.json 格式:
   ```bash
   cat .claude-plugin/plugin.json | jq .
   ```

### Skills 无法调用 CLI

**错误**: `autopilot-cli: command not found` in skill execution

**解决**:
1. 使用绝对路径:
   ```bash
   /Users/lukin/Projects/autopilot/cli/bin/autopilot-cli <command>
   ```
2. 或在 skill 中设置 PATH:
   ```bash
   export PATH="$PATH:/Users/lukin/Projects/autopilot/cli/bin"
   ```

---

## 📚 下一步学习资源 | Next Learning Resources

### 必读文档

1. **PROJECT_STATUS.md** - 项目完成度和下一步计划
2. **docs/ARCHITECTURE.md** - V2 架构详解
3. **docs/IMPLEMENTATION_GUIDE.md** - 详细实现指南
4. **docs/PSEUDOCODE.md** - 所有算法伪代码

### 参考项目

1. **ralph-ryan** (`/Users/lukin/Projects/ralph-ryan`)
   - Fresh context pattern
   - Interactive PRD generation
   - Agent spawning examples

2. **superpowers** (`/Users/lukin/Projects/superpowers`)
   - TDD enforcement
   - Systematic debugging
   - Verification workflows

3. **agent-foreman** (当前项目)
   - Task management
   - CLI workflow
   - Modular storage

---

## 💡 开发提示 | Development Tips

### 快速迭代

1. **先实现简化版** - 每个 phase 先写最小可用版本
2. **逐步增强** - 工作后再添加高级功能
3. **频繁测试** - 每完成一个 phase 就测试

### 调试技巧

1. **使用 echo 调试**:
   ```bash
   echo "DEBUG: Current state = $STATE" >&2
   ```

2. **保存中间结果**:
   ```bash
   echo "$RESULT" > /tmp/autopilot-debug.json
   ```

3. **检查 CLI 输出**:
   ```bash
   autopilot-cli tasks list --json | jq .
   ```

### 推荐工作流

**Day 1 (2-3h)**:
- ✅ 构建 CLI
- ✅ 安装插件
- ✅ 实现 phase-1-clarify (简化版)

**Day 2 (2-3h)**:
- ✅ 实现 phase-2-breakdown
- ✅ 测试 Phase 1 + 2 集成

**Day 3 (3-4h)**:
- ✅ 实现 phase-3-implement (核心循环)

**Day 4 (2h)**:
- ✅ 实现 phase-4-heal

**Day 5 (2-3h)**:
- ✅ 实现 phase-5-deliver
- ✅ 端到端测试

---

## 🎉 成功标准 | Success Criteria

你完成了 Autopilot V2 当:

1. ✅ 运行 `/autopilot "Build a TODO app"` 不报错
2. ✅ Phase 1 能问问题并生成 PRD
3. ✅ Phase 2 能分解任务并保存到 workspace/ai/tasks/
4. ✅ Phase 3 能循环执行任务
5. ✅ Phase 4 能捕获错误并尝试修复
6. ✅ Phase 5 能运行验证并创建 commit
7. ✅ 整个流程在示例项目上成功运行

---

**祝你开发顺利！有问题随时查看文档或参考项目。** 🚀

**Happy coding! Check docs or reference projects if you have questions.** 🚀
