import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

// Lifecycle+Product groups — reminders folded in, no "Recreational" label
const LC_PRODUCT_GROUPS = [
  { key: 'Active|Casino',              label: 'Active Casino',                   lc: 'Active',              product: 'Casino',  color: '#1a6ef5' },
  { key: 'Active|Sport',               label: 'Active Sport',                    lc: 'Active',              product: 'Sport',   color: '#16a34a' },
  { key: 'Churned Short Lapse|Casino', label: 'Churned Short Lapse Casino',      lc: 'Churned Short Lapse', product: 'Casino',  color: '#e8a020' },
  { key: 'Churned Short Lapse|Sport',  label: 'Churned Short Lapse Sport',       lc: 'Churned Short Lapse', product: 'Sport',   color: '#f59e0b' },
  { key: 'Churned Long Lapse|Casino',  label: 'Churned Long Lapse Casino',       lc: 'Churned Long Lapse',  product: 'Casino',  color: '#dc2626' },
  { key: 'Churned Long Lapse|Sport',   label: 'Churned Long Lapse Sport',        lc: 'Churned Long Lapse',  product: 'Sport',   color: '#f87171' },
  { key: 'OTD|Casino',                 label: 'OTD Casino',                      lc: 'OTD',                 product: 'Casino',  color: '#7c3aed' },
  { key: 'OTD|Sport',                  label: 'OTD Sport',                       lc: 'OTD',                 product: 'Sport',   color: '#a78bfa' },
  { key: 'Dormant|Sport',              label: 'Dormant',                         lc: 'Dormant',             product: null,      color: '#64748b' },
]

const VALUE_ORDER = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'EV', '']

function fmt(v) { return v ? Number(v).toLocaleString('tr-TR') : '0' }
function pct(a, b) { return (a > 0 && b > 0) ? ((a / b) * 100).toFixed(1) : null }
function lift(tR, tT, cR, cT) {
  if (!tT || !cT) return null
  return ((tR / tT) - (cR / cT)) * 100
}

// SVG Line Chart
function LineChart({ seriesData, periods }) {
  if (!periods || periods.length < 2) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.3 }}>📈</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text2)', fontWeight: 500 }}>Trend chart available after 2+ uploads</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '4px' }}>Currently 1 period: {periods?.[0]?.label}</div>
        </div>
      </div>
    )
  }

  const W = 900, H = 160
  const PAD = { l: 44, r: 20, t: 12, b: 32 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b
  const xStep = chartW / (periods.length - 1)

  const allVals = seriesData.flatMap(s => s.points.map(p => p.conv)).filter(v => v >= 0)
  const maxVal = Math.max(...allVals, 1)
  const yScale = v => chartH - (v / maxVal) * chartH * 0.9 + PAD.t

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem' }}>Conversion Rate by Period (%)</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {seriesData.filter(s => s.hasData).map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '18px', height: '3px', background: s.color, borderRadius: '2px' }} />
              <span style={{ fontSize: '0.67rem', color: 'var(--text2)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H + PAD.b}`} style={{ width: '100%', minWidth: '400px', display: 'block' }}>
          {/* Y grid */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = yScale((v / 100) * maxVal)
            return y >= PAD.t && y <= chartH + PAD.t ? (
              <g key={v}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={PAD.l - 4} y={y + 3.5} textAnchor="end" fontSize="8.5" fill="var(--text3)">{((v / 100) * maxVal).toFixed(0)}%</text>
              </g>
            ) : null
          })}
          {/* Series */}
          {seriesData.filter(s => s.hasData).map(s => {
            const pts = s.points.map((p, i) => `${PAD.l + i * xStep},${yScale(p.conv)}`)
            return (
              <g key={s.key}>
                <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
                {s.points.map((p, i) => p.conv > 0 ? (
                  <g key={i}>
                    <circle cx={PAD.l + i * xStep} cy={yScale(p.conv)} r="4" fill={s.color} stroke="var(--bg2)" strokeWidth="2" />
                    <title>{s.label}: {p.conv.toFixed(1)}%</title>
                  </g>
                ) : null)}
              </g>
            )
          })}
          {/* X labels */}
          {periods.map((p, i) => (
            <text key={p.key} x={PAD.l + i * xStep} y={H + PAD.t + 14} textAnchor="middle" fontSize="8.5" fill="var(--text3)">{p.label}</text>
          ))}
        </svg>
      </div>
    </div>
  )
}

