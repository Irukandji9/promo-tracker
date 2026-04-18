import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const LC_PRODUCT_GROUPS = [
  { key: 'Active|Casino',              label: 'Active Casino',              lc: 'Active',              product: 'Casino',  color: '#1a6ef5' },
  { key: 'Active|Sport',               label: 'Active Sport',               lc: 'Active',              product: 'Sport',   color: '#16a34a' },
  { key: 'Churned Short Lapse|Casino', label: 'Churned Short Lapse Casino', lc: 'Churned Short Lapse', product: 'Casino',  color: '#e8a020' },
  { key: 'Churned Short Lapse|Sport',  label: 'Churned Short Lapse Sport',  lc: 'Churned Short Lapse', product: 'Sport',   color: '#f59e0b' },
  { key: 'Churned Long Lapse|Casino',  label: 'Churned Long Lapse Casino',  lc: 'Churned Long Lapse',  product: 'Casino',  color: '#dc2626' },
  { key: 'Churned Long Lapse|Sport',   label: 'Churned Long Lapse Sport',   lc: 'Churned Long Lapse',  product: 'Sport',   color: '#f87171' },
  { key: 'OTD|Casino',                 label: 'OTD Casino',                 lc: 'OTD',                 product: 'Casino',  color: '#7c3aed' },
  { key: 'OTD|Sport',                  label: 'OTD Sport',                  lc: 'OTD',                 product: 'Sport',   color: '#a78bfa' },
  { key: 'Dormant|Sport',              label: 'Dormant',                    lc: 'Dormant',             product: null,      color: '#64748b' },
  { key: 'Active Bad Exp|Hybrid',       label: 'Active Bad Experience',      lc: 'Active Bad Exp',      product: 'Hybrid',  color: '#0891b2' },
  { key: 'UDC Casino|Casino',           label: 'UDC Casino',                 lc: 'UDC Casino',          product: 'Casino',  color: '#be185d' },
  { key: 'UDC Sport|Sport',             label: 'UDC Sport',                  lc: 'UDC Sport',           product: 'Sport',   color: '#9d174d' },
]

const VALUE_ORDER = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'EV', '']

function fmt(v) { return v ? Number(v).toLocaleString('tr-TR') : '0' }
function pct(a, b) { return (a > 0 && b > 0) ? ((a / b) * 100).toFixed(1) : null }
function liftPP(tR, tT, cR, cT) {
  if (!tT || !cT) return null
  return ((tR / tT) - (cR / cT)) * 100
}

function agg(rows) {
  return rows.reduce((acc, r) => ({
    targeted: acc.targeted + (r.targeted_customers || 0),
    control: acc.control + (r.control_customers || 0),
    responders: acc.responders + (r.targeted_responders || 0),
    ctrl_resp: acc.ctrl_resp + (r.control_responders || 0),
  }), { targeted: 0, control: 0, responders: 0, ctrl_resp: 0 })
}

function groupRows(g, data) {
  return data.filter(r => r.lifecycle === g.lc && (g.product === null || r.product === g.product))
}

