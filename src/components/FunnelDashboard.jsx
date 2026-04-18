import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const FUNNEL_GROUPS = [
  { key: 'RND',                       label: 'RND',                       color: '#1a6ef5' },
  { key: 'LONG RND',                  label: 'Long RND',                  color: '#60a5fa' },
  { key: 'MROYUN RND',                label: 'MrOyun RND',                color: '#93c5fd' },
  { key: 'REACTIVATED CASINO',        label: 'Reactivated Casino',        color: '#e8a020' },
  { key: 'REACTIVATED SPORT',         label: 'Reactivated Sport',         color: '#f59e0b' },
  { key: 'RISK OF CHURN CASINO',      label: 'Risk of Churn Casino',      color: '#dc2626' },
  { key: 'RISK OF CHURN SPORT',       label: 'Risk of Churn Sport',       color: '#f87171' },
  { key: 'VIP RISK OF CHURN',         label: 'VIP Risk of Churn',         color: '#7c3aed' },
  { key: 'NEW CASINO',                label: 'New Casino',                color: '#16a34a' },
  { key: 'NEW SPORT',                 label: 'New Sport',                 color: '#4ade80' },
  { key: 'NEW HYBRID',                label: 'New Hybrid',                color: '#86efac' },
  { key: 'NEW VIP',                   label: 'New VIP',                   color: '#a855f7' },
  { key: 'NEW VIP CASINO',            label: 'New VIP Casino',            color: '#c084fc' },
  { key: 'NEW VIP SPORT',             label: 'New VIP Sport',             color: '#d8b4fe' },
  { key: 'VIP NEW',                   label: 'VIP New',                   color: '#9333ea' },
  { key: 'WINBACK HEPSIBAHIS CASINO', label: 'Winback Casino',            color: '#0ea5e9' },
  { key: 'WINBACK HEPSIBAHIS SPORT',  label: 'Winback Sport',             color: '#38bdf8' },
  { key: 'MROYUN WINBACK CASINO',     label: 'MrOyun Winback Casino',     color: '#7dd3fc' },
  { key: 'MROYUN WINBACK SPORT',      label: 'MrOyun Winback Sport',      color: '#bae6fd' },
]

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
          {visible.slice(0, 8).map(s => (
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

export default function FunnelDashboard({ onUpload }) {
  const [allData, setAllData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [expandedDays, setExpandedDays] = useState({})
  const [targetFilter, setTargetFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    setFetchError(null)
    let allRows = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from('funnel_daily')
        .select('*')
        .order('data_date', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) { setFetchError(error.message); setLoading(false); return }
      if (!data || data.length === 0) break
      allRows = allRows.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }
    setAllData(allRows)
    setLoading(false)
  }

  const dates = useMemo(() => [...new Set(allData.map(r => r.data_date))].sort(), [allData])

  // Chart series — one per funnel group across all dates
  const seriesData = useMemo(() => FUNNEL_GROUPS.map(g => {
    const points = dates.map(d => {
      const rows = allData.filter(r => r.data_date === d && r.funnel_label === g.key && (dateFilter === 'all' || r.data_date === dateFilter))
      const t = agg(rows)
      return { conv: t.targeted > 0 ? (t.responders / t.targeted) * 100 : 0 }
    })
    return { ...g, points, hasData: points.some(p => p.conv > 0) }
  }), [allData, dates])

  const handleExpandGroup = (key) => { setExpandedGroup(key); setTargetFilter('all'); setExpandedDays({}) }

  const toggleDay = (groupKey, date) => {
    const k = `${groupKey}||${date}`
    setExpandedDays(p => ({ ...p, [k]: !p[k] }))
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
      <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
      <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>Loading funnel data…</p>
    </div>
  )

  if (fetchError) return (
    <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px', margin: '20px 0' }}>
      <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>⚠️ {fetchError}</div>
      <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={fetchAll}>Retry</button>
    </div>
  )

  if (allData.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon">📡</div>
      <h3>No funnel data uploaded yet</h3>
      <p style={{ marginBottom: '20px' }}>Upload your daily Optimove funnel CSV to get started.</p>
      <button className="btn-analysis" onClick={onUpload}>📡 Upload Optimove CSV</button>
    </div>
  )

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {expandedGroup && (
            <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '7px 16px' }}
              onClick={() => { setExpandedGroup(null); setExpandedDays({}); setTargetFilter('all') }}>← Back</button>
          )}
        </div>
        <button className="btn-analysis" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={onUpload}>📡 Upload CSV</button>
      </div>
      {/* Date filter — shown on main view and drill-down */}
      {dates.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filter</span>
          <button onClick={() => setDateFilter('all')} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: dateFilter === 'all' ? 'var(--accent)' : 'transparent', borderColor: dateFilter === 'all' ? 'var(--accent)' : 'var(--border)', color: dateFilter === 'all' ? '#fff' : 'var(--text2)' }}>All dates</button>
          {dates.map(d => (
            <button key={d} onClick={() => setDateFilter(d)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: dateFilter === d ? 'var(--accent)' : 'transparent', borderColor: dateFilter === d ? 'var(--accent)' : 'var(--border)', color: dateFilter === d ? '#fff' : 'var(--text2)' }}>{d.slice(5)}</button>
          ))}
        </div>
      )}

      {/* Chart — only shown in drill-down */}

      {!expandedGroup ? (
        /* FUNNEL GROUP TILES */
        <>
          <div className="section-heading">Funnel Performance — click to view daily breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {FUNNEL_GROUPS.map(g => {
              const rows = (dateFilter === 'all' ? allData : allData.filter(r => r.data_date === dateFilter)).filter(r => r.funnel_label === g.key)
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
        /* DAILY BREAKDOWN for selected group */
        (() => {
          const g = FUNNEL_GROUPS.find(x => x.key === expandedGroup)
          const groupRows = allData.filter(r => r.funnel_label === g.key)
          const allTimeTot = agg(groupRows)

          return (
            <>
              {/* Group summary header */}
              <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '11px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: g.color }}>{g.label}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text2)' }}>All time targeted: <strong style={{ color: 'var(--text)' }}>{fmt(allTimeTot.targeted)}</strong></span>
                  <span style={{ color: 'var(--success)' }}><strong>{fmt(allTimeTot.responders)}</strong> resp</span>
                  <span style={{ color: 'var(--accent)' }}><strong>{pct(allTimeTot.responders, allTimeTot.targeted) || '—'}%</strong> conv</span>
                </div>
              </div>

              {/* Target group filter buttons */}
              {(() => {
                const groupRows = allData.filter(r => r.funnel_label === g.key)
                const targets = [...new Set(groupRows.map(r => r.target_group))].sort()
                const activeDates = dates.filter(d => allData.some(r => r.data_date === d && r.funnel_label === g.key))

                // Extract suffix from target group name for display
                const suffix = (tg) => {
                  const parts = tg.split('_')
                  const dayIdx = parts.findIndex(p => p.toLowerCase().startsWith('day'))
                  if (dayIdx !== -1) return parts.slice(dayIdx).join('_')
                  return parts[parts.length - 1]
                }

                const chartPoints = activeDates.map(d => {
                  const rows = targetFilter === 'all'
                    ? allData.filter(r => r.data_date === d && r.funnel_label === g.key)
                    : allData.filter(r => r.data_date === d && r.target_group === targetFilter)
                  const t = agg(rows)
                  return { conv: t.targeted > 0 ? (t.responders / t.targeted) * 100 : 0 }
                })

                return (
                  <>
                    {targets.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Split</span>
                        <button onClick={() => setTargetFilter('all')} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: targetFilter === 'all' ? g.color : 'transparent', borderColor: targetFilter === 'all' ? g.color : 'var(--border)', color: targetFilter === 'all' ? '#fff' : 'var(--text2)' }}>All</button>
                        {targets.map(tg => (
                          <button key={tg} onClick={() => setTargetFilter(tg)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer', background: targetFilter === tg ? g.color : 'transparent', borderColor: targetFilter === tg ? g.color : 'var(--border)', color: targetFilter === tg ? '#fff' : 'var(--text2)' }}>{suffix(tg)}</button>
                        ))}
                      </div>
                    )}
                    <LineChart seriesData={[{ ...g, points: chartPoints, hasData: chartPoints.some(p => p.conv > 0) }]} dates={activeDates} />
                  </>
                )
              })()}
              <div className="section-heading">Daily breakdown — click + to see target groups for that day</div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 120px 1fr 100px 100px 100px 90px 100px 90px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', padding: '8px 14px', gap: '8px' }}>
                  {['', 'Date', 'Groups', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl Conv%', 'Lift'].map(h => (
                    <div key={h} style={{ fontSize: '0.67rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>

                {(dateFilter === 'all' ? dates : dates.filter(d => d === dateFilter)).map(date => {
                  const dayRows = groupRows.filter(r => r.data_date === date)
                  if (!dayRows.length) return null
                  const tot = agg(dayRows)
                  const convRate = pct(tot.responders, tot.targeted)
                  const ctrlConv = pct(tot.ctrl_resp, tot.control)
                  const liftVal = liftPP(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)
                  const dayKey = `${expandedGroup}||${date}`
                  const isOpen = expandedDays[dayKey]

                  return (
                    <React.Fragment key={date}>
                      {/* Day row */}
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '28px 120px 1fr 100px 100px 100px 90px 100px 90px', padding: '9px 14px', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isOpen ? 'rgba(26,110,245,0.03)' : 'transparent', transition: 'background 0.1s' }}
                        onMouseEnter={e => !isOpen && (e.currentTarget.style.background = 'var(--bg3)')}
                        onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'transparent')}
                        onClick={() => toggleDay(expandedGroup, date)}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isOpen ? g.color : 'var(--bg3)', border: `1px solid ${isOpen ? g.color : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: isOpen ? '#fff' : 'var(--text2)', fontWeight: 700, flexShrink: 0 }}>
                          {isOpen ? '−' : '+'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{date}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{dayRows.length} target group{dayRows.length !== 1 ? 's' : ''}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmt(tot.targeted)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{fmt(tot.control)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(tot.responders)}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{ctrlConv ? ctrlConv + '%' : '—'}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 700, color: liftVal === null ? 'var(--text3)' : liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                        </div>
                      </div>

                      {/* Target group expansion */}
                      {isOpen && (
                        <div style={{ background: 'rgba(26,110,245,0.02)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 80px 80px 80px 80px', padding: '6px 14px 6px 42px', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(26,110,245,0.04)' }}>
                            {['', 'Target Group', 'Targeted', 'Control', 'Resp.', 'Conv %', 'Lift'].map(h => (
                              <div key={h} style={{ fontSize: '0.62rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                            ))}
                          </div>
                          {[...dayRows].sort((a, b) => (b.targeted_responders || 0) - (a.targeted_responders || 0)).map((r, i) => {
                            const vConv = pct(r.targeted_responders, r.targeted_customers)
                            const vLift = liftPP(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
                            return (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 80px 80px 80px 80px', padding: '7px 14px 7px 42px', gap: '8px', alignItems: 'center', borderBottom: i < dayRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,110,245,0.04)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{i + 1}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target_group}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{fmt(r.targeted_customers)}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text2)' }}>{fmt(r.control_customers)}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(r.targeted_responders)}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{vConv ? vConv + '%' : '—'}</div>
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
