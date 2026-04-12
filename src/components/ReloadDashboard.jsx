import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const LIFECYCLE_GROUPS = [
  { key: 'Active', label: 'Active', color: '#1a6ef5', icon: '⚡' },
  { key: 'Churned Short Lapse', label: 'Churned Short Lapse', color: '#e8a020', icon: '⏱' },
  { key: 'Churned Long Lapse', label: 'Churned Long Lapse', color: '#dc2626', icon: '💤' },
  { key: 'OTD', label: 'One Time Depositor', color: '#7c3aed', icon: '1️⃣' },
  { key: 'Dormant', label: 'Dormant', color: '#64748b', icon: '🌙' },
]

const VALUE_ORDER = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'EV', '']
const PRODUCT_COLORS = { Sport: '#16a34a', Casino: '#e8a020', Hybrid: '#7c3aed' }

function fmt(v) { return v ? Number(v).toLocaleString('tr-TR') : '0' }
function pct(a, b) { return b > 0 ? ((a / b) * 100).toFixed(1) : null }
function liftPP(tResp, tTarg, cResp, cTarg) {
  if (!tTarg || !cTarg) return null
  return ((tResp / tTarg) - (cResp / cTarg)) * 100
}

// Simple SVG line chart
function LineChart({ data, height = 200 }) {
  if (!data || data.length === 0) return null
  const periods = [...new Set(data.map(d => d.period))].sort()
  const groups = [...new Set(data.map(d => d.lifecycle))]
  const colors = {}
  LIFECYCLE_GROUPS.forEach(g => { colors[g.key] = g.color })

  if (periods.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px', opacity: 0.4 }}>📈</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Upload more periods to see trends</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '4px' }}>Currently showing: {periods[0]}</div>
        </div>
      </div>
    )
  }

  // Build series
  const series = groups.map(lc => {
    const points = periods.map(p => {
      const rows = data.filter(d => d.period === p && d.lifecycle === lc)
      const t = rows.reduce((s, r) => s + (r.targeted_customers || 0), 0)
      const resp = rows.reduce((s, r) => s + (r.targeted_responders || 0), 0)
      return { period: p, conv: t > 0 ? (resp / t) * 100 : 0 }
    })
    return { lc, points, color: colors[lc] || '#888' }
  })

  const allVals = series.flatMap(s => s.points.map(p => p.conv)).filter(v => v > 0)
  const maxVal = Math.max(...allVals, 1)
  const W = 800, H = height - 40
  const xStep = W / (periods.length - 1)
  const yScale = v => H - (v / maxVal) * H * 0.85

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '20px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)' }}>Conversion Rate Over Time (%)</span>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {series.map(s => (
            <div key={s.lc} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '20px', height: '3px', background: s.color, borderRadius: '2px' }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text2)' }}>{s.lc}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W + 60} ${H + 50}`} style={{ width: '100%', minWidth: '400px' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = yScale((v / 100) * maxVal)
            return y >= 0 && y <= H ? (
              <g key={v}>
                <line x1={40} y1={y + 10} x2={W + 50} y2={y + 10} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
                <text x={35} y={y + 14} textAnchor="end" fontSize="9" fill="var(--text3)">{((v / 100) * maxVal).toFixed(0)}%</text>
              </g>
            ) : null
          })}
          {/* Lines */}
          {series.map(s => {
            const pts = s.points.map((p, i) => `${40 + i * xStep},${yScale(p.conv) + 10}`)
            return (
              <g key={s.lc}>
                <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {s.points.map((p, i) => (
                  <circle key={i} cx={40 + i * xStep} cy={yScale(p.conv) + 10} r="4" fill={s.color} stroke="var(--bg2)" strokeWidth="2">
                    <title>{s.lc}: {p.conv.toFixed(1)}% on {p.period}</title>
                  </circle>
                ))}
              </g>
            )
          })}
          {/* X axis labels */}
          {periods.map((p, i) => (
            <text key={p} x={40 + i * xStep} y={H + 36} textAnchor="middle" fontSize="9" fill="var(--text3)">{p}</text>
          ))}
        </svg>
      </div>
    </div>
  )
}

