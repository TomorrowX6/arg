import { useId } from 'react'

export function DawnIllustration() {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      className="dawn-illustration"
      viewBox="0 0 1000 300"
      role="img"
      aria-label="天亮的雾港：太阳升起，灯塔与街道重新出现在海边。"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#e9dfc1" />
          <stop offset="1" stopColor="#f1ead6" />
        </linearGradient>
        <pattern id={`${id}-windows`} width="22" height="28" patternUnits="userSpaceOnUse">
          <rect x="7" y="7" width="7" height="12" fill="#ddc391" />
        </pattern>
      </defs>
      <rect width="1000" height="300" fill={`url(#${id}-sky)`} />
      <circle cx="696" cy="123" r="68" fill="#d9ad78" opacity=".75" />
      <circle cx="696" cy="123" r="89" fill="none" stroke="#d8b789" strokeWidth="1" opacity=".5" />
      <path
        d="M0 212 91 195 185 201 303 180 393 201 488 189 586 204 704 185 824 197 920 184 1000 197V300H0Z"
        fill="#b0bca0"
      />
      <path d="M0 249Q160 229 305 247T597 239 1000 242V300H0Z" fill="#829b86" />
      <g fill="#526f59">
        <path d="M48 159h45v132H48zM97 186h71v108H97zM180 140h49v154h-49zM234 189h56v105h-56zM349 199h65v95h-65zM774 171h62v123h-62zM843 134h47v160h-47zM902 192h72v102h-72z" />
        <path d="m174 140 30-24 31 24zM838 134l29-21 28 21z" />
      </g>
      <g fill={`url(#${id}-windows)`}>
        <path d="M54 171h33v110H54zM105 198h55v81h-55zM186 151h37v128h-37zM242 202h39v76h-39zM783 181h44v97h-44zM850 146h33v132h-33zM911 204h54v72h-54z" />
      </g>
      <path d="M583 290V157h28v133" fill="#e0d5b1" />
      <path d="M578 157h38v-10h-38zM583 131h28v16h-28z" fill="#536f59" />
      <path d="m578 131 19-18 19 18z" fill="#536f59" />
      <path d="M583 187h28M583 225h28M583 264h28" stroke="#75906b" strokeWidth="7" />
      <path d="M597 114V99" stroke="#536f59" strokeWidth="2" />
      <path d="M0 291H1000" stroke="#41614d" strokeWidth="7" />
      <g stroke="#8ea37f" fill="none" strokeWidth="2">
        <path d="M446 95q8-8 16 0 8-8 16 0M738 62q7-8 14 0 7-8 14 0M324 133q6-7 12 0 6-7 12 0" />
      </g>
      <text x="38" y="39" fontFamily="monospace" fontSize="8" letterSpacing="2" fill="#718365">
        WUGANG / THE NEXT MORNING
      </text>
      <text x="850" y="39" fontFamily="monospace" fontSize="8" letterSpacing="2" fill="#718365">
        06:00 / DAWN
      </text>
    </svg>
  )
}
