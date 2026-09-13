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
]
export const collectionById = Object.fromEntries(
  caseCollections.map((collection) => [collection.id, collection]),
)
