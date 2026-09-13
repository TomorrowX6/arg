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
- `cipher` 可设置 `config.tool` 为 `caesar`、`base64`、`vigenere` 或 `xor`，启用对应站内辅助工具。

新增机制时同步更新类型、档案标签、卡片图标、渲染器与实际交互测试。完成后运行内容测试、相关浏览器测试与生产构建。

## 取证物证

`scripts/generate-evidence.mjs` 以原创像素绘图生成三份真实 PNG 文件，并在内容编译前自动执行。第一张仅损坏前四个签名字节；第二张把 Base64 留言写入 tEXt 的 Comment；第三张把零字节结束的 ASCII 写入蓝色通道最低位。单元测试直接读取这些文件，核对 CRC、元数据、像素解码和隐藏信息；浏览器测试下载修复后的文件并验证字节。

支线使用 `optional: true`，不会计入主线进度或阻挡结局。可以用 `requires` 组成独立故事，完成后优先进入依赖当前档案的下一关。
