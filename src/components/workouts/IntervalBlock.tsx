// src/components/workouts/IntervalBlock.tsx
// ─────────────────────────────────────────────────────────
// This is ONE interval row in the workout builder.
// Example: [Warm Up] [10 min] [Zone 2] [🗑️]
//
// The workout builder is made of MANY of these blocks
// stacked on top of each other.
// ─────────────────────────────────────────────────────────
'use client'

import { HR_ZONES, INTERVAL_TYPES, SPORT_CONFIG } from '@/lib/workout-utils'

// ── TYPE: what data does one interval hold? ───────────────
export interface IntervalData {
  id: string           // Unique ID so React can track this block
  type: string         // 'warmup' | 'work' | 'rest' | 'cooldown'
  measureBy: 'time' | 'distance'  // Are we measuring by time or distance?
  
  // Time-based fields
  hours: number
  minutes: number
  seconds: number

  // Distance-based fields
  distance: number     // The number (e.g. 400)
  distanceUnit: string // 'yards' | 'miles'

  // Intensity
  hrZone: number       // 1-5
  notes: string        // Optional coach notes for this interval
}

// ── PROPS: what does this component need from its parent? ──
interface IntervalBlockProps {
  interval: IntervalData          // The data for this interval
  index: number                   // Which number is this? (1st, 2nd, etc.)
  sport: 'swim' | 'bike' | 'run' // Which sport — affects what options show
  onChange: (id: string, field: string, value: string | number) => void
  // onChange = function called when user changes any field
  // "id" tells us WHICH interval changed
  // "field" tells us WHICH field changed (e.g. "minutes")
  // "value" is the new value
  onDelete: (id: string) => void  // Called when user clicks the trash icon
}

export default function IntervalBlock({
  interval,
  index,
  sport,
  onChange,
  onDelete,
}: IntervalBlockProps) {

  // Find the color for this interval type
  const intervalType = INTERVAL_TYPES.find(t => t.value === interval.type)
  const typeColor = intervalType?.color || '#6b7280'
  // "?." = optional chaining — don't crash if intervalType is undefined
  // "|| '#6b7280'" = fall back to gray if no color found

  const sportConfig = SPORT_CONFIG[sport]
  // Get the config for this sport (swim/bike/run)

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">

      {/* ── ROW 1: Type selector + delete button ── */}
      <div className="flex items-center gap-3 mb-3">

        {/* Interval number badge */}
        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
          {index + 1}
          {/* index starts at 0, so we add 1 to show "1, 2, 3..." */}
        </div>

        {/* Interval type dropdown */}
        <select
          value={interval.type}
          onChange={(e) => onChange(interval.id, 'type', e.target.value)}
          className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          style={{ borderLeftColor: typeColor, borderLeftWidth: '3px' }}
          // The left border color shows the interval type visually
        >
          {INTERVAL_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Delete button */}
        <button
          onClick={() => onDelete(interval.id)}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
          title="Delete this interval"
        >
          🗑️
        </button>
      </div>

      {/* ── ROW 2: Measure by Time or Distance ── */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onChange(interval.id, 'measureBy', 'time')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            interval.measureBy === 'time'
              ? 'bg-cyan-500 text-gray-950'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          ⏱ Time
        </button>
        <button
          onClick={() => onChange(interval.id, 'measureBy', 'distance')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            interval.measureBy === 'distance'
              ? 'bg-cyan-500 text-gray-950'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          📏 Distance
        </button>
      </div>

      {/* ── ROW 3: Duration OR Distance inputs ── */}
      {interval.measureBy === 'time' ? (
        // TIME inputs: Hours : Minutes : Seconds
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hours</label>
            <input
              type="number"
              min="0"
              max="23"
              value={interval.hours}
              onChange={(e) => onChange(interval.id, 'hours', parseInt(e.target.value) || 0)}
              // parseInt converts the string "2" to the number 2
              // "|| 0" means if parsing fails, use 0
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min</label>
            <input
              type="number"
              min="0"
              max="59"
              value={interval.minutes}
              onChange={(e) => onChange(interval.id, 'minutes', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sec</label>
            <input
              type="number"
              min="0"
              max="59"
              value={interval.seconds}
              onChange={(e) => onChange(interval.id, 'seconds', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      ) : (
        // DISTANCE inputs: dropdown of common distances
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">
            Distance ({sportConfig.distanceUnit})
          </label>
          <select
            value={interval.distance}
            onChange={(e) => onChange(interval.id, 'distance', parseFloat(e.target.value))}
            // parseFloat handles decimals like 3.1 miles
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            {sportConfig.distanceOptions.map(d => (
              <option key={d} value={d}>
                {d} {sportConfig.distanceUnit}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── ROW 4: Heart Rate Zone ── */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-2">Heart Rate Zone</label>
        <div className="grid grid-cols-5 gap-1">
          {/* Show all 5 zones as clickable buttons */}
          {HR_ZONES.map(zone => (
            <button
              key={zone.zone}
              onClick={() => onChange(interval.id, 'hrZone', zone.zone)}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                interval.hrZone === zone.zone
                  ? 'text-gray-950 scale-105'
                  // scale-105 = slightly bigger when selected
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              style={
                interval.hrZone === zone.zone
                  ? { backgroundColor: zone.color }
                  : {}
              }
              title={zone.description}
              // title = tooltip on hover
            >
              Z{zone.zone}
            </button>
          ))}
        </div>
        {/* Show description of selected zone */}
        <p className="text-xs text-gray-500 mt-1">
          {HR_ZONES.find(z => z.zone === interval.hrZone)?.description}
        </p>
      </div>

      {/* ── ROW 5: Notes ── */}
      <div>
        <input
          type="text"
          value={interval.notes}
          onChange={(e) => onChange(interval.id, 'notes', e.target.value)}
          placeholder="Notes (e.g. 'Keep cadence above 90')"
          className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 placeholder-gray-600"
        />
      </div>

    </div>
  )
}
