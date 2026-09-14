export interface CaseCollection {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  tag: string
}
export const caseCollections: CaseCollection[] = [
  {
    id: 'photographer',
    title: '摄影师的三张照片',
    subtitle: 'THE LAST PRINT',
    description: '修好一张码头照片，读到相框背后的留言，再从海面找回一个人的告别。',
    icon: 'fingerprint',
    color: '#668579',
    tag: '真实文件 · 连续取证',
  },
  {
    id: 'corners',
    title: '街角仍有灯',
    subtitle: 'SMALL LIGHTS IN THE CITY',
    description: '镜子店的热茶、温室里的薄荷、最后一班电车。大事件之外，有人还在认真生活。',
    icon: 'lightbulb',
    color: '#a18a58',
    tag: '短篇密码 · 自由选关',
  },
  {
    id: 'supply',
    title: '雨夜补给站',
    subtitle: 'THE NIGHT SUPPLY STATION',
    description: '校准天平、量好热水、排妥摆渡、整理仓库。用四个小机关，备好一座城市的明天。',
    icon: 'archive',
    color: '#728653',
    tag: '四种小游戏 · 连续任务',
  },
  {
    id: 'cipherlab',
    title: '夜班密码实验室',
    subtitle: 'THE LATE SHIFT LAB',
    description:
      '一段资料可以有不止一种读法。接续解码、循环密钥和候选摘要，把接收器里剩下的信号送达。',
    icon: 'key',
    color: '#887397',
    tag: '多层编码 · CTF 入门',
  },
  {
    id: 'fairground',
    title: '未散场的游园会',
    subtitle: 'ONE MORE SEAT, ONE MORE LIGHT',
    description: '票口的符号锁、拐弯的光束、桥上的一盏灯。修好这场演出，让后来的人也有座位。',
    icon: 'sparkles',
    color: '#a58160',
    tag: '六份连续档案 · 动手与推理',
  },
  {
    id: 'postoffice',
    title: '无人签收的邮局',
    subtitle: 'LETTERS BETWEEN TWO CHANNELS',
    description: '地址藏进域名，句子乱序到达，左右声道各守着半句承诺。读懂一封等了很久的信。',
    icon: 'mail',
    color: '#638991',
    tag: '网络与声音 · 真实物证',
  },
  {
    id: 'observatory',
    title: '把夜空还给星星',
    subtitle: 'THE SKY BELONGS TO TOMORROW',
    description: '校准星历，走遍星轨，挪开挡住窗口的镜架。天文台可以等待黎明，也可以不再挽留黑夜。',
    icon: 'star',
    color: '#738c95',
    tag: '八份观测记录 · 五种新机关',
  },
  {
    id: 'press',
    title: '停在付印前的报社',
    subtitle: 'A CORRECTION FOR TOMORROW',
    description:
      '一份被上锁的校样，一张贴错的标记，一页看起来没有改变的文字。让更正得到和头条一样的位置。',
    icon: 'file',
    color: '#a48b60',
    tag: '压缩包与文件校验 · 六份校样',
  },
  {
    id: 'camp',
    title: '雨停之前的营地',
    subtitle: 'THE CAPTAIN HAS LEFT A NOTE',
    description: '搭好树下的帐篷，修复河湾步道，再找出队长到底是谁。一场带着脚蹼印的郑重寻宝。',
    icon: 'tent',
    color: '#7d8b55',
    tag: '营地与环线 · 六份雨后短笺',
  },
  {
    id: 'theatre',
    title: '不必完美的首演',
    subtitle: 'ROOM FOR ONE MORE PERSON',
    description: '四个点、六张圆牌、一整座布景。解开绳线，排练开场，为晚到的人留一个位置。',
    icon: 'sparkles',
    color: '#96735e',
    tag: '拖动解结 · 四份排演记录',
  },
]
export const collectionById = Object.fromEntries(
  caseCollections.map((collection) => [collection.id, collection]),
)
