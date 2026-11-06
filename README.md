# GitHub 仓库速览

本项目提供现有命令行工具及单机浏览器页面。使用 Node.js 安装依赖后启动：

```sh
npm install
npm run web
```

在本机打开 <http://127.0.0.1:3000>，设置查询条件并点击“查询仓库”。选择 JSON 或表格后可主动下载当前结果。页面不会自动创建导出文件。可通过 `PORT` 环境变量更改端口，服务只监听 `127.0.0.1`。可在启动服务前设置 `GITHUB_TOKEN` 以使用 GitHub 认证；页面不会接收或展示 Token。未设置 Token 也可查询。

数据来自 GitHub 官方仓库搜索 API，不是官方 Trending 榜单；该 API 不提供当日增长数据，相关字段可能为空。页面沿用 CLI 的查询和格式语义。命令行仍可通过 `npm start -- --help` 查看用法。

运行测试：`npm test`。

浏览器端到端测试：`npm run test:browser`。默认使用 Windows 上的 Chrome；其他安装位置可通过 `CHROME_PATH` 环境变量指定 Chrome 可执行文件。测试使用临时浏览器配置、模拟 GitHub 响应，并验证实际下载文件；不会访问 GitHub。

最低 Star 数可通过 CLI 的 `--min-stars 100` 或网页的“最低 Stars”设置；留空则不限制，0 和阈值本身均包含在内。
