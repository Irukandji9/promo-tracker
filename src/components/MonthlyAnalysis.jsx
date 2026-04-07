import React, { useState } from 'react'

function fmt(v) {
  if (!v) return '—'
  return `₺${Number(v).toLocaleString('tr-TR')}`
}
function fmtN(v) {
  if (!v) return '—'
  return Number(v).toLocaleString('tr-TR')
}
function ratio(a, b) {
  if (!a || !b) return null
  return ((Number(a) / Number(b)) * 100).toFixed(1)
}
function ratioColor(pct) {
  if (pct === null) return 'var(--text2)'
  return Number(pct) <= 20 ? 'var(--success)' : Number(pct) <= 28 ? 'var(--warning)' : 'var(--danger)'
}

function SectionScore({ label, score, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text2)', minWidth: '140px' }}>{label}</span>
      <div style={{ flex: 1, height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color, minWidth: '36px', textAlign: 'right' }}>{score}/100</span>
    </div>
  )
}

function CategoryBlock({ title, icon, promos, color }) {
  if (!promos || promos.length === 0) return (
    <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px', opacity: 0.5 }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{icon} {title} — No data this month</div>
    </div>
  )

  const withKpis = promos.filter(p => p.bonus_cost)
  const totals = withKpis.reduce((acc, p) => ({
    targeted: acc.targeted + (Number(p.targeted_count) || 0),
    depositors: acc.depositors + (Number(p.depositors) || 0),
    bonus_cost: acc.bonus_cost + (Number(p.bonus_cost) || 0),
    ggr: acc.ggr + (Number(p.ggr) || 0),
    ngr: acc.ngr + (Number(p.ngr) || 0),
    engaged: acc.engaged + (Number(p.unique_players_engaged) || 0),
  }), { targeted: 0, depositors: 0, bonus_cost: 0, ggr: 0, ngr: 0, engaged: 0 })

  const bGgr = ratio(totals.bonus_cost, totals.ggr)
  const conv = ratio(totals.depositors, totals.targeted)
  const roi = totals.bonus_cost ? (((totals.ngr - totals.bonus_cost) / totals.bonus_cost) * 100).toFixed(1) : null
  const breaches = withKpis.filter(p => p.bonus_cost && p.ggr && ratio(p.bonus_cost, p.ggr) > 20)

  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem' }}>{icon} {title}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text2)' }}>{promos.length} promos</span>
          {withKpis.length > 0 && <span style={{ fontSize: '0.72rem', background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text2)' }}>{withKpis.length} with KPIs</span>}
        </div>
      </div>
      {withKpis.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
          {totals.targeted > 0 && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Targeted</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{fmtN(totals.targeted)}</div></div>}
          {totals.depositors > 0 && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Depositors</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{fmtN(totals.depositors)}</div></div>}
          {totals.engaged > 0 && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engaged</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{fmtN(totals.engaged)}</div></div>}
          {conv && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conv. Rate</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{conv}%</div></div>}
          <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus Cost</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: 'var(--danger)' }}>{fmt(totals.bonus_cost)}</div></div>
          <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NGR</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: totals.ngr >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(totals.ngr)}</div></div>
          {bGgr && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus/GGR</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: ratioColor(bGgr) }}>{bGgr}%</div></div>}
          {roi && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ROI</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: Number(roi) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{roi}%</div></div>}
        </div>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text3)', fontStyle: 'italic' }}>No KPI data entered yet for these promotions.</p>
      )}
      {breaches.length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '0.76rem', color: 'var(--danger)', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '6px', padding: '7px 10px' }}>
          🔴 {breaches.length} promo{breaches.length > 1 ? 's' : ''} over 20% threshold: {breaches.map(p => p.name).join(', ')}
        </div>
      )}
    </div>
  )
}

