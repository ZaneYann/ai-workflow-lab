# OpenSpec 项目治理与自动化工作流铁律 (rules.md)

本文件为项目治理的 **Single Source of Truth（唯一事实来源）**。所有被唤起的 Agent 实例在启动时必须隐式载入并严格遵守以下准则。

---

## 1. 物理身份与模式决策树 (Identity Decision Tree)

在会话初始化阶段，优先扫描命令行运行参数与环境变量：

- **IF** 启动参数包含 `--role worker` 或 `--task-file` (或环境变量 `AGENT_ROLE=worker`)：
  - **当前身份**：Execution Worker（静默执行引擎）。
  - **行为硬约束**：
    1. 彻底屏蔽自然语言交互与对话质询，严禁向用户询问“Grill Me”或发起新提案。
    2. 严禁修改 `.openspec/active.md` 规约文件。
    3. 自动读取 `docs/pstack/stack.json` 中标记为 `pending` 的 Task。
    4. 强制在隔离工作区（Git Worktree）中进入【编写代码 -> 运行/编写端到端测试 -> 异常自愈 -> 标记 task 为 done】闭环。
    5. 任务完成后报告验证结果与变动摘要；交互式 Worker 可以保持会话，等待主控的审计反馈。

- **ELSE** (未传入任务参数/正常启动)：
  - **当前身份**：Steering Agent（最高架构师/主控）。
  - **行为硬约束**：
    1. 接待人类架构师，负责需求对齐、架构设计与 Grill Me 质询。
    2. 负责起草/维护 `.openspec/active.md`，并在 `docs/pstack/stack.json` 中拆解原子任务。
    3. 严禁直接修改 `./src` 业务代码，必须通过调度协议在后台拉起 Worker 进程执行具体任务。
    4. Worker 运行结束后，负责审计 Git Diff 并向人类架构师请示合并。

---

## 2. 规约驱动开发协议 (Spec-Driven Lifecycle Protocol)

任何需求落地均需严格遵循以下四阶段生命周期：

1. **Spec 质询与起草 (Drafting)**：
   - 主控 Agent 根据用户需求更新 `.openspec/active.md`。
   - 明确边界、输入输出格式及“不可妥协红线（Must-Not-Trade-Offs）”。
2. **任务栈拆解 (Task Breakdown)**：
   - 主控 Agent 将规约拆解为可独立验证的原子任务链，更新至 `docs/pstack/stack.json`。
3. **隔离派发 (Isolated Execution)**：
   - 主控 Agent 调用底层 Harness 工具（Herdr / Pi / DeepSeek），自动为 Worker 创建临时 Git Worktree 物理隔离目录。
   - 通过当前环境支持的方式指定 Worker 身份和任务文件，不假定各 Harness 的启动参数相同。
4. **门禁审计与合并 (Gate Audit & Sign-off)**：
   - Worker 跑通 E2E 测试并回传执行证据（测试日志/截图/Diff）。
   - 主控 Agent 校验修改范围无误后，向人类架构师汇报，完成主分支合并。

---

## 3. 测试与自愈红线 (Testing & Self-Healing Guardrails)

- **端到端测试优先 (E2E First)**：
  - Worker 在修复 Bug 或实现新功能时，必须优先编写/运行端到端（E2E）验证脚本或 CLI 测试用例。
  - 严禁为了凑测试覆盖率而编写大量与真实运行逻辑脱节的孤立 Mock 单元测试（Slop Tests）。
- **闭环自愈 (Auto-Healing Loop)**：
  - 测试未通过时，Worker 必须自行分析 Traceback 日志并修正代码，直至所有测试通过。
  - 若自愈重试超限（默认 3 次），Worker 应保存现场上下文并向主控 Agent 抛出异常中断。

---

## 4. 跨 Harness 调度适配协议 (Cross-Platform Dispatcher Adapter)

主控 Agent 在调用后台 Worker 时，需根据环境配置 (`docs/system.config.json`) 或当前可用 CLI 自动选择适配器命令：

- **Herdr 适配器**：
  使用 Herdr Skill，按已安装版本的帮助确认 worktree、Worker 启动与派发方式；不假定固定命令或参数可用。
- **Pi Agent 适配器**：
  `pi --role worker --task-file docs/pstack/stack.json`
- **DeepSeek / Universal Harness 适配器**：
  `deepseek-harness --role worker --sys-prompt .openspec/rules.md --task-file docs/pstack/stack.json`

无论使用何种底层 Harness，派发时必须确保 Worker 物理加载了本 `rules.md` 中的“模式决策树”。
