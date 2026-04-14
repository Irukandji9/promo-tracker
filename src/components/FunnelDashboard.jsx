import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

// Funnel lifecycle groups based on the funnel_mapping labels
const FUNNEL_GROUPS = [
  { key: 'RND',                      label: 'RND',                      color: '#1a6ef5' },
  { key: 'LONG RND',                 label: 'Long RND',                 color: '#60a5fa' },
  { key: 'MROYUN RND',               label: 'MrOyun RND',               color: '#93c5fd' },
  { key: 'REACTIVATED CASINO',       label: 'Reactivated Casino',       color: '#e8a020' },
  { key: 'REACTIVATED SPORT',        label: 'Reactivated Sport',        color: '#f59e0b' },
  { key: 'RISK OF CHURN CASINO',     label: 'Risk of Churn Casino',     color: '#dc2626' },
  { key: 'RISK OF CHURN SPORT',      label: 'Risk of Churn Sport',      color: '#f87171' },
  { key: 'VIP RISK OF CHURN',        label: 'VIP Risk of Churn',        color: '#7c3aed' },
  { key: 'NEW CASINO',               label: 'New Casino',               color: '#16a34a' },
  { key: 'NEW SPORT',                label: 'New Sport',                color: '#4ade80' },
  { key: 'NEW HYBRID',               label: 'New Hybrid',               color: '#86efac' },
  { key: 'NEW VIP',                  label: 'New VIP',                  color: '#a855f7' },
  { key: 'NEW VIP CASINO',           label: 'New VIP Casino',           color: '#c084fc' },
  { key: 'NEW VIP SPORT',            label: 'New VIP Sport',            color: '#d8b4fe' },
  { key: 'VIP NEW',                  label: 'VIP New',                  color: '#9333ea' },
  { key: 'WINBACK HEPSIBAHIS CASINO',label: 'Winback Casino',           color: '#0ea5e9' },
  { key: 'WINBACK HEPSIBAHIS SPORT', label: 'Winback Sport',            color: '#38bdf8' },
  { key: 'MROYUN WINBACK CASINO',    label: 'MrOyun Winback Casino',    color: '#7dd3fc' },
  { key: 'MROYUN WINBACK SPORT',     label: 'MrOyun Winback Sport',     color: '#bae6fd' },
]

function fmt(v) { return v ? Number(v).toLocaleString('tr-TR') : '0' }
function pct(a, b) { return (a > 0 && b > 0) ? ((a / b) * 100).toFixed(1) : null }
function liftPP(tR, tT, cR, cT) {
  if (!tT || !cT) return null
  return ((tR / tT) - (cR / cT)) * 100
}

function aggregate(rows) {
  return rows.reduce((acc, r) => ({
    targeted: acc.targeted + (r.targeted_customers || 0),
    control: acc.control + (r.control_customers || 0),
    responders: acc.responders + (r.targeted_responders || 0),
    ctrl_resp: acc.ctrl_resp + (r.control_responders || 0),
  }), { targeted: 0, control: 0, responders: 0, ctrl_resp: 0 })
}