export default function MonthlyAnalysis({ promos, month, monthEvents, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const funnels = promos.filter(p => p.type === 'Promo Code')
  const reloads = promos.filter(p => p.type === 'Reload')
  const onsite = promos.filter(p => p.type === 'Onsite')
  const withKpis = promos.filter(p => p.bonus_cost)

  const totals = withKpis.reduce((acc, p) => ({
    targeted: acc.targeted + (Number(p.targeted_count) || 0),
    depositors: acc.depositors + (Number(p.depositors) || 0),
    bonus_cost: acc.bonus_cost + (Number(p.bonus_cost) || 0),
    ggr: acc.ggr + (Number(p.ggr) || 0),
    ngr: acc.ngr + (Number(p.ngr) || 0),
  }), { targeted: 0, depositors: 0, bonus_cost: 0, ggr: 0, ngr: 0 })

  const overallBGgr = ratio(totals.bonus_cost, totals.ggr)
  const overallRoi = totals.bonus_cost ? (((totals.ngr - totals.bonus_cost) / totals.bonus_cost) * 100).toFixed(1) : null
  const allBreaches = withKpis.filter(p => p.bonus_cost && p.ggr && ratio(p.bonus_cost, p.ggr) > 20)
  const topPerformer = [...withKpis].sort((a, b) => (Number(b.ngr) || 0) - (Number(a.ngr) || 0))[0]
  const worstPerformer = [...withKpis].sort((a, b) => (Number(a.ngr) || 0) - (Number(b.ngr) || 0))[0]

  const buildPrompt = () => {
    const promoDetail = (arr, label) => arr.filter(p => p.bonus_cost).map(p => {
      const bggr = p.bonus_cost && p.ggr ? ratio(p.bonus_cost, p.ggr) + '%' : 'N/A'
      const conv = p.depositors && p.targeted_count ? ratio(p.depositors, p.targeted_count) + '%' : 'N/A'
      const lift = p.control_group_count && p.control_group_responders && p.depositors && p.targeted_count
        ? (Number(ratio(p.depositors, p.targeted_count)) - Number(ratio(p.control_group_responders, p.control_group_count))).toFixed(1) + 'pp lift'
        : null
      return `  • ${p.name} | Obj: ${p.campaign_objective || 'N/A'} | LC: ${p.lifecycle_stage || 'N/A'} | Val: ${p.value_segment || 'N/A'} | Conv: ${conv} | Bonus: ₺${Number(p.bonus_cost || 0).toLocaleString()} | GGR: ₺${Number(p.ggr || 0).toLocaleString()} | NGR: ₺${Number(p.ngr || 0).toLocaleString()} | B/GGR: ${bggr}${lift ? ' | ' + lift : ''}${p.event_context ? ' | Event: ' + p.event_context : ''}`
    }).join('\n') || '  No KPI data available'

    return `You are a senior CRM Analyst at Hepsibahis, an online sports betting and casino brand in the Turkish market. Your audience is the Head of CRM and senior leadership team.

Produce a structured monthly CRM performance analysis for ${month}. Be sharp, commercially focused, and data-driven. Use ₺ for currency. The critical benchmark is Bonus Cost / GGR ≤ 20%.

MONTH CONTEXT: ${monthEvents || 'No specific events noted'}

OVERALL TOTALS (promotions with KPI data: ${withKpis.length}/${promos.length}):
- Total Targeted: ${fmtN(totals.targeted)}
- Total Depositors: ${fmtN(totals.depositors)}
- Total Bonus Cost: ${fmt(totals.bonus_cost)}
- Total GGR: ${fmt(totals.ggr)}
- Total NGR: ${fmt(totals.ngr)}
- Overall Bonus/GGR: ${overallBGgr || 'N/A'}% (target ≤20%)
- Overall ROI: ${overallRoi || 'N/A'}%
- Threshold Breaches: ${allBreaches.length} promotion(s) over 20%

RELOAD PROMOTIONS (${reloads.length} total):
${promoDetail(reloads, 'Reload')}

PROMO CODE / FUNNEL CAMPAIGNS (${funnels.length} total):
${promoDetail(funnels, 'Funnel')}

ONSITE PROMOTIONS (${onsite.length} total):
${onsite.filter(p => p.bonus_cost).map(p => `  • ${p.name} | Sub: ${p.subtype || 'N/A'} | Engaged: ${fmtN(p.unique_players_engaged)} | Rounds: ${fmtN(p.game_rounds_played)} | Turnover: ${fmt(p.total_turnover)} | Bonus: ₺${Number(p.bonus_cost || 0).toLocaleString()} | GGR: ₺${Number(p.ggr || 0).toLocaleString()} | NGR: ₺${Number(p.ngr || 0).toLocaleString()} | B/GGR: ${ratio(p.bonus_cost, p.ggr) || 'N/A'}%`).join('\n') || '  No KPI data available'}

Now write the analysis in EXACTLY this structure using these section headers:

## RELOAD PERFORMANCE
Analyse the reload promotions. Cover: conversion rates, bonus efficiency, which value segments/lifecycle stages performed best, any threshold breaches, and whether the mechanics are driving the right behaviour.

## FUNNEL & PROMO CODE PERFORMANCE  
Analyse the funnel and promo code campaigns. Cover: conversion rates, incremental lift where available, day-level performance patterns if visible, and cost efficiency.

## ONSITE PROMOTION PERFORMANCE
Analyse the onsite promotions. Cover: engagement metrics, turnover generated, bonus efficiency, and whether the mechanics matched the objective.

## OVERALL MONTH RATING
Give the month an overall commercial rating: Excellent / Good / Mixed / Poor — and justify it in 2-3 sentences based on the Bonus/GGR ratio and NGR performance.

## WHAT WORKED
3-4 bullet points — the clear wins this month.

## WHAT NEEDS ATTENTION
3-4 bullet points — underperformers, threshold breaches, or mechanics that should be reviewed.

## RECOMMENDATIONS FOR NEXT MONTH
4-5 concrete, actionable recommendations with specific reference to segments, mechanics, or offer structures. Be specific — not generic advice.

Keep each section concise but substantive. Total response should be 500-650 words.`
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/monthly-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt() })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAnalysis(data.result)
      setActiveTab('analysis')
    } catch (e) {
      setError('Analysis failed: ' + e.message)
    }
    setGenerating(false)
  }

  // Parse analysis into sections
  const parseSections = (text) => {
    if (!text) return []
    const sections = []
    const parts = text.split(/## /)
    parts.forEach(part => {
      if (!part.trim()) return
      const lines = part.trim().split('\n')
      const title = lines[0].trim()
      const content = lines.slice(1).join('\n').trim()
      sections.push({ title, content })
    })
    return sections
  }

  const sections = parseSections(analysis)

  const sectionIcon = (title) => {
    if (title.includes('RELOAD')) return '🔄'
    if (title.includes('FUNNEL') || title.includes('PROMO')) return '🎯'
    if (title.includes('ONSITE')) return '🖥️'
    if (title.includes('RATING')) return '⭐'
    if (title.includes('WORKED')) return '✅'
    if (title.includes('ATTENTION')) return '⚠️'
    if (title.includes('RECOMMEND')) return '💡'
    return '📊'
  }

  const sectionColor = (title) => {
    if (title.includes('WORKED')) return 'rgba(22,163,74,0.06)'
    if (title.includes('ATTENTION')) return 'rgba(220,38,38,0.06)'
    if (title.includes('RECOMMEND')) return 'rgba(26,110,245,0.06)'
    if (title.includes('RATING')) return 'rgba(251,191,36,0.06)'
    return 'var(--bg3)'
  }

  const sectionBorder = (title) => {
    if (title.includes('WORKED')) return 'rgba(22,163,74,0.2)'
    if (title.includes('ATTENTION')) return 'rgba(220,38,38,0.2)'
    if (title.includes('RECOMMEND')) return 'rgba(26,110,245,0.2)'
    if (title.includes('RATING')) return 'rgba(251,191,36,0.2)'
    return 'var(--border)'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '860px' }}>
        <div className="modal-header">
          <div>
            <h2>🧠 Monthly CRM Analysis — {month}</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>
              {promos.length} promotions · {withKpis.length} with KPI data · {allBreaches.length} threshold breach{allBreaches.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', background: 'var(--bg2)' }}>
          {['overview', 'analysis'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600,
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', textTransform: 'capitalize', marginBottom: '-1px'
            }}>
              {tab === 'overview' ? '📊 Data Overview' : '🧠 AI Analysis'}
            </button>
          ))}
        </div>

        <div className="modal-body">

          {activeTab === 'overview' && (
            <>
              {/* Overall KPIs */}
              <div className="section-heading">Month Totals</div>
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', marginBottom: '20px' }}>
                <div className="stat-card"><div className="stat-label">Promotions</div><div className="stat-value">{promos.length}</div></div>
                <div className="stat-card"><div className="stat-label">Targeted</div><div className="stat-value">{fmtN(totals.targeted)}</div></div>
                <div className="stat-card"><div className="stat-label">Depositors</div><div className="stat-value">{fmtN(totals.depositors)}</div></div>
                <div className="stat-card"><div className="stat-label">Bonus Cost</div><div className="stat-value negative">{fmt(totals.bonus_cost)}</div></div>
                <div className="stat-card"><div className="stat-label">GGR</div><div className="stat-value">{fmt(totals.ggr)}</div></div>
                <div className="stat-card"><div className="stat-label">NGR</div><div className={`stat-value ${totals.ngr >= 0 ? 'positive' : 'negative'}`}>{fmt(totals.ngr)}</div></div>
                <div className="stat-card">
                  <div className="stat-label">Bonus/GGR</div>
                  <div className="stat-value" style={{ color: ratioColor(overallBGgr) }}>{overallBGgr ? overallBGgr + '%' : '—'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Overall ROI</div>
                  <div className={`stat-value ${Number(overallRoi) >= 0 ? 'positive' : 'negative'}`}>{overallRoi ? overallRoi + '%' : '—'}</div>
                </div>
              </div>

              {/* Best / Worst */}
              {topPerformer && worstPerformer && topPerformer.id !== worstPerformer.id && (
                <>
                  <div className="section-heading">Highlights</div>
                  <div className="form-row" style={{ marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>🏆 Top Performer</div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '2px' }}>{topPerformer.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '0.85rem' }}>NGR: {fmt(topPerformer.ngr)}</div>
                    </div>
                    <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>📉 Needs Review</div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '2px' }}>{worstPerformer.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontSize: '0.85rem' }}>NGR: {fmt(worstPerformer.ngr)}</div>
                    </div>
                  </div>
                </>
              )}

              {/* By category */}
              <div className="section-heading">By Category</div>
              <CategoryBlock title="Reload Promotions" icon="🔄" promos={reloads} color="#1a6ef5" />
              <CategoryBlock title="Promo Code / Funnel Campaigns" icon="🎯" promos={funnels} color="#e8a020" />
              <CategoryBlock title="Onsite Promotions" icon="🖥️" promos={onsite} color="#0ea5e9" />

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button className="btn-analysis" style={{ padding: '12px 28px', fontSize: '0.9rem' }} onClick={handleGenerate} disabled={generating || withKpis.length === 0}>
                  {generating ? <><span className="spinner" style={{ marginRight: '10px' }} />Generating full analysis…</> : '🧠 Generate Full Monthly Analysis'}
                </button>
                {withKpis.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: '8px' }}>Enter KPI data on at least one promotion first</p>}
                {error && <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '8px' }}>{error}</p>}
              </div>
            </>
          )}

          {activeTab === 'analysis' && (
            <>
              {!analysis ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ color: 'var(--text2)', marginBottom: '16px' }}>No analysis generated yet.</p>
                  <button className="btn-analysis" onClick={handleGenerate} disabled={generating}>
                    {generating ? <><span className="spinner" style={{ marginRight: '10px' }} />Generating…</> : '🧠 Generate Monthly Analysis'}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={handleGenerate} disabled={generating}>
                      {generating ? 'Regenerating…' : '↺ Regenerate'}
                    </button>
                  </div>
                  {sections.map((s, i) => (
                    <div key={i} style={{
                      background: sectionColor(s.title),
                      border: `1px solid ${sectionBorder(s.title)}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {sectionIcon(s.title)} {s.title}
                      </div>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {s.content}
                      </div>
                    </div>
                  ))}
                  {error && <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '8px' }}>{error}</p>}
                </>
              )}
            </>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {activeTab === 'overview' && analysis && (
            <button className="btn-secondary" onClick={() => setActiveTab('analysis')}>View Analysis →</button>
          )}
        </div>
      </div>
    </div>
  )
}
