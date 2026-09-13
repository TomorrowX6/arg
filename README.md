# 余响档案馆 · The Echo Archive

> 1999 年，雾港从所有地图上被抹去。二十七年后，你收到了一段来自那里的广播。

一个可以直接在浏览器里游玩的原创中文 ARG 解谜游戏。你是第 014 号临时档案员，从一封未寄出的信出发，恢复城市信号，查证被改写的记录，找回每个人选择明天的权利。

**在线游玩：[tomorrowx6.github.io/arg](https://tomorrowx6.github.io/arg/)**

![余响档案馆调查工作台](docs/screenshots/dashboard.png)

## 游戏内容

- 六章、36 份连续主线档案，从入门观察逐步走向跨档案取证。
- 三种完整结局，可重新选择与回看，提示使用不会锁定任何结局。
- 16 类谜题与交互：信件取证、密码分析、摩斯电码、调频、虚拟终端、熄灯、记忆复现、路线规划、版本比对、时间排序、数字锁、逻辑推理、数织、紫外显影、滑块拼图、旋转线路。
- 异常接收站：按 UTC+8 日期与编号生成可重复、可分享的短篇谜题。
- 档案搜索与筛选、收藏、证据墙与时间线、可关联案件的调查手记。
- 自动本地存档、JSON 导出导入、损坏存档原始备份、音效与阅读偏好。
- 每关三层提示；所需线索和工具均在站内。无需真实账号、线下行动或外部解码网站。

## 本地运行

需要 Node.js 24 或更高版本，以及 npm。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。构建静态站点：

```bash
npm run build
npm run preview
```

`dist/` 可以部署到任何静态主机。网站使用相对资源路径与 HashRouter，支持 GitHub Pages 的 `/arg/` 子目录，不需要服务器路由改写。

## 检查与验证

```bash
npm run lint
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
```

单元与内容测试验证答案归一化、哈希一致性、关卡依赖可达性、关键密码、路由、电路与存档。浏览器测试实际通关整条主线，操作各类机关，回看全部结局，并检查笔记迁移、存档保护、手机导航与可访问性。

```bash
npm run format
npm run format:check
```

开发截图与扩展可访问性检查：先在 `4173` 端口启动开发服务器，再运行 `node scripts/capture.mjs` 或 `node scripts/audit.mjs`。结果写入忽略目录 `artifacts/`。

## 项目结构

```text
content/              作者维护的章节与关卡（含答案，请注意剧透）
scripts/              内容编译、截图、检查工具
src/data/             编译后的档案、进度查询与结局
src/game/             玩法算法、答案校验、状态与存档
src/components/       工作台与独立交互装置
src/pages/            档案、地图、笔记、接收站与结局页面
src/styles/           视觉系统与响应式样式
public/assets/        原创矢量场景与静态游戏资产
public/licenses/      随站点分发的字体许可证
tests/                单元、内容与真实浏览器测试
.github/workflows/    持续检查与 GitHub Pages 部署
```

修改 `content/puzzles-*.json` 后运行 `npm run generate`。`dev` 和 `build` 会自动执行生成。新关卡需要谜面、答案、三层提示、剧情回收和证据，具体约定见 [内容创作说明](docs/AUTHORING.md)。

## 存档与隐私

游戏进度、收藏和笔记只保存在当前浏览器的 `localStorage` 中，不上传服务器。音效由 Web Audio 在本地产生；字体随站点提供。没有登录、广告、分析脚本或第三方解码请求。

更换设备、清理浏览器数据或退出无痕模式前，请先在设置中导出存档。无法读取的旧存档不会被新的自动保存覆盖，可以先下载其原始备份，再选择导入或重置。

这是一个完整的前端叙事游戏。构建产物使用答案哈希避免普通页面直接展示答案字段，但公开源码和完整提示仍可用于查阅解法；它不提供竞赛级防作弊能力。

## 技术与许可

React 19、TypeScript、Vite 8、React Router、Lucide、Vitest、Playwright。所有游戏场景与故事为本项目原创，界面支持键盘、手机、减少动画、较大字号和增强对比度。

代码与原创素材采用 [MIT License](LICENSE)。Noto Serif SC 和 IBM Plex Mono 按各自 SIL Open Font License 分发，见 [第三方许可说明](docs/THIRD_PARTY.md)。
