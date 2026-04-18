import React, { useState } from 'react'

function fmt(v) { return v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—' }
function fmtN(v) { return v ? Number(v).toLocaleString('tr-TR') : '—' }
function ratio(a, b) { return (a && b) ? ((Number(a) / Number(b)) * 100).toFixed(1) : null }
function ratioColor(pct) {
  if (!pct) return 'var(--text2)'
  return Number(pct) <= 20 ? 'var(--success)' : Number(pct) <= 28 ? 'var(--warning)' : 'var(--danger)'
}

function CategoryBlock({ title, icon, promos, color }) {
  const withKpis = promos.filter(p => p.bonus_cost)
  const totals = withKpis.reduce((acc, p) => ({
    targeted: acc.targeted + (Number(p.targeted_count) || 0),
    depositors: acc.depositors + (Number(p.depositors) || 0),
    participants: acc.participants + (Number(p.participants) || 0),
    bonus_cost: acc.bonus_cost + (Number(p.bonus_cost) || 0),
    ggr: acc.ggr + (Number(p.ggr) || 0),
    ngr: acc.ngr + (Number(p.ngr) || 0),
  }), { targeted: 0, depositors: 0, participants: 0, bonus_cost: 0, ggr: 0, ngr: 0 })

  const bGgr = ratio(totals.bonus_cost, totals.ggr)
  const conv = ratio(totals.depositors, totals.targeted)
  const breaches = withKpis.filter(p => p.bonus_cost && p.ggr && ratio(p.bonus_cost, p.ggr) > 20)

  if (!promos.length) return (
    <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', opacity: 0.5, fontSize: '0.82rem', color: 'var(--text2)' }}>
      {icon} {title} — No promotions this month
    </div>
  )

  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem' }}>{icon} {title}</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '0.7rem', background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text2)' }}>{promos.length} promos</span>
          <span style={{ fontSize: '0.7rem', background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text2)' }}>{withKpis.length} with KPIs</span>
        </div>
      </div>
      {withKpis.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '7px' }}>
          {totals.targeted > 0 && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Targeted</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '2px' }}>{fmtN(totals.targeted)}</div></div>}
          {totals.participants > 0 && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Participants</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '2px' }}>{fmtN(totals.participants)}</div></div>}
          {conv && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conv.</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '2px' }}>{conv}%</div></div>}
          <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus Cost</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '2px', color: 'var(--danger)' }}>{fmt(totals.bonus_cost)}</div></div>
          <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NGR</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '2px', color: totals.ngr >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(totals.ngr)}</div></div>
          {bGgr && <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}><div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>B/GGR</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '2px', color: ratioColor(bGgr) }}>{bGgr}%</div></div>}
        </div>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text3)', fontStyle: 'italic' }}>No KPI data yet.</p>
      )}
      {breaches.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--danger)', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '6px', padding: '6px 10px' }}>
          🔴 {breaches.length} promo{breaches.length > 1 ? 's' : ''} over 20%: {breaches.map(p => p.name).join(', ')}
        </div>
      )}
    </div>
  )
}