// Reporting tag editor per segment
function ReportingTagCell({ targetGroup, currentTag, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(currentTag || '')

  const handleSave = async () => {
    await onSave(targetGroup, val.toUpperCase())
    setEditing(false)
  }

  if (editing) return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
        style={{ width: '140px', padding: '3px 6px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }} autoFocus />
      <button onClick={handleSave} style={{ padding: '3px 8px', fontSize: '0.7rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✓</button>
      <button onClick={() => setEditing(false)} style={{ padding: '3px 8px', fontSize: '0.7rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => setEditing(true)}>
      {val
        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent)', background: 'rgba(26,110,245,0.07)', padding: '1px 6px', borderRadius: '4px' }}>{val}</span>
        : <span style={{ fontSize: '0.7rem', color: 'var(--text3)', fontStyle: 'italic' }}>+ add tag</span>}
      <span style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>✏️</span>
    </div>
  )
}

export default function ReloadDashboard({ onUpload }) {
  const [allData, setAllData] = useState([])
  const [reportingTags, setReportingTags] = useState({})
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [selectedLifecycle, setSelectedLifecycle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: reloadData } = await supabase.from('reload_daily').select('*').order('range_start', { ascending: true })
    const { data: tagData } = await supabase.from('reload_reporting_tags').select('*')

    if (reloadData) {
      setAllData(reloadData)
      const p = [...new Map(reloadData.map(r => [`${r.range_start}||${r.range_end}`, { start: r.range_start, end: r.range_end, label: r.range_start === r.range_end ? r.range_start : `${r.range_start} → ${r.range_end}` }])).values()]
      setPeriods(p)
    }
    if (tagData) {
      const tags = {}
      tagData.forEach(t => { tags[t.target_group] = t.reporting_tag })
      setReportingTags(tags)
    }
    setLoading(false)
  }

  const handleSaveTag = async (targetGroup, tag) => {
    await supabase.from('reload_reporting_tags').upsert({ target_group: targetGroup, reporting_tag: tag }, { onConflict: 'target_group' })
    setReportingTags(prev => ({ ...prev, [targetGroup]: tag }))
  }

  // Filter data by period
  const filteredData = useMemo(() => {
    if (selectedPeriod === 'all') return allData
    const [start, end] = selectedPeriod.split('||')
    return allData.filter(r => r.range_start === start && r.range_end === end)
  }, [allData, selectedPeriod])

  // Chart data — one point per period per lifecycle
  const chartData = useMemo(() => {
    return allData.map(r => ({
      period: r.range_start === r.range_end ? r.range_start : `${r.range_start}→${r.range_end}`,
      lifecycle: r.lifecycle,
      targeted_customers: r.targeted_customers,
      targeted_responders: r.targeted_responders,
    }))
  }, [allData])

  // Lifecycle aggregations
  const lifecycleStats = useMemo(() => {
    const stats = {}
    LIFECYCLE_GROUPS.forEach(g => {
      const rows = filteredData.filter(r => r.lifecycle === g.key)
      if (!stats[g.key]) stats[g.key] = { targeted: 0, control: 0, responders: 0, ctrl_resp: 0, rows: [] }
      rows.forEach(r => {
        stats[g.key].targeted += r.targeted_customers || 0
        stats[g.key].control += r.control_customers || 0
        stats[g.key].responders += r.targeted_responders || 0
        stats[g.key].ctrl_resp += r.control_responders || 0
        stats[g.key].rows.push(r)
      })
    })
    return stats
  }, [filteredData])

  // Drill-down: value segments for selected lifecycle
  const drillData = useMemo(() => {
    if (!selectedLifecycle) return []
    const rows = filteredData.filter(r => r.lifecycle === selectedLifecycle && !r.is_reminder)
    return [...rows].sort((a, b) => VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment))
  }, [filteredData, selectedLifecycle])

  const reminderData = useMemo(() => {
    if (!selectedLifecycle) return []
    return filteredData.filter(r => r.lifecycle === selectedLifecycle && r.is_reminder)
      .sort((a, b) => VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment))
  }, [filteredData, selectedLifecycle])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
      <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
      <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>Loading reload data…</p>
    </div>
  )

  if (allData.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon">📂</div>
      <h3>No reload data uploaded yet</h3>
      <p style={{ marginBottom: '20px' }}>Upload your Optimove reload CSV to get started.</p>
      <button className="btn-analysis" onClick={onUpload}>🔄 Upload Reload CSV</button>
    </div>
  )

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Period</span>
          <button onClick={() => setSelectedPeriod('all')} style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer',
            background: selectedPeriod === 'all' ? 'var(--accent)' : 'transparent',
            borderColor: selectedPeriod === 'all' ? 'var(--accent)' : 'var(--border)',
            color: selectedPeriod === 'all' ? '#fff' : 'var(--text2)',
          }}>All time</button>
          {periods.map(p => {
            const key = `${p.start}||${p.end}`
            const active = selectedPeriod === key
            return (
              <button key={key} onClick={() => setSelectedPeriod(key)} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer',
                background: active ? 'var(--accent)' : 'transparent',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                color: active ? '#fff' : 'var(--text2)',
              }}>{p.label}</button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedLifecycle && (
            <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => setSelectedLifecycle(null)}>← Back to overview</button>
          )}
          <button className="btn-analysis" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={onUpload}>🔄 Upload CSV</button>
        </div>
      </div>

      {/* Line chart */}
      <LineChart data={chartData} height={220} />

      {!selectedLifecycle ? (
        /* LIFECYCLE TILES */
        <>
          <div className="section-heading">Lifecycle Performance — click to drill down</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {LIFECYCLE_GROUPS.map(g => {
              const s = lifecycleStats[g.key]
              if (!s || s.rows.length === 0) return null
              const convRate = pct(s.responders, s.targeted)
              const ctrlConv = pct(s.ctrl_resp, s.control)
              const lift = liftPP(s.responders, s.targeted, s.ctrl_resp, s.control)
              const products = [...new Set(s.rows.map(r => r.product).filter(Boolean))]

              return (
                <div key={g.key}
                  onClick={() => setSelectedLifecycle(g.key)}
                  style={{
                    background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${g.color}`,
                    borderRadius: 'var(--radius-lg)', padding: '16px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = g.color; e.currentTarget.style.background = 'var(--bg3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{g.icon} {g.label}</div>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {products.map(p => <span key={p} style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: '4px', background: `${PRODUCT_COLORS[p]}15`, color: PRODUCT_COLORS[p], border: `1px solid ${PRODUCT_COLORS[p]}30` }}>{p}</span>)}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px' }}>{s.rows.length} segments</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Targeted</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600 }}>{fmt(s.targeted)}</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Responders</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>{fmt(s.responders)}</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Conv %</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</div>
                    </div>
                  </div>
                  {lift !== null && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: lift > 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {lift > 0 ? '↑' : '↓'} Incremental lift vs control: <strong>{lift > 0 ? '+' : ''}{lift.toFixed(1)}pp</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* DRILL DOWN — Value segments */
        <>
          {(() => {
            const g = LIFECYCLE_GROUPS.find(g => g.key === selectedLifecycle)
            const s = lifecycleStats[selectedLifecycle]
            return (
              <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${g?.color}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>{g?.icon} {g?.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '3px' }}>
                    {fmt(s?.targeted)} targeted · {fmt(s?.responders)} responders · {pct(s?.responders, s?.targeted)}% conv
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Reminder note */}
          <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '12px' }}>
            Showing primary segments. Click the reporting tag field to assign a tag — used later for bonus cost mapping.
          </p>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  {['Value', 'Product', 'Target Group', 'Reporting Tag', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl Conv %', 'Lift'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drillData.map((r, i) => {
                  const convRate = pct(r.targeted_responders, r.targeted_customers)
                  const ctrlConv = pct(r.control_responders, r.control_customers)
                  const lift = liftPP(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '9px 12px' }}>
                        {r.value_segment ? <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>{r.value_segment}</span> : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: '0.75rem', color: PRODUCT_COLORS[r.product] || 'var(--text2)', fontWeight: 600 }}>{r.product || '—'}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{r.target_group}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <ReportingTagCell targetGroup={r.target_group} currentTag={reportingTags[r.target_group]} onSave={handleSaveTag} />
                      </td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{fmt(r.targeted_customers)}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{fmt(r.control_customers)}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmt(r.targeted_responders)}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{ctrlConv ? ctrlConv + '%' : '—'}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700, color: lift === null ? 'var(--text3)' : lift > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {lift !== null ? `${lift > 0 ? '+' : ''}${lift.toFixed(1)}pp` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Reminder segments */}
          {reminderData.length > 0 && (
            <>
              <div className="section-heading">Reminder Segments</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      {['Value', 'Product', 'Target Group', 'Reporting Tag', 'Targeted', 'Responders', 'Conv %'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reminderData.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '9px 12px' }}>
                          {r.value_segment ? <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', fontWeight: 700 }}>{r.value_segment}</span> : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: '0.75rem', color: PRODUCT_COLORS[r.product] || 'var(--text2)', fontWeight: 600 }}>{r.product || '—'}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text2)' }}>{r.target_group}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <ReportingTagCell targetGroup={r.target_group} currentTag={reportingTags[r.target_group]} onSave={handleSaveTag} />
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{fmt(r.targeted_customers)}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmt(r.targeted_responders)}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{pct(r.targeted_responders, r.targeted_customers) ? pct(r.targeted_responders, r.targeted_customers) + '%' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
