import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import PromoForm from './components/PromoForm'
import KpiForm from './components/KpiForm'
import PromoCard from './components/PromoCard'
import MonthlyReport from './components/MonthlyReport'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const currentYear = new Date().getFullYear()
const ALL_MONTHS = MONTHS.map(m => `${m} ${currentYear}`)

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t)
  }, [])
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
  const [toast, setToast] = useState(null)
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

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

  // SAVE / CREATE
  const handleSavePromo = async (form) => {
    const payload = { ...form }
    if (!payload.reward_value) payload.reward_value = null
    if (!payload.min_deposit) payload.min_deposit = null

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

  // SAVE KPIs
  const handleSaveKpi = async (form) => {
    const { error } = await supabase.from('promotions').update({
      participants: form.participants || null,
      depositors: form.depositors || null,
      deposit_volume: form.deposit_volume || null,
      total_stakes: form.total_stakes || null,
      bonus_cost: form.bonus_cost || null,
      ggr: form.ggr || null,
      ngr: form.ngr || null,
      notes: form.notes || null,
      status: form.status,
      updated_at: new Date().toISOString()
    }).eq('id', kpiPromo.id)
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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.map(b => b.text || '').join('') || 'Analysis unavailable.'

      // Save to DB
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
  const handleMonthlyNarrative = async ({ promos, totals, month, overallRoi }) => {
    const prompt = `You are a senior CRM Analyst at an online sports betting and casino company operating in the Turkish market (brand: Hepsibahis). 
    
Write a concise, professional executive summary of the promotional performance for ${month}. 
The audience is the Head of CRM and senior management.

Total promotions run: ${promos.length}
Total targeted players: ${totals.participants?.toLocaleString() || 'N/A'}
Total depositors: ${totals.depositors?.toLocaleString() || 'N/A'}
Total deposit volume: ₺${totals.deposit_volume?.toLocaleString() || 'N/A'}
Total bonus cost: ₺${totals.bonus_cost?.toLocaleString() || 'N/A'}
Total GGR: ₺${totals.ggr?.toLocaleString() || 'N/A'}
Total NGR: ₺${totals.ngr?.toLocaleString() || 'N/A'}
Overall ROI: ${overallRoi || 'N/A'}%

Individual promotions:
${promos.map(p => `- ${p.name} (${p.type}): ${p.depositors || 0} depositors, bonus cost ₺${p.bonus_cost || 0}, NGR ₺${p.ngr || 0}`).join('\n')}

Write 3-4 concise paragraphs: 
1. Overall performance summary with key metrics
2. Standout promotions (best and worst performers)  
3. Key insights and patterns observed
4. Recommendations for next month

Be direct, data-driven and commercially focused. Use ₺ for currency. Keep it under 350 words.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      return data.content?.map(b => b.text || '').join('') || 'Summary unavailable.'
    } catch (e) {
      return 'Error generating summary: ' + e.message
    }
  }

  // Filtered promos
  const filtered = promos.filter(p => {
    if (filterType !== 'All' && p.type !== filterType) return false
    if (filterStatus !== 'All' && p.status !== filterStatus) return false
    return true
  })

  const statusCounts = promos.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '62px',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
              PROMO<span style={{ color: 'var(--accent)' }}>TRACK</span>
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text3)', marginLeft: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CRM Analytics</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setShowReport(true)} disabled={promos.length === 0}>
            📋 Monthly Report
          </button>
          <button className="btn-primary" onClick={() => { setEditPromo(null); setShowForm(true) }}>
            + New Promo
          </button>
        </div>
      </header>

      {/* Month selector + filters */}
      <div style={{ padding: '20px 32px 0', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ALL_MONTHS.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              style={{
                padding: '5px 13px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 500,
                border: '1px solid',
                background: selectedMonth === m ? 'rgba(232,255,71,0.1)' : 'transparent',
                borderColor: selectedMonth === m ? 'rgba(232,255,71,0.4)' : 'var(--border)',
                color: selectedMonth === m ? 'var(--accent)' : 'var(--text2)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {m.split(' ')[0].slice(0, 3)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}>
            <option>All</option>
            <option>Reload</option>
            <option>Promo Code</option>
            <option>Onsite</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}>
            <option>All</option>
            <option>planned</option>
            <option>active</option>
            <option>completed</option>
            <option>analysed</option>
          </select>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '12px 32px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
          {promos.length} promotion{promos.length !== 1 ? 's' : ''} in {selectedMonth}
        </span>
        {Object.entries(statusCounts).map(([s, c]) => (
          <span key={s} className={`tag tag-${s}`}>{c} {s}</span>
        ))}
      </div>

      {/* Grid */}
      <main style={{ padding: '8px 32px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
            <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
            <p style={{ marginTop: '14px', fontSize: '0.85rem' }}>Loading promotions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{promos.length === 0 ? `No promotions for ${selectedMonth}` : 'No promotions match filters'}</h3>
            <p style={{ marginBottom: '20px' }}>{promos.length === 0 ? 'Pre-fill your month by adding promotions to the calendar.' : 'Try adjusting your filters.'}</p>
            {promos.length === 0 && <button className="btn-primary" onClick={() => { setEditPromo(null); setShowForm(true) }}>+ Add First Promotion</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', marginTop: '4px' }}>
            {filtered.map(p => (
              <PromoCard
                key={p.id}
                promo={p}
                onEdit={p => { setEditPromo(p); setShowForm(true) }}
                onKpi={p => setKpiPromo(p)}
                onDelete={handleDelete}
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
          onClose={() => setShowReport(false)}
          onGenerateNarrative={handleMonthlyNarrative}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

function buildAnalysisPrompt(p) {
  const roi = p.bonus_cost && p.ngr
    ? (((Number(p.ngr) - Number(p.bonus_cost)) / Number(p.bonus_cost)) * 100).toFixed(1)
    : null
  const cpd = p.bonus_cost && p.depositors
    ? (Number(p.bonus_cost) / Number(p.depositors)).toFixed(0)
    : null
  const convRate = p.participants && p.depositors
    ? ((Number(p.depositors) / Number(p.participants)) * 100).toFixed(1)
    : null

  return `You are a senior CRM Analyst at Hepsibahis, an online sports betting and casino brand in the Turkish market.

Analyse this promotion and give a sharp, commercial assessment:

PROMOTION: ${p.name}
Type: ${p.type}${p.subtype ? ' — ' + p.subtype : ''}
Period: ${p.start_date || 'N/A'} to ${p.end_date || 'N/A'}
Target Segment: ${p.target_segment || 'N/A'}
Eligible Products: ${p.eligible_products || 'N/A'}
Opt-in Required: ${p.opt_in ? 'Yes' : 'No'}
Offer: ${p.offer_description || 'N/A'}
Reward Type: ${p.reward_type || 'N/A'}
Min Deposit: ${p.min_deposit ? '₺' + p.min_deposit : 'N/A'}

RESULTS:
Recipients/Targeted: ${p.participants?.toLocaleString() || 'N/A'}
Depositors: ${p.depositors?.toLocaleString() || 'N/A'}
Conversion Rate: ${convRate ? convRate + '%' : 'N/A'}
Total Deposit Volume: ${p.deposit_volume ? '₺' + Number(p.deposit_volume).toLocaleString() : 'N/A'}
Total Stakes: ${p.total_stakes ? '₺' + Number(p.total_stakes).toLocaleString() : 'N/A'}
Bonus Cost: ${p.bonus_cost ? '₺' + Number(p.bonus_cost).toLocaleString() : 'N/A'}
GGR: ${p.ggr ? '₺' + Number(p.ggr).toLocaleString() : 'N/A'}
NGR: ${p.ngr ? '₺' + Number(p.ngr).toLocaleString() : 'N/A'}
ROI: ${roi ? roi + '%' : 'N/A'}
Cost per Depositor: ${cpd ? '₺' + Number(cpd).toLocaleString() : 'N/A'}
Notes: ${p.notes || 'None'}

Provide a concise analysis (max 220 words) covering:
1. Performance verdict (was this a good promotion?)
2. Key metrics that stand out (positive or concerning)  
3. Segment/mechanic effectiveness
4. One clear recommendation for future iterations

Be direct and commercially focused. Use ₺ for currency. No headers, flowing text only.`
}
