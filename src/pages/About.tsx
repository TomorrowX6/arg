import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { puzzles } from '../data/archive'

export default function About() {
  return (
    <div className="page about-page">
      <div className="eyebrow">BEFORE YOU ENTER / A SMALL GUIDE</div>
      <h1>
        欢迎来到，
        <br />
        余响档案馆<span>。</span>
      </h1>
      <p className="about-lead">
        这是一场关于记忆、失踪与重逢的互动谜案。
        <br />
        你会读一些信，听一些声音，打开一些本应被遗忘的门。
      </p>
      <div className="about-facts">
        <div>
          <Icon name="archive" size={24} />
          <strong>{puzzles.length} 份档案</strong>
          <span>循序渐进，逐步解封</span>
        </div>
        <div>
          <Icon name="clock" size={24} />
          <strong>没有倒计时</strong>
          <span>按照自己的节奏调查</span>
        </div>
        <div>
          <Icon name="key" size={24} />
          <strong>无需解谜经验</strong>
          <span>每关都有三层提示</span>
        </div>
      </div>
      <section className="about-letter">
        <span className="eyebrow">TO THE NEXT ARCHIVIST</span>
        <h2>有些城市，只要还有人记得，就不会消失。</h2>
        <p>
          1999 年 11 月 17
          日，23:17。雾港从地图上消失。没有灾难报道，没有撤离记录，只有所有数据库里一块整齐的空白。
        </p>
        <p>
          二十七年后，一封没有署名的信出现在你面前。你顺着信中的指引，走进了一座夜间开放的档案馆。这里的挂钟停在同一个时刻，而收音机里，有人一直在呼叫。
        </p>
        <p>
          你的任务不是拯救世界。只是认真看一眼那些差点被丢掉的东西，听完一个没来得及说完的故事。
        </p>
        <span className="notice-signature">
          愿你保持好奇。
          <br />
          —— 余响档案馆
        </span>
      </section>
      <section className="about-guide">
        <h2>入馆前，你可能想知道</h2>
        {[
          {
            title: '我该从哪里开始？',
            text: '点击工作台上的「接收第一条线索」，从那封未寄出的信开始。提交正确答案后，下一份档案会自动解封。可以随时回看已经完成的档案。',
          },
          {
            title: '卡住了怎么办？',
            text: '每关右侧都有三层提示：第一层指出方向，第二层给出方法，第三层提供完整解法。使用提示不会锁定结局。你也可以先去异常接收站做一份短谜题，再回来。',
          },
          {
            title: '需要外部网站、真实账号或线下行动吗？',
            text: '不需要。所有调查发生在这个虚构世界里。游戏里的地址、人物、终端和网络记录都是道具；所需信息和工具均可在站内找到。',
          },
          {
            title: '关闭页面后，进度还在吗？',
            text: '在同一浏览器中，进度、笔记和收藏会自动保存。无痕模式或清理浏览器数据可能移除存档。换设备或清理数据前，请到「偏好设置」导出 JSON 存档。',
          },
          {
            title: '不方便听声音，或者只用键盘，也能玩吗？',
            text: '可以。声音谜题提供可见电码与译码表，所有小游戏都能用键盘操作。Tab 切换控件，Enter 或空格操作按钮；滑块可以用方向键微调。设置里可以关闭音效、减少动画和放大正文。',
          },
          {
            title: '这是安全竞赛或真实黑客终端吗？',
            text: '这是一款剧情解谜游戏，部分谜题借用了 CTF 的编码与取证玩法。终端只处理本关预置的虚构文件，不会执行真实系统命令。前端答案校验用于游戏体验，不提供竞赛级防作弊。',
          },
          {
            title: '异常接收站是什么？',
            text: '它是独立于主线的短篇谜题区。同一天、同一编号会生成同一份电报，可以复制链接分享给朋友。点「接收下一份」可继续练习，不会跳过或影响主线。',
          },
        ].map((item) => (
          <details key={item.title}>
            <summary>
              {item.title}
              <Icon name="plus" size={17} />
            </summary>
            <p>{item.text}</p>
          </details>
        ))}
      </section>
      <div className="about-start">
        <span>收音机还开着。</span>
        <Link to="/case/a01" className="button button-coral">
          打开第一封信
          <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </div>
  )
}
