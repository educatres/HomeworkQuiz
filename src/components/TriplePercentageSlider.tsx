import { useRef, type ChangeEvent } from 'react'

export type TriplePercentageValues = [number, number, number]

export interface TriplePercentageSliderProps {
  values: TriplePercentageValues
  labels: [string, string, string]
  colors?: [string, string, string]
  initialValues?: TriplePercentageValues
  onChange: (values: TriplePercentageValues) => void
  disabled?: boolean
}

const DEFAULT_VALUES: TriplePercentageValues = [40, 35, 25]
const DEFAULT_COLORS: [string, string, string] = ['#4285E8', '#20AD87', '#F3AC40']

function toUnit(value: number) {
  return Math.max(0, Math.min(20, Math.round(value / 5)))
}

function toValues(units: number[]): TriplePercentageValues {
  return [units[0] * 5, units[1] * 5, units[2] * 5]
}

function normalizeValues(values: readonly number[]): TriplePercentageValues {
  const units = values.slice(0, 3).map(value => toUnit(Number.isFinite(value) ? value : 0))
  while (units.length < 3) units.push(0)
  const total = units[0] + units[1] + units[2]
  if (total === 20) return toValues(units)
  if (total === 0) return [...DEFAULT_VALUES]

  const scaled = units.map(unit => (unit * 20) / total)
  const normalized = scaled.map(Math.floor)
  let remainder = 20 - normalized.reduce((sum, unit) => sum + unit, 0)
  scaled
    .map((unit, index) => ({ index, fraction: unit - normalized[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .forEach(({ index }) => {
      if (remainder > 0) {
        normalized[index] += 1
        remainder -= 1
      }
    })
  return toValues(normalized)
}

/** Pure linked-allocation rule. The changed value is kept exactly and the other two share the remainder. */
export function calculateLinkedValues(current: readonly number[], changedIndex: number, requestedValue: number): TriplePercentageValues {
  const base = normalizeValues(current)
  const nextUnits = base.map(value => value / 5)
  const index = Math.max(0, Math.min(2, Math.trunc(changedIndex)))
  const requestedUnits = Math.max(0, Math.min(20, Math.round(requestedValue / 5)))
  const otherIndices = [0, 1, 2].filter(item => item !== index)
  const remaining = 20 - requestedUnits
  const first = nextUnits[otherIndices[0]]
  const second = nextUnits[otherIndices[1]]
  const oldTotal = first + second
  const firstUnits = oldTotal > 0 ? Math.max(0, Math.min(remaining, Math.round(remaining * first / oldTotal))) : Math.ceil(remaining / 2)
  const next = [0, 0, 0]
  next[index] = requestedUnits
  next[otherIndices[0]] = firstUnits
  next[otherIndices[1]] = remaining - firstUnits
  return toValues(next)
}

export function TriplePercentageSlider({ values, labels, colors = DEFAULT_COLORS, initialValues = DEFAULT_VALUES, onChange, disabled = false }: TriplePercentageSliderProps) {
  const initialRef = useRef<TriplePercentageValues>(normalizeValues(initialValues))
  const current = normalizeValues(values)
  const total = current.reduce((sum, value) => sum + value, 0)

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange(calculateLinkedValues(current, index, Number(event.currentTarget.value)))
  }

  const reset = () => onChange([...initialRef.current])

  return <div className="tps" aria-label="比例分配">
    <div className="tps-header"><strong>比例分配</strong><span>總和 {total}%</span></div>
    <div className="tps-bar" role="img" aria-label={`比例分配：${labels[0]} ${current[0]}%、${labels[1]} ${current[1]}%、${labels[2]} ${current[2]}%`}>
      {current.map((value, index) => <span className="tps-bar-segment" key={labels[index]} style={{ width: `${value}%`, backgroundColor: colors[index] }} aria-hidden="true" />)}
    </div>
    <div className="tps-controls">
      {current.map((value, index) => <label className="tps-control" key={labels[index]}>
        <span className="tps-label-row"><span className="tps-label"><i style={{ backgroundColor: colors[index] }} />{labels[index]}</span><b>{value}%</b></span>
        <input className="tps-range" type="range" min="0" max="100" step="5" value={value} disabled={disabled} onChange={handleChange(index)} aria-label={`${labels[index]}比例`} aria-valuetext={`${value}%`} />
        <span className="tps-range-limits"><span>0%</span><span>100%</span></span>
      </label>)}
    </div>
    <button type="button" className="tps-reset" onClick={reset} disabled={disabled}>重設比例</button>
  </div>
}
