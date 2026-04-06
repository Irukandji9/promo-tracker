import React, { useState } from 'react'

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `₺${Number(v).toLocaleString('tr-TR')}`
}
function fmtN(v) {
  if (v === null || v === undefined || v === '') return '—'
  return Number(v).toLocaleString('tr-TR')
}
function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${Number(v).toFixed(1)}%`
}

export default function MonthlyReport({ promos, month, onClose, onGenerateNarrative }) {
  const [narrative, setNarrative] = useState('')
  const [generating, setGenerating] = useState(false)

  const completed = promos.filter(p => p.status === 'completed' || p.status === 'analysed')
  const withKpis = completed.filter(p => p.bonus_cost)

  const totals = withKpis.reduce((acc, p) => ({
    participants: acc.participants + (Number(p.participants) || 0),
    depositors: acc.depositors + (Number(p.depositors) || 0),
    deposit_volume: acc.deposit_volume + (Number(p.deposit_volume) || 0),
    total_stakes: acc.total_stakes + (Number(p.total_stakes) || 0),
    bonus_cost: acc.bonus_cost + (Number(p.bonus_cost) || 0),
    ggr: acc.ggr + (Number(p.ggr) || 0),
    ngr: acc.ngr + (Number(p.ngr) || 0),
  }), { participants: 0, depositors: 0, deposit_volume: 0, total_stakes: 0, bonus_cost: 0, ggr: 0, ngr: 0 })

  const overallRoi = totals.bonus_cost ? (((totals.ngr - totals.bonus_cost) / totals.bonus_cost) * 100).toFixed(1) : null
  const conversionRate = totals.participants ? ((totals.depositors / totals.participants) * 100).toFixed(1) : null
  const cpd = totals.depositors ? (totals.bonus_cost / totals.depositors).toFixed(0) : null

  // Sort by NGR for best/worst
  const ranked = [...withKpis].sort((a, b) => (Number(b.ngr) || 0) - (Number(a.ngr) || 0))
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]

  // By type
  const byType = {}
  withKpis.forEach(p => {
    const t = p.type
    if (!byType[t]) byType[t] = { count: 0, bonus_cost: 0, ngr: 0, depositors: 0 }
    byType[t].count++
    byType[t].bonus_cost += Number(p.bonus_cost) || 0
    byType[t].ngr += Number(p.ngr) || 0
    byType[t].depositors += Number(p.depositors) || 0
  })

  const handleGenerate = async () => {
    setGenerating(true)
    const result = await onGenerateNarrative({ promos: withKpis, totals, month, overallRoi })
    setNarrative(result)
    setGenerating(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <div>
            <h2>📋 Monthly Promotional Report</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>{month} — {promos.length} promotions total · {completed.length} completed · {withKpis.length} with KPI data</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Summary KPIs */}
          <div className="section-heading">Month Summary</div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-label">Total Promos</div>
              <div className="stat-value">{promos.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Targeted</div>
              <div className="stat-value">{fmtN(totals.participants)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Depositors</div>
              <div className="stat-value">{fmtN(totals.depositors)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Conversion Rate</div>
              <div className="stat-value">{fmtPct(conversionRate)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Deposit Volume</div>
              <div className="stat-value">{fmt(totals.deposit_volume)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Stakes</div>
              <div className="stat-value">{fmt(totals.total_stakes)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Bonus Cost</div>
              <div className="stat-value negative">{fmt(totals.bonus_cost)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total GGR</div>
              <div className="stat-value">{fmt(totals.ggr)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total NGR</div>
              <div className={`stat-value ${totals.ngr >= 0 ? 'positive' : 'negative'}`}>{fmt(totals.ngr)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Overall ROI</div>
              <div className={`stat-value ${Number(overallRoi) >= 0 ? 'positive' : 'negative'}`}>{fmtPct(overallRoi)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cost / Depositor</div>
              <div className="stat-value">{cpd ? `₺${Number(cpd).toLocaleString('tr-TR')}` : '—'}</div>
            </div>
          </div>

          {/* Performance highlights */}
          {best && worst && best.id !== worst.id && (
            <>
              <hr className="divider" />
              <div className="section-heading">Performance Highlights</div>
              <div className="form-row">
                <div className="card" style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>🏆 Best Performer (NGR)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '4px' }}>{best.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{best.type} · {best.target_segment}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--success)', marginTop: '8px' }}>NGR: {fmt(best.ngr)}</div>
                </div>
                <div className="card" style={{ borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.04)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>📉 Lowest Performer (NGR)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '4px' }}>{worst.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{worst.type} · {worst.target_segment}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--danger)', marginTop: '8px' }}>NGR: {fmt(worst.ngr)}</div>
                </div>
              </div>
            </>
          )}

          {/* By type breakdown */}
          {Object.keys(byType).length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-heading">Breakdown by Promo Type</div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Count</th>
                    <th>Depositors</th>
                    <th>Bonus Cost</th>
                    <th>NGR</th>
                    <th>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byType).map(([type, d]) => {
                    const roi = d.bonus_cost ? (((d.ngr - d.bonus_cost) / d.bonus_cost) * 100).toFixed(1) : null
                    return (
                      <tr key={type}>
                        <td>{type}</td>
                        <td>{d.count}</td>
                        <td>{fmtN(d.depositors)}</td>
                        <td>{fmt(d.bonus_cost)}</td>
                        <td style={{ color: d.ngr >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(d.ngr)}</td>
                        <td style={{ color: Number(roi) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtPct(roi)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* All promos table */}
          <hr className="divider" />
          <div className="section-heading">All Promotions</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Segment</th>
                  <th>Depositors</th>
                  <th>Deposit Vol.</th>
                  <th>Bonus Cost</th>
                  <th>NGR</th>
                  <th>ROI</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => {
                  const roi = p.bonus_cost && p.ngr ? (((Number(p.ngr) - Number(p.bonus_cost)) / Number(p.bonus_cost)) * 100).toFixed(1) : null
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-body)', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td>{p.subtype || p.type}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{p.target_segment || '—'}</td>
                      <td>{fmtN(p.depositors)}</td>
                      <td>{fmt(p.deposit_volume)}</td>
                      <td>{fmt(p.bonus_cost)}</td>
                      <td style={{ color: p.ngr >= 0 ? 'var(--success)' : p.ngr < 0 ? 'var(--danger)' : 'var(--text)' }}>{fmt(p.ngr)}</td>
                      <td style={{ color: Number(roi) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtPct(roi)}</td>
                      <td><span className={`tag tag-${p.status}`}>{p.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* AI Narrative */}
          <hr className="divider" />
          <div className="section-heading">AI Executive Summary</div>
          {narrative ? (
            <div className="analysis-box">{narrative}</div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '12px' }}>
              Generate an AI-written executive summary of this month's promotional performance — ready to paste into your board report or team update.
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