export default function MonthlyAnalysis({ promos, month, monthEvents, domainFilter, activeTab, reloadData, funnelData, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Context-aware title and data
  const contextLabel = activeTab === 'Reload' ? 'Reload' : activeTab === 'Funnel' ? 'Funnel' : activeTab === 'Promo Code' ? 'Promo Code' : activeTab === 'Ad-Hoc' ? 'Ad-Hoc' : 'All'
  const isReload = activeTab === 'Reload'
  const isFunnel = activeTab === 'Funnel'
  const isPromoOnly = activeTab === 'Promo Code' || activeTab === 'Ad-Hoc'

  const filtered = domainFilter && domainFilter !== 'All' ? promos.filter(p => p.domain === domainFilter) : promos
  const withKpis = filtered.filter(p => p.bonus_cost)

  const adhoc = filtered.filter(p => p.type === 'Ad-Hoc')
  const promoCodes = filtered.filter(p => p.type === 'Promo Code')
  const reloads = filtered.filter(p => p.type === 'Reload')
  const funnels = filtered.filter(p => p.type === 'Funnel')

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
  const top = [...withKpis].sort((a, b) => (Number(b.ngr) || 0) - (Number(a.ngr) || 0))[0]
  const worst = [...withKpis].sort((a, b) => (Number(a.ngr) || 0) - (Number(b.ngr) || 0))[0]

  const buildPrompt = () => {
    const detail = (arr) => arr.filter(p => p.bonus_cost).map(p => {
      const bggr = p.bonus_cost && p.ggr ? ratio(p.bonus_cost, p.ggr) + '%' : 'N/A'
      const conv = p.depositors && p.targeted_count ? ratio(p.depositors, p.targeted_count) + '%' : 'N/A'
      return `  • ${p.name} | Domain: ${p.domain} | LC: ${p.lifecycle_stage || 'N/A'} | Val: ${p.value_segment || 'N/A'} | Conv: ${conv} | Bonus: ₺${Number(p.bonus_cost || 0).toLocaleString()} | GGR: ₺${Number(p.ggr || 0).toLocaleString()} | NGR: ₺${Number(p.ngr || 0).toLocaleString()} | B/GGR: ${bggr}`
    }).join('\n') || '  No KPI data'

    return `You are a senior CRM Analyst at Hepsibahis (brands: Hepsibahis, MrOyun, UWIN), online sports betting and casino in the Turkish market.
Monthly CRM analysis for ${month}${domainFilter && domainFilter !== 'All' ? ` — ${domainFilter} only` : ' — All domains'}.
Critical benchmark: Bonus Cost / GGR ≤ 20%.

Month context: ${monthEvents || 'None noted'}
Threshold breaches: ${allBreaches.length > 0 ? allBreaches.map(p => `${p.name} (${ratio(p.bonus_cost, p.ggr)}%)`).join(', ') : 'None'}

TOTALS: ${withKpis.length}/${filtered.length} promos with KPI data
Targeted: ${fmtN(totals.targeted)} | Depositors: ${fmtN(totals.depositors)} | Bonus Cost: ${fmt(totals.bonus_cost)} | GGR: ${fmt(totals.ggr)} | NGR: ${fmt(totals.ngr)} | B/GGR: ${overallBGgr || 'N/A'}% | ROI: ${overallRoi || 'N/A'}%

AD-HOC PROMOTIONS (${adhoc.length}):
${detail(adhoc)}

PROMO CODE CAMPAIGNS (${promoCodes.length}):
${detail(promoCodes)}

RELOAD PROMOTIONS (${reloads.length}):
${detail(reloads)}

FUNNEL CAMPAIGNS (${funnels.length}):
${detail(funnels)}

Write analysis using EXACTLY these section headers:

## AD-HOC & ONSITE PERFORMANCE
## PROMO CODE PERFORMANCE
## RELOAD PERFORMANCE
## FUNNEL PERFORMANCE
## OVERALL MONTH RATING
Rate: Excellent / Good / Mixed / Poor. Justify in 2-3 sentences.
## WHAT WORKED
3-4 bullet points.
## WHAT NEEDS ATTENTION
3-4 bullet points.
## RECOMMENDATIONS FOR NEXT MONTH
4-5 concrete, specific recommendations.

Keep each section concise. Total 500-650 words.`
  }

  const handleGenerate = async () => {
    // Build context-appropriate prompt
    if (isReload || isFunnel) {
      setGenerating(true)
      setError(null)
      try {
        const data = isReload ? reloadData : funnelData
        const agg = rows => rows.reduce((a,r) => ({ t: a.t+(r.targeted_customers||0), resp: a.resp+(r.targeted_responders||0), ctrl: a.ctrl+(r.control_customers||0), cr: a.cr+(r.control_responders||0) }), {t:0,resp:0,ctrl:0,cr:0})
        const groupKey = isReload ? (r => `${r.lifecycle} ${r.product}`) : (r => r.funnel_label)
        const groups = [...new Set(data.map(groupKey).filter(Boolean))].sort()
        const dates = [...new Set(data.map(r => r.data_date).filter(Boolean))].sort()

        const detail = groups.map(g => {
          const rows = data.filter(r => groupKey(r) === g)
          const t = agg(rows)
          const conv = t.t > 0 ? ((t.resp/t.t)*100).toFixed(1) : '—'
          const lift = t.t > 0 && t.ctrl > 0 ? (((t.resp/t.t)-(t.cr/t.ctrl))*100).toFixed(1) : null
          return `  ${g}: ${t.t} targeted → ${t.resp} responders (${conv}% conv${lift ? `, lift: ${Number(lift)>=0?'+':''}${lift}pp` : ''})`
        }).join('\n')

        const prompt = `You are a senior CRM Analyst at Hepsibahis, an online sports betting and casino in the Turkish market.

Analyse this ${isReload ? 'Reload' : 'Funnel'} performance summary for ${month} and provide a sharp monthly assessment.

Period: ${dates[0]} to ${dates[dates.length-1]} (${dates.length} days)

${isReload ? 'Lifecycle Group' : 'Funnel Group'} breakdown:
${detail}

Write a concise monthly analysis (max 300 words, no headers, flowing paragraphs):
1. Overall verdict for the month — is performance strong, mixed or weak?
2. Which groups are performing well vs underperforming — be specific with numbers
3. Notable trends across the period
4. Two or three specific, actionable recommendations
Be direct and commercially focused.`

        const res = await fetch('/api/monthly-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        setAnalysis(d.result)
        setActiveTab('analysis')
      } catch (e) { setError(e.message) }
      setGenerating(false)
      return
    }
  
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
      setError('Failed: ' + e.message)
    }
    setGenerating(false)
  }

  const parseSections = (text) => {
    if (!text) return []
    return text.split(/## /).filter(Boolean).map(part => {
      const lines = part.trim().split('\n')
      return { title: lines[0].trim(), content: lines.slice(1).join('\n').trim() }
    })
  }

  const sectionStyle = (title) => {
    if (title.includes('WORKED')) return { bg: 'rgba(22,163,74,0.05)', border: 'rgba(22,163,74,0.2)' }
    if (title.includes('ATTENTION')) return { bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.2)' }
    if (title.includes('RECOMMEND')) return { bg: 'rgba(26,110,245,0.05)', border: 'rgba(26,110,245,0.2)' }
    if (title.includes('RATING')) return { bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)' }
    return { bg: 'var(--bg3)', border: 'var(--border)' }
  }

  const sectionIcon = (t) => {
    if (t.includes('AD-HOC')) return '🎯'
    if (t.includes('PROMO CODE')) return '🏷️'
    if (t.includes('RELOAD')) return '🔄'
    if (t.includes('FUNNEL')) return '📡'
    if (t.includes('RATING')) return '⭐'
    if (t.includes('WORKED')) return '✅'
    if (t.includes('ATTENTION')) return '⚠️'
    if (t.includes('RECOMMEND')) return '💡'
    return '📊'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '860px' }}>
        <div className="modal-header">
          <div>
            <h2>🧠 {contextLabel} Analysis — {month}</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>
              {isReload ? `${[...new Set((reloadData||[]).map(r=>r.data_date).filter(Boolean))].length} days uploaded · ${(reloadData||[]).length} segments` :
               isFunnel ? `${[...new Set((funnelData||[]).map(r=>r.data_date).filter(Boolean))].length} days uploaded · ${[...new Set((funnelData||[]).map(r=>r.funnel_label).filter(Boolean))].length} funnel groups` :
               `${domainFilter && domainFilter !== 'All' ? domainFilter : 'All Domains'} · ${filtered.length} promotions · ${withKpis.length} with KPI data · ${allBreaches.length} threshold breach${allBreaches.length !== 1 ? 'es' : ''}`}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

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
              {/* RELOAD OVERVIEW */}
              {isReload && (() => {
                const rd = reloadData || []
                const dates = [...new Set(rd.map(r => r.data_date).filter(Boolean))].sort()
                const groups = [...new Set(rd.map(r => `${r.lifecycle} ${r.product}`))].sort()
                const agg = rows => rows.reduce((a,r) => ({ t: a.t+(r.targeted_customers||0), resp: a.resp+(r.targeted_responders||0), ctrl: a.ctrl+(r.control_customers||0), cr: a.cr+(r.control_responders||0) }), {t:0,resp:0,ctrl:0,cr:0})
                const tot = agg(rd)
                return (
                  <>
                    <div className="section-heading">Reload Totals — {month}</div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', marginBottom: '18px' }}>
                      <div className="stat-card"><div className="stat-label">Days Uploaded</div><div className="stat-value">{dates.length}</div></div>
                      <div className="stat-card"><div className="stat-label">Total Targeted</div><div className="stat-value">{fmtN(tot.t)}</div></div>
                      <div className="stat-card"><div className="stat-label">Total Responders</div><div className="stat-value positive">{fmtN(tot.resp)}</div></div>
                      <div className="stat-card"><div className="stat-label">Overall Conv %</div><div className="stat-value">{tot.t > 0 ? ((tot.resp/tot.t)*100).toFixed(1)+'%' : '—'}</div></div>
                    </div>
                    <div className="section-heading">By Lifecycle Group</div>
                    {groups.map(g => {
                      const rows = rd.filter(r => `${r.lifecycle} ${r.product}` === g)
                      const t = agg(rows)
                      const conv = t.t > 0 ? ((t.resp/t.t)*100).toFixed(1) : null
                      const lift = t.t > 0 && t.ctrl > 0 ? (((t.resp/t.t)-(t.cr/t.ctrl))*100).toFixed(1) : null
                      return (
                        <div key={g} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g}</div>
                          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text2)' }}>Targeted: <strong style={{ color: 'var(--text)' }}>{fmtN(t.t)}</strong></span>
                            <span style={{ color: 'var(--success)' }}>Resp: <strong>{fmtN(t.resp)}</strong></span>
                            <span style={{ color: 'var(--accent)' }}>Conv: <strong>{conv ? conv+'%' : '—'}</strong></span>
                            {lift && <span style={{ color: Number(lift) >= 0 ? 'var(--success)' : 'var(--danger)' }}>Lift: <strong>{Number(lift) >= 0 ? '+' : ''}{lift}pp</strong></span>}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}

              {/* FUNNEL OVERVIEW */}
              {isFunnel && (() => {
                const fd = funnelData || []
                const dates = [...new Set(fd.map(r => r.data_date).filter(Boolean))].sort()
                const labels = [...new Set(fd.map(r => r.funnel_label).filter(Boolean))].sort()
                const agg = rows => rows.reduce((a,r) => ({ t: a.t+(r.targeted_customers||0), resp: a.resp+(r.targeted_responders||0), ctrl: a.ctrl+(r.control_customers||0), cr: a.cr+(r.control_responders||0) }), {t:0,resp:0,ctrl:0,cr:0})
                const tot = agg(fd)
                return (
                  <>
                    <div className="section-heading">Funnel Totals — {month}</div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', marginBottom: '18px' }}>
                      <div className="stat-card"><div className="stat-label">Days Uploaded</div><div className="stat-value">{dates.length}</div></div>
                      <div className="stat-card"><div className="stat-label">Total Targeted</div><div className="stat-value">{fmtN(tot.t)}</div></div>
                      <div className="stat-card"><div className="stat-label">Total Responders</div><div className="stat-value positive">{fmtN(tot.resp)}</div></div>
                      <div className="stat-card"><div className="stat-label">Overall Conv %</div><div className="stat-value">{tot.t > 0 ? ((tot.resp/tot.t)*100).toFixed(1)+'%' : '—'}</div></div>
                    </div>
                    <div className="section-heading">By Funnel Group</div>
                    {labels.map(label => {
                      const rows = fd.filter(r => r.funnel_label === label)
                      const t = agg(rows)
                      const conv = t.t > 0 ? ((t.resp/t.t)*100).toFixed(1) : null
                      const lift = t.t > 0 && t.ctrl > 0 ? (((t.resp/t.t)-(t.cr/t.ctrl))*100).toFixed(1) : null
                      return (
                        <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</div>
                          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text2)' }}>Targeted: <strong style={{ color: 'var(--text)' }}>{fmtN(t.t)}</strong></span>
                            <span style={{ color: 'var(--success)' }}>Resp: <strong>{fmtN(t.resp)}</strong></span>
                            <span style={{ color: 'var(--accent)' }}>Conv: <strong>{conv ? conv+'%' : '—'}</strong></span>
                            {lift && <span style={{ color: Number(lift) >= 0 ? 'var(--success)' : 'var(--danger)' }}>Lift: <strong>{Number(lift) >= 0 ? '+' : ''}{lift}pp</strong></span>}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}

              {/* PROMO OVERVIEW (existing) */}
              {!isReload && !isFunnel && (
                <>
                  <div className="section-heading">Month Totals{domainFilter && domainFilter !== 'All' ? ` — ${domainFilter}` : ''}</div>
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', marginBottom: '18px' }}>
                    <div className="stat-card"><div className="stat-label">Promotions</div><div className="stat-value">{filtered.length}</div></div>
                    <div className="stat-card"><div className="stat-label">Targeted</div><div className="stat-value">{fmtN(totals.targeted)}</div></div>
                    <div className="stat-card"><div className="stat-label">Depositors</div><div className="stat-value">{fmtN(totals.depositors)}</div></div>
                    <div className="stat-card"><div className="stat-label">Bonus Cost</div><div className="stat-value negative">{fmt(totals.bonus_cost)}</div></div>
                    <div className="stat-card"><div className="stat-label">GGR</div><div className="stat-value">{fmt(totals.ggr)}</div></div>
                    <div className="stat-card"><div className="stat-label">NGR</div><div className={`stat-value ${totals.ngr >= 0 ? 'positive' : 'negative'}`}>{fmt(totals.ngr)}</div></div>
                    <div className="stat-card"><div className="stat-label">Bonus/GGR</div><div className="stat-value" style={{ color: ratioColor(overallBGgr) }}>{overallBGgr ? overallBGgr + '%' : '—'}</div></div>
                    <div className="stat-card"><div className="stat-label">ROI</div><div className={`stat-value ${Number(overallRoi) >= 0 ? 'positive' : 'negative'}`}>{overallRoi ? overallRoi + '%' : '—'}</div></div>
                  </div>
                  {top && worst && top.id !== worst.id && (
                    <>
                      <div className="section-heading">Highlights</div>
                      <div className="form-row" style={{ marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>🏆 Top Performer</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '2px' }}>{top.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '0.85rem' }}>NGR: {fmt(top.ngr)}</div>
                        </div>
                        <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>📉 Needs Review</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '2px' }}>{worst.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontSize: '0.85rem' }}>NGR: {fmt(worst.ngr)}</div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="section-heading">By Category</div>
                  {activeTab === 'Promo Code' ? <CategoryBlock title="Promo Code Campaigns" icon="🏷️" promos={promoCodes} color="#16a34a" /> :
                   activeTab === 'Ad-Hoc' ? <CategoryBlock title="Ad-Hoc Promotions" icon="🎯" promos={adhoc} color="#e8a020" /> : (
                    <>
                      <CategoryBlock title="Ad-Hoc Promotions" icon="🎯" promos={adhoc} color="#e8a020" />
                      <CategoryBlock title="Promo Code Campaigns" icon="🏷️" promos={promoCodes} color="#16a34a" />
                    </>
                  )}
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button className="btn-analysis" style={{ padding: '12px 28px', fontSize: '0.9rem' }} onClick={handleGenerate} disabled={generating || (!isReload && !isFunnel && withKpis.length === 0)}>
                  {generating ? <><span className="spinner" style={{ marginRight: '10px' }} />Generating…</> : '🧠 Generate Full Monthly Analysis'}
                </button>
                {!isReload && !isFunnel && withKpis.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: '8px' }}>Enter KPI data on at least one promotion first</p>}
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                    <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={handleGenerate} disabled={generating}>
                      {generating ? 'Regenerating…' : '↺ Regenerate'}
                    </button>
                  </div>
                  {parseSections(analysis).map((s, i) => {
                    const st = sectionStyle(s.title)
                    return (
                      <div key={i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                          {sectionIcon(s.title)} {s.title}
                        </div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.content}</div>
                      </div>
                    )
                  })}
                  {error && <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '8px' }}>{error}</p>}
                </>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {activeTab === 'overview' && analysis && <button className="btn-secondary" onClick={() => setActiveTab('analysis')}>View Analysis →</button>}
        </div>
      </div>
    </div>
  )
}
