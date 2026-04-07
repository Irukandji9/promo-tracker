import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import PromoForm from './components/PromoForm'
import KpiForm from './components/KpiForm'
import PromoCard from './components/PromoCard'
import MonthlyReport from './components/MonthlyReport'
import MonthlyAnalysis from './components/MonthlyAnalysis'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const currentYear = new Date().getFullYear()
const ALL_MONTHS = MONTHS.map(m => `${m} ${currentYear}`)

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [])
  return <div className={`toast ${type}`}>{msg}</div>
}

export default function App() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[new Date().getMonth()])
  const [showForm, setShowForm] = useState(false)
  const [editPromo, setEditPromo] = useState(null)
  const [kpiPromo, setKpiPromo] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [toast, setToast] = useState(null)
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterObjective, setFilterObjective] = useState('All')
  const [monthEvents, setMonthEvents] = useState('')
  const [editingEvents, setEditingEvents] = useState(false)
  const [eventsMap, setEventsMap] = useState({})

  const notify = (msg, type = 'success') => setToast({ msg, type })

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('month', selectedMonth)
      .order('start_date', { ascending: true })
    if (!error) setPromos(data || [])
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => { fetchPromos() }, [fetchPromos])

  // Load/save month events from localStorage (lightweight, no DB needed)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('promotrack_events') || '{}')
      setEventsMap(stored)
      setMonthEvents(stored[selectedMonth] || '')
    } catch { setMonthEvents('') }
  }, [selectedMonth])

  const saveMonthEvents = () => {
    const updated = { ...eventsMap, [selectedMonth]: monthEvents }
    setEventsMap(updated)
    localStorage.setItem('promotrack_events', JSON.stringify(updated))
    setEditingEvents(false)
    notify('Month events saved ✓')
  }

  // SAVE / CREATE
  const handleSavePromo = async (form) => {
    const payload = { ...form }
    const nullIfEmpty = ['reward_value','max_reward_cap','min_deposit','min_bet_amount','participants']
    nullIfEmpty.forEach(k => { if (!payload[k]) payload[k] = null })

    if (editPromo) {
      const { error } = await supabase.from('promotions').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editPromo.id)
      if (error) { notify('Error saving: ' + error.message, 'error'); return }
      notify('Promotion updated ✓')
    } else {
      const { error } = await supabase.from('promotions').insert([payload])
      if (error) { notify('Error creating: ' + error.message, 'error'); return }
      notify('Promotion created ✓')
    }
    setShowForm(false)
    setEditPromo(null)
    fetchPromos()
  }

  // DUPLICATE
  const handleDuplicate = (promo) => {
    const { id, created_at, updated_at, analysis_result,
      bonus_cost, ggr, ngr, participants, depositors, deposit_volume,
      total_stakes, targeted_count, opt_in_count, control_group_count,
      control_group_responders, unique_players_engaged, game_rounds_played,
      total_turnover, avg_session_length, notes,
      ...rest } = promo
    setEditPromo(null)
    setShowForm(true)
    setTimeout(() => {
      setEditPromo({
        ...rest,
        start_date: '',
        end_date: '',
        status: 'planned',
        _isDuplicate: true,
      })
    }, 50)
    notify('Promotion duplicated — update the dates and save')
  }

  // SAVE KPIs
  const handleSaveKpi = async (form) => {
    const fields = {
      participants: form.participants || null,
      depositors: form.depositors || null,
      deposit_volume: form.deposit_volume || null,
      total_stakes: form.total_stakes || null,
      bonus_cost: form.bonus_cost || null,
      ggr: form.ggr || null,
      ngr: form.ngr || null,
      notes: form.notes || null,
      status: form.status,
      targeted_count: form.targeted_count || null,
      opt_in_count: form.opt_in_count || null,
      control_group_count: form.control_group_count || null,
      control_group_responders: form.control_group_responders || null,
      unique_players_engaged: form.unique_players_engaged || null,
      game_rounds_played: form.game_rounds_played || null,
      total_turnover: form.total_turnover || null,
      avg_session_length: form.avg_session_length || null,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase.from('promotions').update(fields).eq('id', kpiPromo.id)
    if (error) { notify('Error saving KPIs: ' + error.message, 'error'); return }
    notify('KPI results saved ✓')
    setKpiPromo(null)
    fetchPromos()
  }

  // DELETE
  const handleDelete = async (id) => {
    if (!confirm('Delete this promotion?')) return
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) { notify('Error deleting: ' + error.message, 'error'); return }
    notify('Promotion deleted')
    fetchPromos()
  }

  // AI ANALYSIS
  const handleAnalyse = async (promoData) => {
    const prompt = buildAnalysisPrompt(promoData)
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const text = data.result || 'Analysis unavailable.'
      await supabase.from('promotions').update({
        analysis_result: text,
        status: 'analysed',
        updated_at: new Date().toISOString()
      }).eq('id', promoData.id)
      setKpiPromo(prev => prev ? { ...prev, analysis_result: text, status: 'analysed' } : null)
      notify('AI analysis complete ✓')
      fetchPromos()
    } catch (e) {
      notify('Analysis failed: ' + e.message, 'error')
    }
  }

  // AI MONTHLY NARRATIVE
  const handleMonthlyNarrative = async ({ promos, totals, month, overallRoi, overallBonusGgr, monthEvents, breaches }) => {
    const prompt = `You are a senior CRM Analyst at Hepsibahis, an online sports betting and casino brand in the Turkish market.

Write a professional executive summary of promotional performance for ${month}.
Audience: Head of CRM and senior management. Max 380 words. 4 paragraphs:
1. Overall performance vs the 20% Bonus/GGR target (key: ${overallBonusGgr}% overall ratio)
2. Standout promotions — best and worst NGR performers
3. Patterns by objective/lifecycle/value segment
4. Recommendations for next month

Key month context: ${monthEvents || 'No specific events noted'}

${breaches.length > 0 ? `THRESHOLD BREACHES (>20% Bonus/GGR): ${breaches.map(p => `${p.name} at ${((Number(p.bonus_cost)/Number(p.ggr))*100).toFixed(1)}%`).join(', ')}` : 'All promotions within the 20% threshold.'}

Totals:
- Promotions: ${promos.length}
- Targeted: ${totals.targeted_count?.toLocaleString()}
- Depositors: ${totals.depositors?.toLocaleString()}  
- Bonus Cost: ₺${totals.bonus_cost?.toLocaleString()}
- GGR: ₺${totals.ggr?.toLocaleString()}
- NGR: ₺${totals.ngr?.toLocaleString()}
- Overall ROI: ${overallRoi}%

Promotions detail:
${promos.map(p => `- ${p.name} | ${p.type} | Obj: ${p.campaign_objective || 'N/A'} | LC: ${p.lifecycle_stage || 'N/A'} | Val: ${p.value_segment || 'N/A'} | Depositors: ${p.depositors || 0} | Bonus: ₺${p.bonus_cost || 0} | GGR: ₺${p.ggr || 0} | NGR: ₺${p.ngr || 0} | B/GGR: ${p.bonus_cost && p.ggr ? ((Number(p.bonus_cost)/Number(p.ggr))*100).toFixed(1)+'%' : 'N/A'}`).join('\n')}

Be direct, data-driven, commercially focused. Use ₺ for currency.`

    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data.result || 'Summary unavailable.'
    } catch (e) {
      return 'Error: ' + e.message
    }
  }

  // Filtered
  const filtered = promos.filter(p => {
    if (filterType !== 'All' && p.type !== filterType) return false
    if (filterStatus !== 'All' && p.status !== filterStatus) return false
    if (filterObjective !== 'All' && p.campaign_objective !== filterObjective) return false
    return true
  })

  const statusCounts = promos.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '58px',
        position: 'sticky',
        top: 0,
        background: 'rgba(245,245,247,0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
        boxShadow: '0 1px 0 var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
            PROMO<span style={{ color: 'var(--accent)' }}>TRACK</span>
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '10px', borderLeft: '1px solid var(--border)' }}>Hepsibahis CRM</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setShowReport(true)} disabled={promos.length === 0}>📋 Monthly Report</button>
          <button className="btn-ghost" style={{ color: 'var(--accent)', borderColor: 'rgba(26,110,245,0.3)' }} onClick={() => setShowAnalysis(true)} disabled={promos.length === 0}>🧠 Monthly Analysis</button>
          <button className="btn-primary" onClick={() => { setEditPromo(null); setShowForm(true) }}>+ New Promo</button>
        </div>
      </header>

      {/* Month selector */}
      <div style={{ padding: '16px 28px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {ALL_MONTHS.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)} style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '0.77rem', fontWeight: 500,
              border: '1px solid', cursor: 'pointer', transition: 'all 0.12s',
              background: selectedMonth === m ? 'var(--accent)' : 'transparent',
              borderColor: selectedMonth === m ? 'var(--accent)' : 'var(--border)',
              color: selectedMonth === m ? '#fff' : 'var(--text2)',
            }}>
              {m.split(' ')[0].slice(0, 3)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.78rem' }}>
            <option>All</option><option>Reload</option><option>Promo Code</option><option>Onsite</option>
          </select>
          <select value={filterObjective} onChange={e => setFilterObjective(e.target.value)} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.78rem' }}>
            <option>All</option><option value="Retention">Retention</option><option value="Reactivation">Reactivation</option>
            <option value="Acquisition">Acquisition</option><option value="Monetisation">Monetisation</option><option value="Engagement">Engagement</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.78rem' }}>
            <option>All</option><option value="planned">Planned</option><option value="active">Active</option>
            <option value="completed">Completed</option><option value="analysed">Analysed</option>
          </select>
        </div>
      </div>

      {/* Month Events Panel */}
      <div style={{ padding: '12px 28px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        {editingEvents ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>🗓️ Month Events & Context for {selectedMonth}</label>
              <textarea
                value={monthEvents}
                onChange={e => setMonthEvents(e.target.value)}
                placeholder="Log key events this month — Süper Lig fixtures, public holidays, competitor activity, special occasions..."
                style={{ minHeight: '56px', fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '20px' }}>
              <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.78rem' }} onClick={saveMonthEvents}>Save</button>
              <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: '0.78rem' }} onClick={() => setEditingEvents(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setEditingEvents(true)}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>🗓️ Month Events</span>
            {monthEvents
              ? <span style={{ fontSize: '0.81rem', color: 'var(--text2)', flex: 1 }}>{monthEvents}</span>
              : <span style={{ fontSize: '0.81rem', color: 'var(--text3)', fontStyle: 'italic', flex: 1 }}>Click to add events & context for {selectedMonth}…</span>
            }
            <span style={{ fontSize: '0.72rem', color: 'var(--accent)', flexShrink: 0 }}>Edit</span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ padding: '10px 28px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          {promos.length} promotion{promos.length !== 1 ? 's' : ''} · {selectedMonth}
        </span>
        {Object.entries(statusCounts).map(([s, c]) => (
          <span key={s} className={`tag tag-${s}`}>{c} {s}</span>
        ))}
      </div>

      {/* Grid */}
      <main style={{ padding: '20px 28px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
            <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
            <p style={{ marginTop: '14px', fontSize: '0.85rem' }}>Loading promotions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{promos.length === 0 ? `No promotions for ${selectedMonth}` : 'No promotions match filters'}</h3>
            <p style={{ marginBottom: '20px' }}>{promos.length === 0 ? 'Start building your month by adding promotions.' : 'Try adjusting your filters.'}</p>
            {promos.length === 0 && <button className="btn-primary" onClick={() => { setEditPromo(null); setShowForm(true) }}>+ Add First Promotion</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {filtered.map(p => (
              <PromoCard
                key={p.id}
                promo={p}
                onEdit={p => { setEditPromo(p); setShowForm(true) }}
                onKpi={p => setKpiPromo(p)}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showForm && (
        <PromoForm
          promo={editPromo}
          onSave={handleSavePromo}
          onClose={() => { setShowForm(false); setEditPromo(null) }}
        />
      )}
      {kpiPromo && (
        <KpiForm
          promo={promos.find(p => p.id === kpiPromo.id) || kpiPromo}
          onSave={handleSaveKpi}
          onClose={() => setKpiPromo(null)}
          onAnalyse={handleAnalyse}
        />
      )}
      {showReport && (
        <MonthlyReport
          promos={promos}
          month={selectedMonth}
          monthEvents={monthEvents}
          onClose={() => setShowReport(false)}
          onGenerateNarrative={handleMonthlyNarrative}
        />
      )}

      {showAnalysis && (
        <MonthlyAnalysis
          promos={promos}
          month={selectedMonth}
          monthEvents={monthEvents}
          onClose={() => setShowAnalysis(false)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

function buildAnalysisPrompt(p) {
  const roi = p.bonus_cost && p.ngr ? (((Number(p.ngr) - Number(p.bonus_cost)) / Number(p.bonus_cost)) * 100).toFixed(1) : null
  const cpd = p.bonus_cost && p.depositors ? (Number(p.bonus_cost) / Number(p.depositors)).toFixed(0) : null
  const convRate = p.targeted_count && p.depositors ? ((Number(p.depositors) / Number(p.targeted_count)) * 100).toFixed(1) : null
  const bonusGgr = p.bonus_cost && p.ggr ? ((Number(p.bonus_cost) / Number(p.ggr)) * 100).toFixed(1) : null
  const controlConv = p.control_group_count && p.control_group_responders ? ((Number(p.control_group_responders) / Number(p.control_group_count)) * 100).toFixed(1) : null
  const lift = convRate && controlConv ? (Number(convRate) - Number(controlConv)).toFixed(1) : null
  const thresholdStatus = bonusGgr ? (Number(bonusGgr) <= 20 ? '✅ HEALTHY (within 20% target)' : Number(bonusGgr) <= 28 ? '⚠️ BORDERLINE' : '🔴 OVER THRESHOLD') : 'N/A'

  return `You are a senior CRM Analyst at Hepsibahis, online sports betting and casino in the Turkish market.

Analyse this promotion. CRITICAL benchmark: Bonus Cost / GGR must be ≤20%. Flag clearly if breached.

PROMOTION DETAILS:
Name: ${p.name}
Reporting Tag: ${p.reporting_tag || 'N/A'}
Type: ${p.type}${p.subtype ? ' — ' + p.subtype : ''}
Campaign Objective: ${p.campaign_objective || 'N/A'}
Lifecycle Stage: ${p.lifecycle_stage || 'N/A'}
Value Segment: ${p.value_segment || 'N/A'}
Product Preference: ${p.product_preference || 'N/A'}
Period: ${p.start_date || 'N/A'} to ${p.end_date || 'N/A'}
Target Segment: ${p.target_segment || 'N/A'}
Eligible Products: ${p.eligible_products || 'N/A'}
Opt-in Required: ${p.opt_in ? 'Yes' : 'No'}
Offer: ${p.offer_description || 'N/A'}
Reward Type: ${p.reward_type || 'N/A'}
Max Reward Cap: ${p.max_reward_cap ? '₺' + p.max_reward_cap : 'N/A'}
Min Deposit: ${p.min_deposit ? '₺' + p.min_deposit : 'N/A'}
Min Bet Amount: ${p.min_bet_amount ? '₺' + p.min_bet_amount : 'N/A'}
Event Context: ${p.event_context || 'None'}

RESULTS:
Targeted: ${p.targeted_count?.toLocaleString() || 'N/A'}
Opt-ins: ${p.opt_in_count?.toLocaleString() || 'N/A'}
Participants: ${p.participants?.toLocaleString() || 'N/A'}
Depositors: ${p.depositors?.toLocaleString() || 'N/A'}
Conversion Rate: ${convRate ? convRate + '%' : 'N/A'}
Control Group Size: ${p.control_group_count?.toLocaleString() || 'N/A'}
Control Group Responders: ${p.control_group_responders?.toLocaleString() || 'N/A'}
Control Conversion: ${controlConv ? controlConv + '%' : 'N/A'}
Incremental Lift: ${lift ? '+' + lift + 'pp' : 'N/A'}
Deposit Volume: ${p.deposit_volume ? '₺' + Number(p.deposit_volume).toLocaleString() : 'N/A'}
Total Stakes: ${p.total_stakes ? '₺' + Number(p.total_stakes).toLocaleString() : 'N/A'}
Bonus Cost: ${p.bonus_cost ? '₺' + Number(p.bonus_cost).toLocaleString() : 'N/A'}
GGR: ${p.ggr ? '₺' + Number(p.ggr).toLocaleString() : 'N/A'}
NGR: ${p.ngr ? '₺' + Number(p.ngr).toLocaleString() : 'N/A'}
Bonus/GGR Ratio: ${bonusGgr ? bonusGgr + '%' : 'N/A'} — ${thresholdStatus}
ROI: ${roi ? roi + '%' : 'N/A'}
Cost per Depositor: ${cpd ? '₺' + Number(cpd).toLocaleString() : 'N/A'}
Notes: ${p.notes || 'None'}

Write a sharp analysis (max 230 words, no headers, flowing text):
1. Performance verdict — did it meet the 20% Bonus/GGR benchmark?
2. Standout metrics — conversion, incremental lift vs control, cost efficiency
3. Segment/mechanic effectiveness for this lifecycle stage and value tier
4. One clear, actionable recommendation for next iteration`
}
