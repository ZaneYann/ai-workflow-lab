# 前端视觉优化验证记录

基线：`f67df01cf87679ff01120043c1d43efe9849c7e0`。工作区开始时已有 `src/web/app.js`、`index.html`、`style.css` 未提交修改；保留并检查了这些修改。设计使用本机字体、slate/green 配色和 UI/UX Pro Max 的可访问性、触控、响应式与动效建议。未合并。

## 已检查

- 静态检查：`node --check src/web/app.js` 和 `git diff --check` 通过（Git 提示 app.js 换行将被转换）。CSS 显式文字尺寸均至少 16px；表单输入、按钮和结果链接设置最小高度 44px，标签关联表单控件，最低 Stars 提示以 `aria-describedby` 关联，存在焦点样式、状态 live region 和 reduced-motion 规则。这些是代码检查，不等同于浏览器实测。
- 按 WCAG 相对亮度公式计算的部分前景/背景对比度：`#95a8bd` / `#101a2a` 7.16:1；`#71869e` / `#0b1421` 4.93:1；`#ff827e` / `#080d17` 8.10:1；`#56d68a` / `#07150d` 10.14:1；`#9bb0c5` / `#142237` 7.16:1。这不是全页面浏览器对比度审计。
- `npm test`：33 项中 25 通过、8 失败。失败均为 `test/export-cli.test.js` 子进程测试。直接运行 `spawnSync(process.execPath, ['--version'])` 返回 `status: null`，错误为 `spawnSync C:\nvm4w\nodejs\node.exe EPERM`，stdout/stderr 未定义；说明这些失败无法证明 CLI 行为错误。
- `npm run test:browser`：Chrome 文件存在，进程在建立 DevTools 前退出，报告 `Error: Chrome exited: 4294930433`（十六进制 `ffff7001`），位置 `test-support/browser-e2e.cjs:34`。脚本以 `stdio: 'ignore'` 启动，未提供 Chrome 标准错误，根因尚未确定。

## 主控沙箱外复测（主控提供的结果）

- `npm test`：33/33 通过。
- `npm run test:browser`：通过；覆盖正常查询、格式切换、主动下载、空结果、超时、Token 保密及重试。上方 Worker 沙箱内失败记录仍保留，供环境诊断；两者为不同运行环境的结果。

## Worker 沙箱外最终验收

- 权限审批通过后，最终 `npm test` 33/33 通过；`npm run test:browser` 通过。浏览器使用真实 headless Chrome，GitHub 上游由测试桩替代。
- 实际浏览器视口 375、768、1024、1440px，文档宽度依次为 360、753、1009、1425px（Windows 纵向滚动条占 15px）；均等于各自的内容区宽度，无页面横向溢出。四档输入、选择器、按钮及样例仓库链接均至少 44×44px；检查的正文及控件文字至少 16px，字段均有标签。四档截图位于 `frontend-visual-evidence/viewport-375.png`、`viewport-768.png`、`viewport-1024.png`、`viewport-1440.png`，已人工复核。768px 初版结果控件换行拥挤，修复后重新截图。
- 模拟 Tab 验证跳转链接及周期、语言、关键词、数量、排序、最低 Stars、日期、查询、格式、下载、仓库链接、输出区依次可达，焦点轮廓 3px；日期原生控件包含多个 Tab 分段。状态为 `role=status`，最低 Stars 提示通过 `aria-describedby` 关联。模拟 reduced-motion 时动画与过渡为 0.00001 秒。
- 浏览器测试覆盖非法最小 Stars 的原生有效性、正常查询、空结果、模拟超时、格式切换、实际下载、无自动下载、Token 保密与重试。错误状态和部分颜色对比度见上；尚未进行屏幕阅读器人工测试或全页面所有状态的自动对比度审计，因此不声称完成完整 WCAG 审计。
- 测试开发期间首次把含滚动条的 `clientWidth` 当作视口宽度，导致 360 与 375 的断言失败；更正为比较 `innerWidth` 与目标、`scrollWidth` 与 `clientWidth` 后通过。另一次键盘测试因原生日期输入的分段 Tab 重复而失败；保留真实分段行为并按连续相同控件去重后通过。

## 待审计

任务状态按已验证的任务验收更新。测试未覆盖真实 GitHub 网络或屏幕阅读器，颜色对比度仅对所记录的配色进行计算；主控应审阅这些限制及完整 diff。未合并。