// Reporting tag inline editor
function TagEditor({ targetGroup, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  const save = async () => {
    await onSave(targetGroup, val.toUpperCase())
    setEditing(false)
  }

  if (editing) return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
        style={{ width: '130px', padding: '2px 6px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }} autoFocus />
      <button onClick={save} style={{ padding: '2px 7px', fontSize: '0.68rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✓</button>
      <button onClick={() => setEditing(false)} style={{ padding: '2px 7px', fontSize: '0.68rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
    </div>
  )

  return (
    <div style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={e => { e.stopPropagation(); setEditing(true) }}>
      {val
        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--accent)', background: 'rgba(26,110,245,0.07)', padding: '1px 6px', borderRadius: '4px' }}>{val}</span>
        : <span style={{ fontSize: '0.68rem', color: 'var(--text3)', fontStyle: 'italic' }}>+ tag</span>}
      <span style={{ fontSize: '0.58rem', color: 'var(--text3)', opacity: 0.6 }}>✏</span>
    </div>
  )
}

export default function ReloadDashboard({ onUpload }) {
  const [allData, setAllData] = useState([])
  const [tags, setTags] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [expandedPeriods, setExpandedPeriods] = useState({})
  const [analysisGroup, setAnalysisGroup] = useState(null)
  const [analysisResult, setAnalysisResult] = useState({})
  const [analysing, setAnalysing] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const [fetchError, setFetchError] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    setFetchError(null)
    const [{ data: rd, error: rdErr }, { data: td, error: tdErr }] = await Promise.all([
      supabase.from('reload_daily').select('*').order('range_start', { ascending: true }).limit(10000),
      supabase.from('reload_reporting_tags').select('*'),
    ])
    if (rdErr) { setFetchError('reload_daily error: ' + rdErr.message); setLoading(false); return }
    if (tdErr) { setFetchError('reload_reporting_tags error: ' + tdErr.message); setLoading(false); return }
    if (rd) setAllData(rd)
    else setAllData([])
    if (td) { const t = {}; td.forEach(r => { t[r.target_group] = r.reporting_tag }); setTags(t) }
    setLoading(false)
  }

  const handleAnalyse = async (g) => {
    const rows = groupRows(g, allData)
    if (!rows.length) return
    setAnalysing(g.key)

    const valueRows = rows.filter(r => !r.is_reminder)
    const tot = aggregate(rows)
    const conv = pct(tot.responders, tot.targeted)
    const liftVal = liftPP(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)

    const valueDetail = VALUE_ORDER.filter(v => v).map(v => {
      const vRows = valueRows.filter(r => r.value_segment === v)
      if (!vRows.length) return null
      const vTot = aggregate(vRows)
      const vConv = pct(vTot.responders, vTot.targeted)
      const vLift = liftPP(vTot.responders, vTot.targeted, vTot.ctrl_resp, vTot.control)
      return `  ${v}: ${vTot.targeted} targeted → ${vTot.responders} responders (${vConv || '—'}% conv, lift: ${vLift !== null ? (vLift > 0 ? '+' : '') + vLift.toFixed(1) + 'pp' : '—'})`
    }).filter(Boolean).join('\n')

    const prompt = `You are a senior CRM Analyst at Hepsibahis, online sports betting and casino in the Turkish market.

Analyse this reload segment and give a sharp commercial assessment with specific value segment recommendations.

SEGMENT: ${g.label}
Periods analysed: ${[...new Set(rows.map(r => `${r.range_start}→${r.range_end}`))].join(', ')}
Total targeted: ${fmt(tot.targeted)}
Total responders: ${fmt(tot.responders)}
Overall conversion: ${conv || '—'}%
Incremental lift vs control: ${liftVal !== null ? (liftVal > 0 ? '+' : '') + liftVal.toFixed(1) + 'pp' : 'N/A'}

Value segment breakdown:
${valueDetail}

Write a concise analysis (max 200 words, no headers, flowing text):
1. Overall performance verdict for this lifecycle+product group
2. Which value segments are performing well vs underperforming — be specific (e.g. "HV is converting at X% with strong lift, while LLV at Y% suggests the offer mechanic isn't resonating")
3. One specific, actionable recommendation per underperforming segment
Be direct and commercially focused.`

    try {
      const res = await fetch('/api/reload-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysisResult(prev => ({ ...prev, [g.key]: data.result }))
      setAnalysisGroup(g.key)
    } catch (e) {
      setAnalysisResult(prev => ({ ...prev, [g.key]: 'Error: ' + e.message }))
    }
    setAnalysing(null)
  }

  const handleSaveTag = async (tg, tag) => {
    await supabase.from('reload_reporting_tags').upsert({ target_group: tg, reporting_tag: tag }, { onConflict: 'target_group' })
    setTags(p => ({ ...p, [tg]: tag }))
  }

  // Unique periods sorted
  const periods = useMemo(() => {
    const seen = new Map()
    allData.forEach(r => {
      const key = `${r.range_start}||${r.range_end}`
      if (!seen.has(key)) seen.set(key, { key, start: r.range_start, end: r.range_end, label: r.range_start === r.range_end ? r.range_start : `${r.range_start}→${r.range_end}` })
    })
    return [...seen.values()].sort((a, b) => a.start.localeCompare(b.start))
  }, [allData])

  // For a given group, get rows matching lc+product (including reminders)
  const groupRows = (g, data) => data.filter(r => {
    const lcMatch = r.lifecycle === g.lc
    const prodMatch = g.product === null ? true : r.product === g.product
    return lcMatch && prodMatch
  })

  // Aggregate rows into totals
  const aggregate = (rows) => rows.reduce((acc, r) => ({
    targeted: acc.targeted + (r.targeted_customers || 0),
    control: acc.control + (r.control_customers || 0),
    responders: acc.responders + (r.targeted_responders || 0),
    ctrl_resp: acc.ctrl_resp + (r.control_responders || 0),
  }), { targeted: 0, control: 0, responders: 0, ctrl_resp: 0 })

  // Chart series — one per LC+product group
  const { seriesData } = useMemo(() => {
    const series = LC_PRODUCT_GROUPS.map(g => {
      const points = periods.map(p => {
        const rows = groupRows(g, allData.filter(r => r.range_start === p.start && r.range_end === p.end))
        const tot = aggregate(rows)
        return { period: p.key, conv: tot.targeted > 0 ? (tot.responders / tot.targeted) * 100 : 0 }
      })
      const hasData = points.some(p => p.conv > 0)
      return { ...g, points, hasData }
    })
    return { seriesData: series }
  }, [allData, periods])

  const togglePeriod = (groupKey, periodKey) => {
    const k = `${groupKey}||${periodKey}`
    setExpandedPeriods(p => ({ ...p, [k]: !p[k] }))
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
      <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
      <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>Loading reload data…</p>
    </div>
  )

  if (fetchError) return (
    <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px', margin: '20px 0' }}>
      <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>⚠️ Database Error</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--danger)' }}>{fetchError}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '10px' }}>This usually means the table doesn't exist or RLS is blocking access. Check Supabase.</div>
      <button className="btn-ghost" style={{ marginTop: '12px', fontSize: '0.78rem' }} onClick={fetchAll}>Retry</button>
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
      {/* Minimal top bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn-analysis" style={{ fontSize: '0.78rem', padding: '6px 14px' }} onClick={onUpload}>🔄 Upload CSV</button>
      </div>

      {/* Line chart */}
      <LineChart seriesData={seriesData} periods={periods} />

      {/* Lifecycle + Product tiles */}
      {!expandedGroup ? (
        <>
          <div className="section-heading">Lifecycle Performance — click to view period history</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {LC_PRODUCT_GROUPS.map(g => {
              const rows = groupRows(g, allData)
              if (rows.length === 0) return null
              const tot = aggregate(rows)
              const convRate = pct(tot.responders, tot.targeted)
              const liftVal = lift(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)

              return (
                <div key={g.key} onClick={() => setExpandedGroup(g.key)}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = g.color }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px', color: g.color }}>{g.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 8px' }}>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Targeted</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>{fmt(tot.targeted)}</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 8px' }}>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Responders</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>{fmt(tot.responders)}</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 8px' }}>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Conv %</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</div>
                    </div>
                  </div>
                  {liftVal !== null && (
                    <div style={{ marginTop: '8px', fontSize: '0.73rem', color: liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {liftVal > 0 ? '↑' : '↓'} Lift vs control: <strong>{liftVal > 0 ? '+' : ''}{liftVal.toFixed(1)}pp</strong>
                    </div>
                  )}
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--text3)' }}>{periods.length} period{periods.length !== 1 ? 's' : ''} · click to expand →</div>
                  {analysisResult[g.key] && (
                    <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#0369a1', background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '6px', padding: '8px 10px', lineHeight: 1.55 }}>
                      ⚡ {analysisResult[g.key].slice(0, 160)}{analysisResult[g.key].length > 160 ? '…' : ''}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <button className="btn-analysis" style={{ fontSize: '0.72rem', padding: '5px 12px' }}
                      onClick={e => { e.stopPropagation(); handleAnalyse(g) }}
                      disabled={analysing === g.key}>
                      {analysing === g.key ? <><span className="spinner" style={{ marginRight: '6px', width: '12px', height: '12px', borderWidth: '2px' }} />Analysing…</> : '⚡ Run Analysis'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* EXPANDED GROUP — Period history + value segment drill-down */
        (() => {
          const g = LC_PRODUCT_GROUPS.find(x => x.key === expandedGroup)
          const groupAllRows = groupRows(g, allData)
          const groupTot = aggregate(groupAllRows)
          const groupConv = pct(groupTot.responders, groupTot.targeted)

          return (
            <>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => { setExpandedGroup(null); setExpandedPeriods({}) }}>← Back</button>
                <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '10px 16px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: g.color }}>{g.label}</div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text2)' }}>All time: <strong style={{ color: 'var(--text)' }}>{fmt(groupTot.targeted)}</strong> targeted</span>
                    <span style={{ color: 'var(--success)' }}><strong>{fmt(groupTot.responders)}</strong> responders</span>
                    <span style={{ color: 'var(--accent)' }}><strong>{groupConv ? groupConv + '%' : '—'}</strong> conv</span>
                  </div>
                </div>
              </div>

              {/* Period rows */}
              <div className="section-heading">Period History — click + to see value segments</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 100px 100px 90px 100px 90px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', padding: '8px 14px', gap: '8px' }}>
                  {['', 'Period', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl Conv%', 'Lift'].map(h => (
                    <div key={h} style={{ fontSize: '0.67rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>

                {periods.map(p => {
                  const periodRows = groupRows(g, allData.filter(r => r.range_start === p.start && r.range_end === p.end))
                  if (periodRows.length === 0) return null
                  const tot = aggregate(periodRows)
                  const convRate = pct(tot.responders, tot.targeted)
                  const ctrlConv = pct(tot.ctrl_resp, tot.control)
                  const liftVal = lift(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)
                  const periodKey = `${expandedGroup}||${p.key}`
                  const isOpen = expandedPeriods[periodKey]

                  // Value segments for this period (exclude reminders, sorted by value)
                  const valueRows = periodRows.filter(r => !r.is_reminder)
                    .sort((a, b) => VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment))

                  return (
                    <React.Fragment key={p.key}>
                      {/* Period row */}
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 100px 100px 90px 100px 90px', padding: '10px 14px', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isOpen ? 'rgba(26,110,245,0.03)' : 'transparent', transition: 'background 0.1s' }}
                        onMouseEnter={e => !isOpen && (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
                        onClick={() => togglePeriod(expandedGroup, p.key)}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isOpen ? g.color : 'var(--bg3)', border: `1px solid ${isOpen ? g.color : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: isOpen ? '#fff' : 'var(--text2)', fontWeight: 700, flexShrink: 0 }}>
                          {isOpen ? '−' : '+'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>{p.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmt(tot.targeted)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{fmt(tot.control)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(tot.responders)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{ctrlConv ? ctrlConv + '%' : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700, color: liftVal === null ? 'var(--text3)' : liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                        </div>
                      </div>

                      {/* Value segment expansion */}
                      {isOpen && (
                        <div style={{ background: 'rgba(26,110,245,0.02)', borderBottom: '1px solid var(--border)' }}>
                          {/* Value segment header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 140px 90px 80px 90px 80px 90px', padding: '6px 14px 6px 42px', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(26,110,245,0.04)' }}>
                            {['Value', 'Product', 'Segment', 'Reporting Tag', 'Targeted', 'Resp.', 'Conv %', 'Ctrl%', 'Lift'].map(h => (
                              <div key={h} style={{ fontSize: '0.62rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                            ))}
                          </div>
                          {valueRows.map((r, i) => {
                            const vConv = pct(r.targeted_responders, r.targeted_customers)
                            const vCtrl = pct(r.control_responders, r.control_customers)
                            const vLift = lift(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
                            return (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 140px 90px 80px 90px 80px 90px', padding: '8px 14px 8px 42px', gap: '8px', alignItems: 'center', borderBottom: i < valueRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,110,245,0.04)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div>
                                  {r.value_segment ? <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', fontWeight: 700 }}>{r.value_segment}</span> : '—'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600 }}>{r.product || '—'}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target_group}</div>
                                <div onClick={e => e.stopPropagation()}>
                                  <TagEditor targetGroup={r.target_group} value={tags[r.target_group]} onSave={handleSaveTag} />
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{fmt(r.targeted_customers)}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(r.targeted_responders)}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{vConv ? vConv + '%' : '—'}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text2)' }}>{vCtrl ? vCtrl + '%' : '—'}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: vLift === null ? 'var(--text3)' : vLift > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                  {vLift !== null ? `${vLift > 0 ? '+' : ''}${vLift.toFixed(1)}pp` : '—'}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </>
          )
        })()
      )}
    </div>
  )
}