// SVG Line Chart
function LineChart({ seriesData, dates }) {
  if (!dates || dates.length < 2) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.3 }}>📈</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text2)', fontWeight: 500 }}>Trend chart available after 2+ daily uploads</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '4px' }}>Currently 1 date: {dates?.[0]}</div>
        </div>
      </div>
    )
  }

  const W = 900, H = 160
  const PAD = { l: 44, r: 20, t: 12, b: 32 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b
  const xStep = chartW / (dates.length - 1)

  const allVals = seriesData.flatMap(s => s.points.map(p => p.conv)).filter(v => v >= 0)
  const maxVal = Math.max(...allVals, 1)
  const yScale = v => chartH - (v / maxVal) * chartH * 0.9 + PAD.t

  const visibleSeries = seriesData.filter(s => s.points.some(p => p.conv > 0))

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem' }}>Conversion Rate by Date (%)</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {visibleSeries.slice(0, 8).map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '16px', height: '3px', background: s.color, borderRadius: '2px' }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text2)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H + PAD.b}`} style={{ width: '100%', minWidth: '400px', display: 'block' }}>
          {[0, 25, 50, 75, 100].map(v => {
            const y = yScale((v / 100) * maxVal)
            return y >= PAD.t && y <= chartH + PAD.t ? (
              <g key={v}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={PAD.l - 4} y={y + 3.5} textAnchor="end" fontSize="8.5" fill="var(--text3)">{((v / 100) * maxVal).toFixed(0)}%</text>
              </g>
            ) : null
          })}
          {visibleSeries.map(s => {
            const pts = s.points.map((p, i) => `${PAD.l + i * xStep},${yScale(p.conv)}`)
            return (
              <g key={s.key}>
                <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
                {s.points.map((p, i) => p.conv > 0 ? (
                  <circle key={i} cx={PAD.l + i * xStep} cy={yScale(p.conv)} r="3.5" fill={s.color} stroke="var(--bg2)" strokeWidth="2">
                    <title>{s.label}: {p.conv.toFixed(1)}% on {dates[i]}</title>
                  </circle>
                ) : null)}
              </g>
            )
          })}
          {dates.map((d, i) => (
            <text key={d} x={PAD.l + i * xStep} y={H + PAD.t + 14} textAnchor="middle" fontSize="8" fill="var(--text3)">{d.slice(5)}</text>
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
  const [selectedDate, setSelectedDate] = useState('all')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('funnel_daily')
      .select('*')
      .order('data_date', { ascending: true })
    if (error) { setFetchError(error.message); setLoading(false); return }
    setAllData(data || [])
    setLoading(false)
  }

  // Unique dates sorted
  const dates = useMemo(() => [...new Set(allData.map(r => r.data_date))].sort(), [allData])

  // Filter by date
  const filtered = useMemo(() => {
    if (selectedDate === 'all') return allData
    return allData.filter(r => r.data_date === selectedDate)
  }, [allData, selectedDate])

  // Get rows for a group
  const groupRows = (g) => filtered.filter(r => r.funnel_label === g.key)

  // Chart series
  const seriesData = useMemo(() => FUNNEL_GROUPS.map(g => {
    const points = dates.map(d => {
      const rows = allData.filter(r => r.data_date === d && r.funnel_label === g.key)
      const tot = aggregate(rows)
      return { conv: tot.targeted > 0 ? (tot.responders / tot.targeted) * 100 : 0 }
    })
    return { ...g, points, hasData: points.some(p => p.conv > 0) }
  }), [allData, dates])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
      <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
      <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>Loading funnel data…</p>
    </div>
  )

  if (fetchError) return (
    <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px', margin: '20px 0' }}>
      <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>⚠️ Database Error</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--danger)' }}>{fetchError}</div>
      <button className="btn-ghost" style={{ marginTop: '12px', fontSize: '0.78rem' }} onClick={fetchAll}>Retry</button>
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
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
          <button onClick={() => setSelectedDate('all')} style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer',
            background: selectedDate === 'all' ? 'var(--accent)' : 'transparent',
            borderColor: selectedDate === 'all' ? 'var(--accent)' : 'var(--border)',
            color: selectedDate === 'all' ? '#fff' : 'var(--text2)',
          }}>All time</button>
          {dates.slice(-10).map(d => (
            <button key={d} onClick={() => setSelectedDate(d)} style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 500, border: '1px solid', cursor: 'pointer',
              background: selectedDate === d ? 'var(--accent)' : 'transparent',
              borderColor: selectedDate === d ? 'var(--accent)' : 'var(--border)',
              color: selectedDate === d ? '#fff' : 'var(--text2)',
            }}>{d.slice(5)}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {expandedGroup && <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={() => setExpandedGroup(null)}>← Back</button>}
          <button className="btn-analysis" style={{ fontSize: '0.78rem', padding: '5px 12px' }} onClick={onUpload}>📡 Upload CSV</button>
        </div>
      </div>

      {/* Line chart */}
      <LineChart seriesData={seriesData.filter(s => s.hasData)} dates={dates} />

      {!expandedGroup ? (
        <>
          <div className="section-heading">Funnel Performance — click to view detail</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {FUNNEL_GROUPS.map(g => {
              const rows = groupRows(g)
              if (!rows.length) return null
              const tot = aggregate(rows)
              const convRate = pct(tot.responders, tot.targeted)
              const liftVal = liftPP(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)

              return (
                <div key={g.key} onClick={() => setExpandedGroup(g.key)}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = g.color }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px', color: g.color }}>{g.label}</div>
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
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--text3)' }}>{rows.length} target group{rows.length !== 1 ? 's' : ''} · click to expand →</div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* DRILL DOWN — target groups for selected funnel */
        (() => {
          const g = FUNNEL_GROUPS.find(x => x.key === expandedGroup)
          const rows = groupRows(g)
          const tot = aggregate(rows)

          return (
            <>
              <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: g.color }}>{g.label}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text2)' }}>Targeted: <strong style={{ color: 'var(--text)' }}>{fmt(tot.targeted)}</strong></span>
                  <span style={{ color: 'var(--success)' }}><strong>{fmt(tot.responders)}</strong> responders</span>
                  <span style={{ color: 'var(--accent)' }}><strong>{pct(tot.responders, tot.targeted) || '—'}%</strong> conv</span>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 90px 90px 90px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', padding: '8px 14px', gap: '8px' }}>
                  {['Target Group', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl %', 'Lift'].map(h => (
                    <div key={h} style={{ fontSize: '0.67rem', color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>
                {rows.sort((a, b) => (b.targeted_responders || 0) - (a.targeted_responders || 0)).map((r, i) => {
                  const convRate = pct(r.targeted_responders, r.targeted_customers)
                  const ctrlConv = pct(r.control_responders, r.control_customers)
                  const liftVal = liftPP(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 90px 90px 90px', padding: '9px 14px', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target_group}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmt(r.targeted_customers)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{fmt(r.control_customers)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(r.targeted_responders)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{convRate ? convRate + '%' : '—'}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text2)' }}>{ctrlConv ? ctrlConv + '%' : '—'}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: liftVal === null ? 'var(--text3)' : liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                      </div>
                    </div>
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
