# 添加一份值得调查的档案

关卡源文件放在 `content/puzzles-*.json`，按文件名与数组顺序编译。主线关卡应连贯，支线可设置 `optional: true` 并归入 `side` 章节。

## 必需字段

| 字段                       | 用途                                        |
| -------------------------- | ------------------------------------------- |
| `id`                       | 永久稳定、唯一的存档键，例如 `a01` 或 `x01` |
| `chapter`                  | `content/chapters.json` 中的章节 ID         |
| `number`                   | 全局唯一的展示编号                          |
| `title`, `subtitle`        | 卷宗标题与一句吸引人的引子                  |
| `kind`                     | 对应交互类型；与 `artifact.type` 一致       |
| `difficulty`, `minutes`    | 1–3 难度与估算时间，不是倒计时              |
| `briefing`                 | 自足的谜面与操作说明，字符串数组            |
| `artifact`                 | 原始证物、文本、图表或交互配置              |
| `question`, `answerFormat` | 明确的目标与答案格式                        |
| `answers`                  | 接受的全部答案写法，至少一个                |
| `hints`                    | 恰好三层：方向、方法、完整解法              |
| `resolution`               | 成功后解释发现的意义并推进故事              |
| `evidence`                 | 可收入证据墙的标题、内容和图标              |
| `requires`                 | 可选的前置关卡 ID 数组                      |

答案统一做 NFKC、去除空白、英文大小写归一化，也接受 `flag{...}` / `arg{...}` / `echo{...}`。不同标点、同义词和中英文译法需要明确写进 `answers`。

## 编译与公平性

运行 `npm run generate` 会验证 ID、前置引用和提示数量，将明文 `answers` 转换为 SHA-256 校验值。网页使用生成文件；作者源文件包含剧透，不应作为新玩家入口。

新关卡至少满足这些条件：

1. 所需信息可以从本关或明确指出的已解锁档案找到。
2. 没有“猜作者脑中想法”的隐含规则；坐标顺序、编码方向、单位和索引起点要明确。
3. 新机关说明鼠标、触摸和键盘的操作方式，并提供重试。
4. 提示第三层确实能从初始状态复现成功；涉及矩阵、路线和重排时，应验证解法。
5. 尽量让解开的东西回答一个故事问题，而不只是一个孤立单词。
6. 不依赖现实地址、真实账号、外部网络可用性或玩家当地时间。

## 交互配置