function LineChart({ seriesData, dates }) {
  if (!dates || dates.length < 2) return (
    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.3 }}>📈</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', fontWeight: 500 }}>Trend chart available after 2+ daily uploads</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '4px' }}>Currently 1 date: {dates?.[0]}</div>
      </div>
    </div>
  )

  const W = 900, H = 140
  const PAD = { l: 40, r: 16, t: 10, b: 28 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b
  const xStep = chartW / Math.max(dates.length - 1, 1)
  const visible = seriesData.filter(s => s.points.some(p => p.conv > 0))
  const allVals = visible.flatMap(s => s.points.map(p => p.conv))
  const maxVal = Math.max(...allVals, 1)
  const yScale = v => chartH - (v / maxVal) * chartH * 0.9 + PAD.t

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem' }}>Conversion Rate by Date (%)</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {visible.slice(0, 9).map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '14px', height: '2px', background: s.color, borderRadius: '1px' }} />
              <span style={{ fontSize: '0.63rem', color: 'var(--text2)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H + PAD.b}`} style={{ width: '100%', minWidth: '400px', display: 'block' }}>
          {[0, 50, 100].map(v => {
            const y = yScale((v / 100) * maxVal)
            return y >= PAD.t && y <= chartH + PAD.t ? (
              <g key={v}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={PAD.l - 3} y={y + 3} textAnchor="end" fontSize="8" fill="var(--text3)">{((v / 100) * maxVal).toFixed(0)}%</text>
              </g>
            ) : null
          })}
          {visible.map(s => {
            const pts = s.points.map((p, i) => `${PAD.l + i * xStep},${yScale(p.conv)}`)
            return (
              <g key={s.key}>
                <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
                {s.points.map((p, i) => p.conv > 0 ? (
                  <circle key={i} cx={PAD.l + i * xStep} cy={yScale(p.conv)} r="3" fill={s.color} stroke="var(--bg2)" strokeWidth="1.5">
                    <title>{s.label}: {p.conv.toFixed(1)}% on {dates[i]}</title>
                  </circle>
                ) : null)}
              </g>
            )
          })}
          {dates.map((d, i) => (
            <text key={d} x={PAD.l + i * xStep} y={H + PAD.t + 12} textAnchor="middle" fontSize="7.5" fill="var(--text3)">{d.slice(5)}</text>
          ))}
        </svg>
      </div>
    </div>
  )
}

function TagEditor({ targetGroup, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const save = async () => { await onSave(targetGroup, val.toUpperCase()); setEditing(false) }
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
      {val ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--accent)', background: 'rgba(26,110,245,0.07)', padding: '1px 6px', borderRadius: '4px' }}>{val}</span>
           : <span style={{ fontSize: '0.68rem', color: 'var(--text3)', fontStyle: 'italic' }}>+ tag</span>}
      <span style={{ fontSize: '0.58rem', color: 'var(--text3)', opacity: 0.6 }}>✏</span>
    </div>
  )
}

