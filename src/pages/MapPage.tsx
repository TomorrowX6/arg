import { Link } from 'react-router-dom'
import { CityMap } from '../components/CityMap'
import { Icon } from '../components/Icon'
import { chapters, puzzles, getStatus } from '../data/archive'
import { useGame } from '../game/useGame'

export default function MapPage() {
  const { state } = useGame()
  return (
    <div className="page map-page">
      <header className="page-title-row">
        <div>
          <div className="eyebrow">WUGANG / SURVEY 1999—1117</div>
          <h1>地图会遗忘。你不会。</h1>
          <p>沿着恢复的信号，重新画出这座城市的轮廓。</p>
        </div>
        <span className="map-page-badge">
          <span className="status-dot" />
          信号持续追踪中
        </span>
      </header>
      <section className="full-map">
        <div className="full-map-header">
          <span>
            <Icon name="map" size={17} />
            雾港调查地图
          </span>
          <span>虚构坐标 / 无需前往现实地点</span>
        </div>
        <CityMap large />
        <div className="map-legend">
          <span>
            <i className="available" />
            信号已发现
          </span>
          <span>
            <i className="done" />
            调查完成
          </span>
          <span>
            <i />
            尚未抵达
          </span>
        </div>
      </section>
      <div className="map-location-grid">
        {chapters
          .filter((chapter) => chapter.id !== 'side')
          .map((chapter) => {
            const entries = puzzles.filter((puzzle) => puzzle.chapter === chapter.id)
            const solved = entries.filter((puzzle) => state.solved[puzzle.id]).length
            const open = entries.some((puzzle) => getStatus(puzzle, state) !== 'locked')
            return (
              <Link
                key={chapter.id}
                to={`/archives?chapter=${chapter.id}`}
                className={`location-card ${open ? 'open' : ''}`}
              >
                <div className="location-card-top">
                  <span>{chapter.number}</span>
                  <Icon name={chapter.icon} size={22} />
                </div>
                <h2>{chapter.location}</h2>
                <p>{chapter.description}</p>
                <div>
                  <small>
                    {solved} / {entries.length} 份档案已复原
                  </small>
                  <Icon name={open ? 'arrowUpRight' : 'lock'} size={16} />
                </div>
              </Link>
            )
          })}
      </div>
    </div>
  )
}