- `frequency`：`min`, `max`, `target`, `message`。
- `terminal`：`files` 字典；仅模拟本关文件和受支持命令，不执行系统命令。
- `lights`：`size`, `initial`（0/1 矩阵展平）, `message`。点击翻转自身与正交邻居，目标全灭。
- `route`：`nodes`（ID、标签、百分比坐标）, `edges`, `path`, `message`。
- `sequence`：`symbols`, `sequence`（从 0 开始的索引）, `message`。
- `sort`：`items`（ID、标题、说明）, `correct`（ID 顺序）, `message`。
- `dial`：`digits`, `combination`（保留前导零的字符串）, `message`。
- `nonogram`：`size`, `solution`（0/1 矩阵展平）, `message`。
- `uv`：`text`（按换行显示的隐形批注）, `message`。
- `sliding`：`size`, `initial`（数字矩阵展平，0 是空格）, `message`。目标为 1…N−1、0，必须确保可解。
- `circuit`：`size`, `initial`（方向位掩码矩阵展平）, `message`。上=1、右=2、下=4、左=8；输入为第一格左侧，输出为最后一格右侧。
- `forensic`：`src`（相对 public 的文件路径）, `filename`, `mode`（`header` / `metadata` / `lsb`）, `description`（可访问的画面描述）。检验台实际读取 PNG 字节。`header` 开启八字节文件头编辑；像素工具支持未交错的 8 位 RGB/RGBA PNG，按前 104 个像素、指定通道和位平面读取 ASCII。
- `balance`：`count`（硬币数量）, `heavy`（从 1 开始的较重硬币编号）, `maxWeighings`, `message`。每次两盘数量必须相同，提交判断前必须由称量记录排除到唯一候选。
- `jugs`：`capacity`（两个整数容量）, `targetJug`（0/1）, `target`, `message`。只可装满、倒空、倒至源空或目标满；`solveJugs` 可验证最短解。
- `ferry`：`passengers`（`label`, `symbol`）, `conflicts`（不能在无人照看时同岸的索引对）, `message`。船载一位乘客，可以空船往返；非法渡河不执行。
- `warehouse`：`layout`（等宽字符串数组）, `message`。`#` 墙、空格地面、`.` 目标、`$` 箱子、`@` 玩家、`+` 目标上的玩家、`*` 就位箱子；`solveWarehouse` 用于证明可解。
- `laser`：`size`、`source`（棋盘外的 `x`, `y` 与 `direction`）、`exit`（棋盘外坐标）、`mirrors`（从 0 编号的 `cell`、`tilt` 为 `/` 或反斜线、可选 `fixed`）、`walls`、`receivers`、`message`。镜面反射 90°；所有接收器被照到且光从指定出口离开才算完成。`traceLaser` 可检测挡板、出界与回路，`solveLaser` 枚举活动镜面验证解法。
- `codebreak`：`symbols`（`label`, `glyph`）、`secret`（符号索引数组）、`maxGuesses`、`message`。支持重复符号，先统计位置正确，再从未匹配符号里统计误位，避免重复计数。玩家可以查看剩余候选数量；用完机会可重试同一个谜面。
- `bridge`：`people`（`label`, 正整数 `time`）、`budget`、可选两项 `banks`、`message`。每次一至两人与提灯同侧出发，耗时取同行者较大值；可撤回，不执行超出灯油预算的动作。`solveBridge` 计算最短总用时，题目必须至少容纳一个解。
- `packet`：`src`、`filename`。读取经典 PCAP 的以太网 / IPv4 / UDP / TCP / DNS，显示实际字段与载荷；编号 DNS 查询片段可去重、排序为十六进制；TCP 按单向四元组与序列号重组，检测缺口及矛盾重传，读取 HTTP 与 gzip 正文。提供原件和重组字节下载。当前检验台不重组 IP 分片、TCP 序列号回绕或多次复用同一四元组的连接。
- `wave`：`src`、`filename`。读取单声道或双声道 16 位 PCM WAV，含 RIFF LIST/INFO 备注。波形、512 点 Hann 窗 FFT 声谱与声道合成全部来自采样数据；合声 `(L+R)/2`，差分 `(L−R)/2`。当前频带像素工具读取 750–1500 Hz 的七条等距频带，每列时长可调，默认 160 ms。
- `unicode`：`src`、`filename`。读取真实 UTF-8 文本，统计常见不可见字符、可视化其位置，按选择的两种码位映射为 0/1，再以八位字节解码。默认 U+200B=0，U+200C=1。
- `sudoku`：`size`、`boxRows`、`boxColumns`、`givens`（按行展平，0 为待填格）、`message`。行、列和宫均包含 1…size 一次；支持铅笔候选、局部候选检查、方向键与撤回。`solveSudoku` 最多返回两解，用于验证唯一性，不在谜面中存储完整答案。
- `constellation`：`nodes`（`id`, `label`, 百分比 `x`, `y`）、`edges`（无向端点对）、`start`、`end`、`message`。星点可重访，连线只能走一次，全部用完并在指定终点结束；`findStarTrail` 与 `starTrailStatus` 验证完整路线。
- `traffic`：`size`、`vehicles`（`id`, `label`, `axis` 为 h/v, `length`, 从 0 开始的 `row`, `column`）、`target`、`message`。横架左右、竖架上下，目标必须是横架，抵达右边界即可；移动不能跳过阻挡。`solveTraffic` 按单格步数求最短路线，`validTraffic` 验证边界和碰撞。
- `orbital`：`gears`（`label`, `period`, `phase`）、`steps`（推进按钮的分钟数）、`message`。所有指针每分钟加一后按各自周期取模；`orbitalAlignment` 返回第一个共同零点与完整周期，题目应当有解且周期不超过一百万。
- `stencil`：`rows`、`columns`、`layers`（`label`, 按行展平的 0/1 字符串 `bits`）。选择叠片后真实逐格异或，奇数黑点保留、偶数抵消。内置完整 5×7 拉丁字库，`readPixelText` 直接比对运算后的字形，提供可访问的文字识读；7 行、各字之间一列空白。
- `zip`：`src`、`filename`。从真实 ZIP 目录和载荷读取条目，支持 STORED / DEFLATE、UTF-8 / CP437 名称、传统 ZipCrypto（含数据描述符）、文件前缀与最多五层嵌套。读取后检查实际长度与 CRC-32，再计算完整字节的 SHA-256；伪加密修复仅在按未加密读取通过校验后清除两处标记。归档限制 8 MB、256 条目，单条目解压限制 5 MB；不支持 ZIP64、跨卷、强加密或其他压缩方法。
- `tents`：`size`、`trees`（按行展平的树木位置，从 0 开始）、`rowCounts`、`columnCounts`、`message`。帐篷互不八邻接，行列数量精确，每顶帐篷与一棵四邻接的树配对。使用最大二分匹配判断一对一关系，不能只检查「旁边有树」。`solveTents` 返回最多两解用于验证唯一性；草地标记不参与完成判断。
- `loop`：`rows`、`columns`、`clues`（数字或 null，按行展平）、`message`。数字约束该格四条边的选中数量；所有画线组成唯一闭环，使用的顶点度数恰好为二。无需经过全部顶点或围住全部数字。横边先按行排列，再排竖边；`loopEdges` 给出端点和邻格，`solveLoop` 使用数字与顶点约束检查唯一性。排除标记只是笔记，完成不要求填满排除标记。
- `untangle`：`nodes`（`id`, `label`, `x`, `y`, 可选 `fixed`）、`edges`（ID 对）、`message`。坐标在 8–92 内，圆牌半径为 6；圆牌不能重叠，线段不能穿过无关圆牌，非共同端点处不能相交，共同端点的同向共线重叠也不允许。`untangleStatus` 根据实际几何关系检查任意摆法，不比对一份固定布局。需给出经验证的坐标解法；拖动到松手计作一次撤回记录，键盘与坐标输入都可完成。
- `cipher` 可设置 `config.tool` 为 `caesar`、`base64`、`vigenere` 或 `xor`，启用对应站内辅助工具。