export default function ReloadDashboard({ onUpload }) {
  const [allData, setAllData] = useState([])
  const [tags, setTags] = useState({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [expandedDays, setExpandedDays] = useState({})
  const [dateFilter, setDateFilter] = useState('all')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [analysing, setAnalysing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    setFetchError(null)
    let allRows = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase.from('reload_daily').select('*').order('data_date', { ascending: true }).range(from, from + PAGE - 1)
      if (error) { setFetchError(error.message); setLoading(false); return }
      if (!data || data.length === 0) break
      allRows = allRows.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }
    const { data: td } = await supabase.from('reload_reporting_tags').select('*')
    setAllData(allRows)
    if (td) { const t = {}; td.forEach(r => { t[r.target_group] = r.reporting_tag }); setTags(t) }
    setLoading(false)
  }

  const handleSaveTag = async (tg, tag) => {
    await supabase.from('reload_reporting_tags').upsert({ target_group: tg, reporting_tag: tag }, { onConflict: 'target_group' })
    setTags(p => ({ ...p, [tg]: tag }))
  }

  const dates = useMemo(() => [...new Set(allData.map(r => r.data_date))].sort(), [allData])

  const filtered = useMemo(() => dateFilter === 'all' ? allData : allData.filter(r => r.data_date === dateFilter), [allData, dateFilter])

  const seriesData = useMemo(() => LC_PRODUCT_GROUPS.map(g => {
    const points = dates.map(d => {
      const rows = groupRows(g, allData.filter(r => r.data_date === d))
      const tot = agg(rows)
      return { conv: tot.targeted > 0 ? (tot.responders / tot.targeted) * 100 : 0 }
    })
    return { ...g, points, hasData: points.some(p => p.conv > 0) }
  }), [allData, dates])

  const handleExpandGroup = (key) => { setExpandedGroup(key); setSegmentFilter('all'); setExpandedDays({}); setAnalysisResult(null) }

  const handleGroupAnalysis = async (g) => {
    const rows = groupRows(g, allData)
    if (!rows.length) return
    setAnalysing(true)
    setAnalysisResult(null)
    const agg2 = r => ({ t: r.targeted_customers||0, resp: r.targeted_responders||0, ctrl: r.control_customers||0, cr: r.control_responders||0 })
    const dates2 = [...new Set(rows.map(r => r.data_date))].sort()
    const valueSegs = [...new Set(rows.map(r => r.value_segment).filter(Boolean))]
    const VALUE_ORDER2 = ['HV','MV','LHV','LLV','NV','EV']
    const segDetail = VALUE_ORDER2.filter(v => valueSegs.includes(v)).map(v => {
      const vRows = rows.filter(r => r.value_segment === v)
      const tot = vRows.reduce((a,r) => ({ t: a.t+(r.targeted_customers||0), resp: a.resp+(r.targeted_responders||0), ctrl: a.ctrl+(r.control_customers||0), cr: a.cr+(r.control_responders||0) }), {t:0,resp:0,ctrl:0,cr:0})
      const conv = tot.t > 0 ? ((tot.resp/tot.t)*100).toFixed(1) : '—'
      const lift = tot.t > 0 && tot.ctrl > 0 ? (((tot.resp/tot.t)-(tot.cr/tot.ctrl))*100).toFixed(1) : null
      return `  ${v}: ${tot.t} targeted → ${tot.resp} resp (${conv}% conv${lift ? `, lift: ${Number(lift)>=0?'+':''}${lift}pp` : ''})`
    }).join('\n')
    const dateDetail = dates2.map(d => {
      const dRows = rows.filter(r => r.data_date === d)
      const tot = dRows.reduce((a,r) => ({ t: a.t+(r.targeted_customers||0), resp: a.resp+(r.targeted_responders||0) }), {t:0,resp:0})
      const conv = tot.t > 0 ? ((tot.resp/tot.t)*100).toFixed(1) : '—'
      return `  ${d}: ${tot.t} targeted → ${tot.resp} resp (${conv}% conv)`
    }).join('\n')
    const prompt = `You are a senior CRM Analyst at Hepsibahis, an online sports betting and casino in the Turkish market.

Analyse this specific reload segment and provide a focused commercial assessment.

SEGMENT: ${g.label}
Period: ${dates2[0]} to ${dates2[dates2.length-1]} (${dates2.length} days)

Value segment breakdown (all-time):
${segDetail}

Daily performance:
${dateDetail}

Write a concise analysis (max 250 words, no headers, flowing text):
1. Overall verdict for this segment — is it performing well?
2. Which value segments are strongest vs weakest — be specific
3. Any notable daily trends (improving, declining, inconsistent?)
4. One or two specific actionable recommendations
Be direct and commercially focused.`

    try {
      const res = await fetch('/api/reload-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysisResult(data.result)
    } catch(e) { setAnalysisResult('Error: ' + e.message) }
    setAnalysing(false)
  }

  const toggleDay = (groupKey, date) => {
    const k = `${groupKey}||${date}`
    setExpandedDays(p => ({ ...p, [k]: !p[k] }))
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
      <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
      <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>Loading reload data…</p>
    </div>
  )

  if (fetchError) return (
    <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>⚠️ {fetchError}</div>
      <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={fetchAll}>Retry</button>
    </div>
  )

  if (allData.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon">📂</div>
      <h3>No reload data uploaded yet</h3>
      <p style={{ marginBottom: '20px' }}>Upload your daily Optimove reload CSV to get started.</p>
      <button className="btn-analysis" onClick={onUpload}>🔄 Upload Reload CSV</button>
    </div>
  )

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {expandedGroup && (
            <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '7px 16px' }}
              onClick={() => { setExpandedGroup(null); setExpandedDays({}); setSegmentFilter('all') }}>← Back</button>
          )}
        </div>
        <button className="btn-analysis" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={onUpload}>🔄 Upload CSV</button>
      </div>

      {/* Date filter */}
      {dates.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
          <button onClick={() => setDateFilter('all')} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: dateFilter === 'all' ? 'var(--accent)' : 'transparent', borderColor: dateFilter === 'all' ? 'var(--accent)' : 'var(--border)', color: dateFilter === 'all' ? '#fff' : 'var(--text2)' }}>All time</button>
          {dates.map(d => (
            <button key={d} onClick={() => setDateFilter(d)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: dateFilter === d ? 'var(--accent)' : 'transparent', borderColor: dateFilter === d ? 'var(--accent)' : 'var(--border)', color: dateFilter === d ? '#fff' : 'var(--text2)' }}>{d.slice(5)}</button>
          ))}
        </div>
      )}

      {/* Chart — only shown in drill-down */}

      {!expandedGroup ? (
        <>
          <div className="section-heading">Lifecycle Performance — click to view daily breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {LC_PRODUCT_GROUPS.map(g => {
              const rows = groupRows(g, filtered)
              if (!rows.length) return null
              const tot = agg(rows)
              const convRate = pct(tot.responders, tot.targeted)
              const liftVal = liftPP(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)
              return (
                <div key={g.key} onClick={() => handleExpandGroup(g.key)}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '13px 15px', cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = g.color }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px', color: g.color }}>{g.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                    {[['Targeted', fmt(tot.targeted), 'var(--text)'], ['Responders', fmt(tot.responders), 'var(--success)'], ['Conv %', convRate ? convRate + '%' : '—', 'var(--accent)']].map(([l, v, c]) => (
                      <div key={l} style={{ background: 'var(--bg3)', borderRadius: '5px', padding: '6px 7px' }}>
                        <div style={{ fontSize: '0.56rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{l}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {liftVal !== null && (
                    <div style={{ marginTop: '7px', fontSize: '0.72rem', color: liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {liftVal > 0 ? '↑' : '↓'} Lift vs control: <strong>{liftVal > 0 ? '+' : ''}{liftVal.toFixed(1)}pp</strong>
                    </div>
                  )}
                  <div style={{ marginTop: '5px', fontSize: '0.67rem', color: 'var(--text3)' }}>{dates.length} day{dates.length !== 1 ? 's' : ''} · click to expand →</div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        (() => {
          const g = LC_PRODUCT_GROUPS.find(x => x.key === expandedGroup)
          const groupAllRows = groupRows(g, allData)
          const allTimeTot = agg(groupAllRows)

          return (
            <>
              <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '11px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: g.color }}>{g.label}</div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text2)' }}>All time: <strong style={{ color: 'var(--text)' }}>{fmt(allTimeTot.targeted)}</strong> targeted</span>
                    <span style={{ color: 'var(--success)' }}><strong>{fmt(allTimeTot.responders)}</strong> resp</span>
                    <span style={{ color: 'var(--accent)' }}><strong>{pct(allTimeTot.responders, allTimeTot.targeted) || '—'}%</strong> conv</span>
                  </div>
                  <button className="btn-analysis" style={{ fontSize: '0.75rem', padding: '5px 12px' }} onClick={() => handleGroupAnalysis(g)} disabled={analysing}>
                    {analysing ? <><span className="spinner" style={{ marginRight: '6px', width: '12px', height: '12px', borderWidth: '2px' }} />Analysing…</> : '🧠 Analyse'}
                  </button>
                </div>
              </div>

              {/* Value segment filter buttons */}
              {(() => {
                const groupAllData = groupRows(g, allData)
                const valueSegs = [...new Set(groupAllData.map(r => r.value_segment).filter(Boolean))].sort((a, b) => VALUE_ORDER.indexOf(a) - VALUE_ORDER.indexOf(b))
                const activeDates = dates.filter(d => groupRows(g, allData.filter(r => r.data_date === d)).length > 0)

                // Build chart series based on segment filter
                const chartPoints = activeDates.map(d => {
                  const rows = segmentFilter === 'all'
                    ? groupRows(g, allData.filter(r => r.data_date === d))
                    : groupRows(g, allData.filter(r => r.data_date === d)).filter(r => r.value_segment === segmentFilter)
                  const t = agg(rows)
                  return { conv: t.targeted > 0 ? (t.responders / t.targeted) * 100 : 0 }
                })

                return (
                  <>
                    {valueSegs.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Segment</span>
                        <button onClick={() => setSegmentFilter('all')} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: segmentFilter === 'all' ? g.color : 'transparent', borderColor: segmentFilter === 'all' ? g.color : 'var(--border)', color: segmentFilter === 'all' ? '#fff' : 'var(--text2)' }}>All</button>
                        {valueSegs.map(v => (
                          <button key={v} onClick={() => setSegmentFilter(v)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: segmentFilter === v ? g.color : 'transparent', borderColor: segmentFilter === v ? g.color : 'var(--border)', color: segmentFilter === v ? '#fff' : 'var(--text2)' }}>{v}</button>
                        ))}
                      </div>
                    )}
                    <LineChart seriesData={[{ ...g, points: chartPoints, hasData: chartPoints.some(p => p.conv > 0) }]} dates={activeDates} />
                  </>
                )
              })()}
              {analysisResult && (
                <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', fontSize: '0.84rem', lineHeight: 1.65, color: 'var(--text)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>⚡ AI Analysis — {g.label}</div>
                  {analysisResult}
                </div>
              )}
              {analysisResult && (
                <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', fontSize: '0.84rem', lineHeight: 1.65, color: 'var(--text)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>⚡ AI Analysis — {g.label}</div>
                  {analysisResult}
                </div>
              )}
              <div className="section-heading">Daily breakdown — click + to see value segments</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 120px 1fr 100px 100px 100px 90px 100px 90px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', padding: '8px 14px', gap: '8px' }}>
                  {['', 'Date', 'Segments', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl Conv%', 'Lift'].map(h => (
                    <div key={h} style={{ fontSize: '0.67rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>

                {(dateFilter === 'all' ? dates : [dateFilter]).map(date => {
                  const dayRows = groupRows(g, allData.filter(r => r.data_date === date))
                  if (!dayRows.length) return null
                  const tot = agg(dayRows)
                  const convRate = pct(tot.responders, tot.targeted)
                  const ctrlConv = pct(tot.ctrl_resp, tot.control)
                  const liftVal = liftPP(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)
                  const dayKey = `${expandedGroup}||${date}`
                  const isOpen = expandedDays[dayKey]
                  const valueRows = [...dayRows].sort((a, b) => { const vs = VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment); if (vs !== 0) return vs; return (a.is_reminder ? 1 : 0) - (b.is_reminder ? 1 : 0) })

                  return (
                    <React.Fragment key={date}>
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '28px 120px 1fr 100px 100px 100px 90px 100px 90px', padding: '9px 14px', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isOpen ? 'rgba(26,110,245,0.03)' : 'transparent' }}
                        onMouseEnter={e => !isOpen && (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
                        onClick={() => toggleDay(expandedGroup, date)}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isOpen ? g.color : 'var(--bg3)', border: `1px solid ${isOpen ? g.color : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: isOpen ? '#fff' : 'var(--text2)', fontWeight: 700, flexShrink: 0 }}>
                          {isOpen ? '−' : '+'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{date}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{valueRows.length} segment{valueRows.length !== 1 ? 's' : ''}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmt(tot.targeted)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{fmt(tot.control)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(tot.responders)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{ctrlConv ? ctrlConv + '%' : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700, color: liftVal === null ? 'var(--text3)' : liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ background: 'rgba(26,110,245,0.02)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 140px 90px 80px 90px 80px 90px', padding: '6px 14px 6px 42px', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(26,110,245,0.04)' }}>
                            {['Value', 'Product', 'Segment', 'Reporting Tag', 'Targeted', 'Resp.', 'Conv %', 'Ctrl%', 'Lift'].map(h => (
                              <div key={h} style={{ fontSize: '0.62rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                            ))}
                          </div>
                          {valueRows.map((r, i) => {
                            const vConv = pct(r.targeted_responders, r.targeted_customers)
                            const vCtrl = pct(r.control_responders, r.control_customers)
                            const vLift = liftPP(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
                            return (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 140px 90px 80px 90px 80px 90px', padding: '8px 14px 8px 42px', gap: '8px', alignItems: 'center', borderBottom: i < valueRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,110,245,0.04)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div>{r.value_segment ? <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', fontWeight: 700 }}>{r.value_segment}</span> : '—'}</div>
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
