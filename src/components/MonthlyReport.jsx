import React, { useState } from 'react'

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `₺${Number(v).toLocaleString('tr-TR')}`
}
function fmtN(v) {
  if (!v) return '—'
  return Number(v).toLocaleString('tr-TR')
}
function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${Number(v).toFixed(1)}%`
}

export default function MonthlyReport({ promos, month, monthEvents, onClose, onGenerateNarrative }) {
  const [narrative, setNarrative] = useState('')
  const [generating, setGenerating] = useState(false)

  const completed = promos.filter(p => p.status === 'completed' || p.status === 'analysed')
  const withKpis = completed.filter(p => p.bonus_cost)

  const totals = withKpis.reduce((acc, p) => ({
    targeted_count: acc.targeted_count + (Number(p.targeted_count) || 0),
    depositors: acc.depositors + (Number(p.depositors) || 0),
    deposit_volume: acc.deposit_volume + (Number(p.deposit_volume) || 0),
    total_stakes: acc.total_stakes + (Number(p.total_stakes) || 0),
    bonus_cost: acc.bonus_cost + (Number(p.bonus_cost) || 0),
    ggr: acc.ggr + (Number(p.ggr) || 0),
    ngr: acc.ngr + (Number(p.ngr) || 0),
  }), { targeted_count: 0, depositors: 0, deposit_volume: 0, total_stakes: 0, bonus_cost: 0, ggr: 0, ngr: 0 })

  const overallRoi = totals.bonus_cost ? (((totals.ngr - totals.bonus_cost) / totals.bonus_cost) * 100).toFixed(1) : null
  const conversionRate = totals.targeted_count ? ((totals.depositors / totals.targeted_count) * 100).toFixed(1) : null
  const cpd = totals.depositors ? (totals.bonus_cost / totals.depositors).toFixed(0) : null
  const overallBonusGgr = totals.ggr ? ((totals.bonus_cost / totals.ggr) * 100).toFixed(1) : null

  const ranked = [...withKpis].sort((a, b) => (Number(b.ngr) || 0) - (Number(a.ngr) || 0))
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]

  // Threshold breaches
  const breaches = withKpis.filter(p => p.bonus_cost && p.ggr && (Number(p.bonus_cost) / Number(p.ggr)) > 0.20)

  // By objective
  const byObj = {}
  withKpis.forEach(p => {
    const k = p.campaign_objective || 'Unset'
    if (!byObj[k]) byObj[k] = { count: 0, bonus_cost: 0, ngr: 0, ggr: 0 }
    byObj[k].count++
    byObj[k].bonus_cost += Number(p.bonus_cost) || 0
    byObj[k].ngr += Number(p.ngr) || 0
    byObj[k].ggr += Number(p.ggr) || 0
  })

  const handleGenerate = async () => {
    setGenerating(true)
    const result = await onGenerateNarrative({ promos: withKpis, totals, month, overallRoi, overallBonusGgr, monthEvents, breaches })
    setNarrative(result)
    setGenerating(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '920px' }}>
        <div className="modal-header">
          <div>
            <h2>📋 Monthly Promotional Report</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>
              {month} · {promos.length} promotions · {completed.length} completed · {withKpis.length} with KPI data
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Month events context */}
          {monthEvents && (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.82rem', color: 'var(--text2)' }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '4px' }}>🗓️ Month Events & Context</strong>
              {monthEvents}
            </div>
          )}

          <div className="section-heading">Month Summary</div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            <div className="stat-card"><div className="stat-label">Total Promos</div><div className="stat-value">{promos.length}</div></div>
            <div className="stat-card"><div className="stat-label">Total Targeted</div><div className="stat-value">{fmtN(totals.targeted_count)}</div></div>
            <div className="stat-card"><div className="stat-label">Depositors</div><div className="stat-value">{fmtN(totals.depositors)}</div></div>
            <div className="stat-card"><div className="stat-label">Conversion</div><div className="stat-value">{fmtPct(conversionRate)}</div></div>
            <div className="stat-card"><div className="stat-label">Deposit Vol.</div><div className="stat-value">{fmt(totals.deposit_volume)}</div></div>
            <div className="stat-card"><div className="stat-label">Bonus Cost</div><div className="stat-value negative">{fmt(totals.bonus_cost)}</div></div>
            <div className="stat-card"><div className="stat-label">GGR</div><div className="stat-value">{fmt(totals.ggr)}</div></div>
            <div className="stat-card"><div className="stat-label">NGR</div><div className={`stat-value ${totals.ngr >= 0 ? 'positive' : 'negative'}`}>{fmt(totals.ngr)}</div></div>
            <div className="stat-card"><div className="stat-label">ROI</div><div className={`stat-value ${Number(overallRoi) >= 0 ? 'positive' : 'negative'}`}>{fmtPct(overallRoi)}</div></div>
            <div className="stat-card">
              <div className="stat-label">Bonus / GGR</div>
              <div className={`stat-value ${Number(overallBonusGgr) <= 20 ? 'positive' : Number(overallBonusGgr) <= 28 ? '' : 'negative'}`}>
                {overallBonusGgr ? `${overallBonusGgr}%` : '—'}
              </div>
            </div>
            <div className="stat-card"><div className="stat-label">Cost / Dep.</div><div className="stat-value">{cpd ? `₺${Number(cpd).toLocaleString('tr-TR')}` : '—'}</div></div>
          </div>

          {/* Threshold breaches */}
          {breaches.length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-heading" style={{ color: 'var(--danger)' }}>🔴 Threshold Breaches (&gt;20% Bonus/GGR)</div>
              <table className="report-table">
                <thead><tr><th>Promotion</th><th>Bonus Cost</th><th>GGR</th><th>Ratio</th><th>Over by</th></tr></thead>
                <tbody>
                  {breaches.map(p => {
                    const ratio = ((Number(p.bonus_cost) / Number(p.ggr)) * 100).toFixed(1)
                    const over = (Number(ratio) - 20).toFixed(1)
                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{p.name}</td>
                        <td>{fmt(p.bonus_cost)}</td>
                        <td>{fmt(p.ggr)}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{ratio}%</td>
                        <td style={{ color: 'var(--danger)' }}>+{over}pp</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* Best / Worst */}
          {best && worst && best.id !== worst.id && (
            <>
              <hr className="divider" />
              <div className="section-heading">Performance Highlights</div>
              <div className="form-row">
                <div className="card" style={{ borderColor: 'rgba(22,163,74,0.2)', background: 'rgba(22,163,74,0.03)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>🏆 Best Performer (NGR)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '4px' }}>{best.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{best.type} · {best.campaign_objective || best.target_segment}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)', marginTop: '8px' }}>NGR: {fmt(best.ngr)}</div>
                </div>
                <div className="card" style={{ borderColor: 'rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.03)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>📉 Lowest Performer (NGR)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '4px' }}>{worst.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{worst.type} · {worst.campaign_objective || worst.target_segment}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginTop: '8px' }}>NGR: {fmt(worst.ngr)}</div>
                </div>
              </div>
            </>
          )}

          {/* By Objective */}
          {Object.keys(byObj).length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-heading">Breakdown by Campaign Objective</div>
              <table className="report-table">
                <thead><tr><th>Objective</th><th>Count</th><th>Bonus Cost</th><th>GGR</th><th>NGR</th><th>Bonus/GGR</th></tr></thead>
                <tbody>
                  {Object.entries(byObj).map(([obj, d]) => {
                    const ratio = d.ggr ? ((d.bonus_cost / d.ggr) * 100).toFixed(1) : null
                    return (
                      <tr key={obj}>
                        <td>{obj}</td>
                        <td>{d.count}</td>
                        <td>{fmt(d.bonus_cost)}</td>
                        <td>{fmt(d.ggr)}</td>
                        <td style={{ color: d.ngr >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(d.ngr)}</td>
                        <td style={{ color: Number(ratio) <= 20 ? 'var(--success)' : Number(ratio) <= 28 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>{ratio ? `${ratio}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* All promos */}
          <hr className="divider" />
          <div className="section-heading">All Promotions</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Objective</th><th>Lifecycle</th><th>Value</th>
                  <th>Depositors</th><th>Bonus Cost</th><th>GGR</th><th>NGR</th><th>B/GGR</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => {
                  const ratio = p.bonus_cost && p.ggr ? ((Number(p.bonus_cost) / Number(p.ggr)) * 100).toFixed(1) : null
                  const ratioColor = ratio ? (Number(ratio) <= 20 ? 'var(--success)' : Number(ratio) <= 28 ? 'var(--warning)' : 'var(--danger)') : 'var(--text2)'
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-body)', fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td>{p.subtype || p.type}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{p.campaign_objective || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{p.lifecycle_stage || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{p.value_segment || '—'}</td>
                      <td>{fmtN(p.depositors)}</td>
                      <td>{fmt(p.bonus_cost)}</td>
                      <td>{fmt(p.ggr)}</td>
                      <td style={{ color: p.ngr >= 0 ? 'var(--success)' : p.ngr < 0 ? 'var(--danger)' : 'var(--text)' }}>{fmt(p.ngr)}</td>
                      <td style={{ color: ratioColor, fontWeight: 600 }}>{ratio ? `${ratio}%` : '—'}</td>
                      <td><span className={`tag tag-${p.status}`}>{p.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* AI Summary */}
          <hr className="divider" />
          <div className="section-heading">AI Executive Summary</div>
          {narrative ? (
            <div className="analysis-box">{narrative}</div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '12px' }}>
              Generate an AI-written executive summary — ready to paste into a board report or team update.
            </p>
          )}
          <button className="btn-analysis" onClick={handleGenerate} disabled={generating || withKpis.length === 0} style={{ marginTop: '8px' }}>
            {generating ? <><span className="spinner" style={{ marginRight: '8px' }} />Generating…</> : '⚡ Generate Executive Summary'}
          </button>

        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  )
}