新增机制时同步更新类型、档案标签、卡片图标、渲染器与实际交互测试。完成后运行内容测试、相关浏览器测试与生产构建。

## 取证物证

`scripts/generate-evidence.mjs` 以原创像素绘图生成三份真实 PNG 文件，并在内容编译前自动执行。第一张仅损坏前四个签名字节；第二张把 Base64 留言写入 tEXt 的 Comment；第三张把零字节结束的 ASCII 写入蓝色通道最低位。单元测试直接读取这些文件，核对 CRC、元数据、像素解码和隐藏信息；浏览器测试下载修复后的文件并验证字节。

`scripts/generate-transmissions.mjs` 生成三份 PCAP、真实零宽字符信件与双声道 WAV。PCAP 使用文档保留地址与 `.invalid` 域名，包含有效 IPv4/TCP 校验和、DNS 名称压缩、TCP 握手、乱序与重复片段；它们是游戏编写的静态物证，不来自真实用户通信。WAV 在共同背景上叠加方向相反的七频带信号，差分还原字形。所有生成过程可复现，文件同时随源码与网站提供；页面不硬编码这些物证的检验输出。

`scripts/generate-press.mjs` 生成六份真实压缩物证，分别承载批注、ZipCrypto、伪加密位、带前缀的嵌套 ZIP、不可见字符与完整字节摘要、跨证据组合口令。ZIP 密码区分大小写，并按 UTF-8 编码；题面必须明确拼接方式。生成文件可由外部解压软件检查，页面从实际字节中得出结果。单元测试还覆盖错误密码、CRC 损坏、目录边界和谎报长度的解压限制。

支线使用 `optional: true`，不会计入主线进度或阻挡结局。可以用 `requires` 组成独立故事，完成后优先进入依赖当前档案的下一关。

## 故事分组与工具箱

异常档案的 `collection` 对应 `src/data/collections.ts` 中的故事 ID。目录提供组内筛选，档案侧栏只列当前故事，避免长目录挤占手机阅读空间。

密码和摩斯档案可以通过页面上的入口把 `artifact.code` 带入 `/tools`。设置 `artifact.config.tool` 为 `src/data/tools.ts` 中的工具 ID，会预选该方法。工具箱保留本次最近 12 次处理记录，支持将结果作为下一步输入、复制和保存到关联笔记。多层题仍须在谜面中明确包装顺序、所需密钥与分隔规则。

`src/game/codecs.ts` 的 18 种工具有独立示例与往返测试；字节工具统一按 UTF-8 读取。SHA-256 是候选校验而不是可逆解码，题目必须明确大小写、空白和换行约定。

## 可分享的接收站

`/field` 默认使用 v2 接收协议。24 类信号循环分为 13 类密码与 11 类机关，64 个主题词由日期与编号共同决定。支持频道筛选、前后翻页、按日期与编号调取，以及带着资料进入工具箱后返回原电报。

旧链接只要有 `date` 或 `n` 而没有 `v`，仍按 v1 生成；新链接明确带 `v=2`。v2 种子为 `echo-field-v2:日期:从零开始的编号`。**发布后保持词库顺序、类型顺序和随机数调用顺序不变**，需要更改题目生成逻辑时增加协议版本，避免朋友收到不同的谜面。

`procedural.ts` 负责生成机关及可复现解法：熄灯从全灭状态逆向操作；滑块用合法移动打乱；线路保留贯通路径；仓库使用已验证模板的旋转与镜像；数织图案的所有变体均通过唯一解检查。第三层提示仍提供完整校验词，练习不会影响主线结局。接收记录保留有效日期与唯一 ID，不按日期数量或单日数量静默截断。

## 离线发布与证据对照

`npm run build` 在 Vite 构建后运行 `scripts/generate-offline.mjs`，按完整静态文件内容与 Worker 模板生成版本号、预缓存清单和体积信息。请发布整个 `dist/`，包括 `sw.js` 与 `offline-info.json`；单独运行 `vite build` 不会生成离线包。

离线功能只在玩家选择下载后注册。资源全部成功保存才启用，失败会删除不完整的新缓存；更新默认等待，玩家确认刷新才接管。缓存名称带部署作用域，保留上一版资源，移除档案包不会触碰其他应用的缓存或游戏存档。

`npm run test:offline` 在真实浏览器验证子目录部署、断网重载、跨页取证、更新等待、另一标签页草稿保留、下载中断恢复，以及对其他应用缓存的隔离。

证据墙只检索已复原档案。`/evidence?collection=故事ID&from=档案ID` 可预选故事并保留返回入口；`item=档案ID` 可直接打开已收集证物。最多六份证据可按选择顺序对照，原文和来源能一次保存为调查手记。
