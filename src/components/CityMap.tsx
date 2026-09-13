import { useId } from 'react'
import { Link } from 'react-router-dom'
import { chapters, puzzles, getStatus } from '../data/archive'
import { useGame } from '../game/useGame'

const points = [
  { x: 240, y: 258 },
  { x: 369, y: 335 },
  { x: 391, y: 185 },
  { x: 524, y: 139 },
  { x: 546, y: 321 },
  { x: 638, y: 231 },
]
export function CityMap({ large = false }: { large?: boolean }) {
  const { state } = useGame()
  const id = useId().replace(/:/g, '')
  return (
    <div className={`city-map ${large ? 'city-map-large' : ''}`}>
      <svg viewBox="0 0 780 460" role="img" aria-labelledby={`${id}-title`}>
        <title id={`${id}-title`}>雾港调查地图，六个地点从旧广播大楼连接到中央发射塔</title>
        <defs>
          <pattern id={`${id}-grid`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="currentColor"
              strokeWidth=".6"
              opacity=".12"
            />
          </pattern>
          <pattern
            id={`${id}-water`}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-35)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="currentColor"
              strokeWidth=".8"
              opacity=".08"
            />
          </pattern>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="#ea9675" stopOpacity=".12" />
            <stop offset="1" stopColor="#ea9675" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="780" height="460" fill={`url(#${id}-grid)`} />
        <path
          d="M0,0 H780 V96 L728,111 671,101 633,122 610,109 574,134 548,110 522,93 503,127 466,107 423,132 397,118 343,143 314,129 274,164 243,148 222,179 181,169 161,201 113,190 87,219 40,207 0,225 Z"
          fill={`url(#${id}-water)`}
        />
        <path
          className="map-coast"
          d="M0,225 40,207 87,219 113,190 161,201 181,169 222,179 243,148 274,164 314,129 343,143 397,118 423,132 466,107 503,127 522,93 548,110 574,134 610,109 633,122 671,101 728,111 780,96"
        />
        <g className="map-buildings">
          <path d="M192,225 h26 v19 h-26z M262,210 h41 v28 h-41z M278,254 h27 v24 h-27z M188,281 h32 v36 h-32z M252,299 h45 v19 h-45z M282,341 h43 v35 h-43z M329,285 h20 v31 h-20z M373,235 h39 v26 h-39z M409,291 h20 v27 h-20z M438,230 h38 v42 h-38z M447,168 h33 v22 h-33z M493,183 h30 v38 h-30z M557,178 h30 v36 h-30z M599,274 h40 v23 h-40z M480,316 h34 v35 h-34z M578,351 h38 v24 h-38z M340,204 h20 v36 h-20z M647,300 h20 v27 h-20z" />
          <path
            d="M174,352 h63 v33 h-63z M416,362 h42 v25 h-42z M632,165 h37 v30 h-37z M678,242 h31 v45 h-31z"
            opacity=".4"
          />
        </g>
        <g className="map-roads">
          <path d="M113,255 313,255 313,185 455,185 455,140 622,140 622,231 709,231" />
          <path d="M152,335 369,335 369,285 546,285 546,405" />
          <path d="M240,205 V411 M340,151 V385 M588,136 V386" />
          <path d="M187,395 H711 M426,133 V418 M165,282 H683" />
        </g>
        <path
          className="map-route"
          d="M240,258 L240,335 L369,335 L369,185 L524,185 L524,139 L546,139 L546,321 L638,321 L638,231"
        />
        <circle cx="240" cy="258" r="110" fill={`url(#${id}-glow)`} />
        <text x="93" y="119" className="map-water-label" transform="rotate(-14 93 119)">
          雾 港 湾
        </text>
        <text x="106" y="143" className="map-tiny" transform="rotate(-14 106 143)">
          THE FORGOTTEN COAST
        </text>
        <g transform="translate(691 44)" className="map-compass">
          <path d="M0,34 V0 M-7,12 0,0 7,12" />
          <text x="-4" y="-9">
            N
          </text>
        </g>
        {points.map((point, index) => {
          const chapter = chapters[index]
          const entries = puzzles.filter((puzzle) => puzzle.chapter === chapter.id)
          const available = entries.some((puzzle) => getStatus(puzzle, state) !== 'locked')
          const done = entries.length > 0 && entries.every((puzzle) => !!state.solved[puzzle.id])
          return (
            <g
              key={chapter.id}
              className={`map-station ${available ? 'available' : ''} ${done ? 'done' : ''}`}
            >
              {index === 0 && <circle cx={point.x} cy={point.y} r="21" className="map-pulse" />}
              <circle cx={point.x} cy={point.y} r={index === 0 ? 10 : 7} />
              <circle cx={point.x} cy={point.y} r="2.5" className="map-station-core" />
              <text x={point.x + 16} y={point.y - 12}>
                {chapter.location}
              </text>
              <text x={point.x + 16} y={point.y + 4} className="map-tiny">
                {done ? 'SIGNAL RESTORED' : available ? 'SIGNAL DETECTED' : `SECTOR 0${index + 1}`}
              </text>
            </g>
          )
        })}
        <text x="30" y="429" className="map-tiny">
          31°17′ N / 121°03′ E
        </text>
        <text x="593" y="429" className="map-tiny">
          SURVEY NO. 1999—1117
        </text>
        <g className="map-scale" transform="translate(32,388)">
          <path d="M0,0 v6 h90 v-6 M45,0 v6" />
          <text x="0" y="-7">
            0
          </text>
          <text x="70" y="-7">
            500 m
          </text>
        </g>
      </svg>
      {large && (
        <div className="map-location-links">
          {chapters
            .filter((chapter) => chapter.id !== 'side')
            .map((chapter) => (
              <Link key={chapter.id} to={`/archives?chapter=${chapter.id}`}>
                <span>{chapter.number}</span>
                {chapter.location}
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
