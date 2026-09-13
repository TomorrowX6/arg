import type { Artifact } from '../game/types'
import { Icon } from './Icon'
import { FrequencyDevice, LightsDevice, MorseDevice, TerminalDevice } from './Devices'
import { DialDevice, RouteDevice, SequenceDevice, SortDevice } from './MoreDevices'
import { CipherTool } from './CipherTool'
import { NonogramDevice } from './NonogramDevice'
import { RevealDevice } from './RevealDevice'
import { SlidingDevice } from './SlidingDevice'
import { CircuitDevice } from './CircuitDevice'
import { ForensicDevice } from './ForensicDevice'
import { BalanceDevice } from './BalanceDevice'
import { JugDevice } from './JugDevice'
import { FerryDevice } from './FerryDevice'
import { WarehouseDevice } from './WarehouseDevice'
import { LaserDevice } from './LaserDevice'
import { CodeBreakDevice } from './CodeBreakDevice'
import { BridgeDevice } from './BridgeDevice'
import '../styles/nonogram.css'
import '../styles/mini-games.css'
import '../styles/fairground.css'

export function ArtifactView({ artifact }: { artifact: Artifact }) {
  const specialized = [
    'frequency',
    'lights',
    'morse',
    'terminal',
    'route',
    'sequence',
    'sort',
    'dial',
    'nonogram',
    'uv',
    'sliding',
    'circuit',
    'forensic',
    'balance',
    'jugs',
    'ferry',
    'warehouse',
    'laser',
    'codebreak',
    'bridge',
  ].includes(artifact.type)
  return (
    <section className={`artifact artifact-${artifact.type}`} aria-label={artifact.label}>
      <div className="artifact-label">
        <span>
          <Icon name="file" size={14} />
          {artifact.label}
        </span>
        <span>原始资料 · 可交互</span>
      </div>
      <div className="artifact-content">
        {artifact.title && <h3 className="artifact-title">{artifact.title}</h3>}
        {artifact.type === 'laser' ? (
          <LaserDevice artifact={artifact} />
        ) : artifact.type === 'codebreak' ? (
          <CodeBreakDevice artifact={artifact} />
        ) : artifact.type === 'bridge' ? (
          <BridgeDevice artifact={artifact} />
        ) : artifact.type === 'balance' ? (
          <BalanceDevice artifact={artifact} />
        ) : artifact.type === 'jugs' ? (
          <JugDevice artifact={artifact} />
        ) : artifact.type === 'ferry' ? (
          <FerryDevice artifact={artifact} />
        ) : artifact.type === 'warehouse' ? (
          <WarehouseDevice artifact={artifact} />
        ) : artifact.type === 'forensic' ? (
          <ForensicDevice artifact={artifact} />
        ) : artifact.type === 'frequency' ? (
          <FrequencyDevice artifact={artifact} />
        ) : artifact.type === 'lights' ? (
          <LightsDevice artifact={artifact} />
        ) : artifact.type === 'morse' ? (
          <MorseDevice artifact={artifact} />
        ) : artifact.type === 'terminal' ? (
          <TerminalDevice artifact={artifact} />
        ) : artifact.type === 'route' ? (
          <RouteDevice artifact={artifact} />
        ) : artifact.type === 'sequence' ? (
          <SequenceDevice artifact={artifact} />
        ) : artifact.type === 'sort' ? (
          <SortDevice artifact={artifact} />
        ) : artifact.type === 'dial' ? (
          <DialDevice artifact={artifact} />
        ) : artifact.type === 'nonogram' ? (
          <NonogramDevice artifact={artifact} />
        ) : artifact.type === 'uv' ? (
          <RevealDevice artifact={artifact} />
        ) : artifact.type === 'sliding' ? (
          <SlidingDevice artifact={artifact} />
        ) : artifact.type === 'circuit' ? (
          <CircuitDevice artifact={artifact} />
        ) : (
          <>
            {artifact.lines && (
              <div className="document-lines">
                {artifact.lines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
            {artifact.text && <div className="document-text">{artifact.text}</div>}
            {artifact.code && <pre className="cipher-code">{artifact.code}</pre>}
            {artifact.table && (
              <div className="artifact-table-scroll">
                <table className="artifact-table">
                  <thead>
                    <tr>
                      {artifact.table[0].map((cell, index) => (
                        <th key={index} scope="col">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {artifact.table.slice(1).map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, i) => (
                          <td key={i}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {artifact.key && <div className="cipher-key">{artifact.key}</div>}
            {artifact.annotation && (
              <p className="artifact-annotation">
                <Icon name="eye" size={15} />
                {artifact.annotation}
              </p>
            )}
            <CipherTool artifact={artifact} />
          </>
        )}
        {specialized && artifact.type !== 'morse' && artifact.annotation && (
          <p className="artifact-annotation">{artifact.annotation}</p>
        )}
      </div>
      <div className="artifact-bottom">
        <span>ECHO ARCHIVE · FORENSIC COPY</span>
        <span>
          请留意每一个细节 <span>↗</span>
        </span>
      </div>
    </section>
  )
}
