import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import PromoForm from './components/PromoForm'
import KpiForm from './components/KpiForm'
import MonthlyAnalysis from './components/MonthlyAnalysis'
import FunnelUpload from './components/FunnelUpload'
import FunnelDashboard from './components/FunnelDashboard'
import ReloadUpload from './components/ReloadUpload'
import ReloadDashboard from './components/ReloadDashboard'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const currentYear = new Date().getFullYear()
const ALL_MONTHS = MONTHS.map(m => `${m} ${currentYear}`)
const TABS = ['Overview', 'Ad-Hoc', 'Promo Code', 'Reload', 'Funnel']
const DOMAINS = ['All', 'Hepsibahis', 'MrOyun', 'UWIN']
const TYPE_COLORS = { 'Ad-Hoc': '#e8a020', 'Promo Code': '#16a34a', 'Reload': '#1a6ef5', 'Funnel': '#7c3aed' }

function fmt(v) { return v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—' }
function fmtN(v) { return v ? Number(v).toLocaleString('tr-TR') : '—' }
function bGgrColor(cost, ggr) {
  if (!cost || !ggr) return 'var(--text3)'
  const r = (Number(cost) / Number(ggr)) * 100
  return r <= 20 ? 'var(--success)' : r <= 28 ? 'var(--warning)' : 'var(--danger)'
}
function bGgrVal(cost, ggr) {
  if (!cost || !ggr) return '—'
  return ((Number(cost) / Number(ggr)) * 100).toFixed(1) + '%'
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [])
  return <div className={`toast ${type}`}>{msg}</div>
}

function StatusTag({ status }) {
  return <span className={`tag tag-${status}`}>{status}</span>
}

function TypeTag({ type }) {
  const colors = {
    'Ad-Hoc': { bg: 'rgba(232,160,32,0.1)', color: '#854f0b', border: 'rgba(232,160,32,0.25)' },
    'Promo Code': { bg: 'rgba(22,163,74,0.1)', color: '#166534', border: 'rgba(22,163,74,0.25)' },
    'Reload': { bg: 'rgba(26,110,245,0.1)', color: '#1a6ef5', border: 'rgba(26,110,245,0.25)' },
    'Funnel': { bg: 'rgba(124,58,237,0.1)', color: '#5b21b6', border: 'rgba(124,58,237,0.25)' },
  }
  const c = colors[type] || { bg: 'var(--bg3)', color: 'var(--text2)', border: 'var(--border)' }
  return <span className="tag" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{type}</span>
}

export default function App({ session }) {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[new Date().getMonth()])
  const [activeTab, setActiveTab] = useState('Overview')
  const [domainFilter, setDomainFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editPromo, setEditPromo] = useState(null)
  const [kpiPromo, setKpiPromo] = useState(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [toast, setToast] = useState(null)
  const [monthEvents, setMonthEvents] = useState('')
  const [editingEvents, setEditingEvents] = useState(false)
  const [eventsMap, setEventsMap] = useState({})
  const [expandedRow, setExpandedRow] = useState(null)
  const [showFunnelUpload, setShowFunnelUpload] = useState(false)
  const [showReloadUpload, setShowReloadUpload] = useState(false)
  const [reloadRefreshKey, setReloadRefreshKey] = useState(0)
  const [funnelRefreshKey, setFunnelRefreshKey] = useState(0)
  const [funnelData, setFunnelData] = useState([])
  const [reloadData, setReloadData] = useState([])

  const notify = (msg, type = 'success') => setToast({ msg, type })

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

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

  const fetchReloadData = useCallback(async () => {
    const { data } = await supabase.from('reload_daily').select('*').order('range_start', { ascending: false }).limit(10000)
    if (data) setReloadData(data)
  }, [])

  const fetchFunnelData = useCallback(async () => {
    const { data } = await supabase
      .from('funnel_daily')
      .select('*')
      .order('data_date', { ascending: false })
    if (data) setFunnelData(data)
  }, [])

  useEffect(() => { fetchReloadData() }, [fetchReloadData])
  useEffect(() => { fetchFunnelData() }, [fetchFunnelData])

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

  // Filter by domain
  const domainFiltered = domainFilter === 'All' ? promos : promos.filter(p => p.domain === domainFilter)

  // Tab filtered
  const tabPromos = activeTab === 'Overview' ? domainFiltered : domainFiltered.filter(p => p.type === activeTab)

  // SAVE
  const handleSavePromo = async (form) => {
    const payload = { ...form }
    const nullIfEmpty = ['reward_value', 'max_reward_cap', 'min_deposit', 'min_bet_amount']
    nullIfEmpty.forEach(k => { if (!payload[k]) payload[k] = null })
    if (editPromo && !editPromo._isDuplicate) {
      const { error } = await supabase.from('promotions').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editPromo.id)
      if (error) { notify('Error: ' + error.message, 'error'); return }
      notify('Promotion updated ✓')
    } else {
      const { error } = await supabase.from('promotions').insert([payload])
      if (error) { notify('Error: ' + error.message, 'error'); return }
      notify('Promotion created ✓')
    }
    setShowForm(false); setEditPromo(null); fetchPromos()
  }

  // DUPLICATE
  const handleDuplicate = (promo) => {
    const { id, created_at, updated_at, analysis_result,
      bonus_cost, ggr, ngr, participants, depositors, deposit_volume,
      total_stakes, targeted_count, opt_in_count, control_group_count,
      control_group_responders, game_rounds_played, total_turnover, notes, ...rest } = promo
    setEditPromo({ ...rest, start_date: '', end_date: '', status: 'planned', _isDuplicate: true })
    setShowForm(true)
    notify('Duplicated — update dates and save')
  }

  // SAVE KPIs
  const handleSaveKpi = async (form) => {
    const fields = {
      participants: form.participants || null, depositors: form.depositors || null,
      deposit_volume: form.deposit_volume || null, total_stakes: form.total_stakes || null,
      bonus_cost: form.bonus_cost || null, ggr: form.ggr || null, ngr: form.ngr || null,
      notes: form.notes || null, status: form.status,
      targeted_count: form.targeted_count || null, opt_in_count: form.opt_in_count || null,
      control_group_count: form.control_group_count || null,
      control_group_responders: form.control_group_responders || null,
      game_rounds_played: form.game_rounds_played || null,
      total_turnover: form.total_turnover || null,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase.from('promotions').update(fields).eq('id', kpiPromo.id)
    if (error) { notify('Error: ' + error.message, 'error'); return }
    notify('KPI results saved ✓')
    setKpiPromo(null); fetchPromos()
  }

  // DELETE
  const handleDelete = async (id) => {
    if (!confirm('Delete this promotion?')) return
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) { notify('Error: ' + error.message, 'error'); return }
    notify('Deleted')
    fetchPromos()
  }

  // AI ANALYSIS
  const handleAnalyse = async (promoData) => {
    const type = promoData.type || 'Ad-Hoc'
    const hasControl = type === 'Reload' || type === 'Funnel'
    const roi = promoData.bonus_cost && promoData.ngr ? (((Number(promoData.ngr) - Number(promoData.bonus_cost)) / Number(promoData.bonus_cost)) * 100).toFixed(1) : null
    const conv = promoData.depositors && promoData.targeted_count ? ((Number(promoData.depositors) / Number(promoData.targeted_count)) * 100).toFixed(1) : null
    const bonusGgr = promoData.bonus_cost && promoData.ggr ? ((Number(promoData.bonus_cost) / Number(promoData.ggr)) * 100).toFixed(1) : null
    const ctrlConv = promoData.control_group_count && promoData.control_group_responders ? ((Number(promoData.control_group_responders) / Number(promoData.control_group_count)) * 100).toFixed(1) : null
    const lift = conv && ctrlConv ? (Number(conv) - Number(ctrlConv)).toFixed(1) : null
    const threshold = bonusGgr ? (Number(bonusGgr) <= 20 ? '✅ HEALTHY' : Number(bonusGgr) <= 28 ? '⚠️ BORDERLINE' : '🔴 OVER THRESHOLD') : 'N/A'

    const prompt = `You are a senior CRM Analyst at ${promoData.domain || 'Hepsibahis'}, online sports betting and casino in the Turkish market.
Analyse this promotion. Critical benchmark: Bonus Cost / GGR ≤ 20%.

PROMOTION:
Name: ${promoData.name} | Type: ${promoData.type}${promoData.subtype ? ' — ' + promoData.subtype : ''} | Domain: ${promoData.domain}
Objective: ${promoData.campaign_objective || 'N/A'} | Lifecycle: ${promoData.lifecycle_stage || 'N/A'} | Value: ${promoData.value_segment || 'N/A'} | Product: ${promoData.product_preference || 'N/A'}
Period: ${promoData.start_date || 'N/A'}${promoData.ongoing ? ' (Ongoing)' : promoData.end_date ? ' to ' + promoData.end_date : ''}
Offer: ${promoData.offer_description || 'N/A'} | Reward: ${promoData.reward_type || 'N/A'} ${promoData.reward_value || ''}${promoData.reward_unit || ''} | Max Cap: ${promoData.max_reward_cap ? '₺' + promoData.max_reward_cap : 'N/A'}
Min Deposit: ${promoData.min_deposit ? '₺' + promoData.min_deposit : 'N/A'} | Min Bet: ${promoData.min_bet_amount ? '₺' + promoData.min_bet_amount : 'N/A'} | Opt-in: ${promoData.opt_in ? 'Yes' : 'No'}
Event Context: ${promoData.event_context || 'None'}

RESULTS:
Targeted: ${fmtN(promoData.targeted_count)} | Opt-ins: ${fmtN(promoData.opt_in_count)} | Participants: ${fmtN(promoData.participants)} | Depositors: ${fmtN(promoData.depositors)}
Conversion: ${conv ? conv + '%' : 'N/A'}${hasControl ? ` | Control Conv: ${ctrlConv ? ctrlConv + '%' : 'N/A'} | Lift: ${lift ? '+' + lift + 'pp' : 'N/A'}` : ''}
Deposit Volume: ${fmt(promoData.deposit_volume)} | Stakes: ${fmt(promoData.total_stakes)}
Bonus Cost: ${fmt(promoData.bonus_cost)} | GGR: ${fmt(promoData.ggr)} | NGR: ${fmt(promoData.ngr)}
Bonus/GGR: ${bonusGgr ? bonusGgr + '%' : 'N/A'} — ${threshold} | ROI: ${roi ? roi + '%' : 'N/A'}
Notes: ${promoData.notes || 'None'}

Write a sharp commercial analysis (max 220 words, no headers, flowing text):
1. Performance verdict — did it meet the 20% benchmark?
2. Key metrics — conversion, efficiency, incremental lift if available
3. Segment/mechanic effectiveness
4. One clear recommendation for next iteration`

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const text = data.result || 'Analysis unavailable.'
      await supabase.from('promotions').update({ analysis_result: text, status: 'analysed', updated_at: new Date().toISOString() }).eq('id', promoData.id)
      setKpiPromo(prev => prev ? { ...prev, analysis_result: text, status: 'analysed' } : null)
      notify('AI analysis complete ✓')
      fetchPromos()
    } catch (e) {
      notify('Analysis failed: ' + e.message, 'error')
    }
  }

  // CSV EXPORT — previous month
  const handleExportCSV = (type) => {
    const dl = (csv, name) => {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const pct = (a, b) => (a > 0 && b > 0) ? ((a / b) * 100).toFixed(1) + '%' : ''
    const liftPP = (tR, tT, cR, cT) => (!tT || !cT) ? '' : (((tR/tT) - (cR/cT)) * 100).toFixed(1) + 'pp'

    if (type === 'reload') {
      const headers = ['Date', 'Segment', 'Value', 'Targeted', 'Responders', 'Conv %', 'Ctrl Conv %', 'Conv vs Control']
      const rows = reloadData.filter(r => !r.is_reminder).map(r => [
        r.data_date || '',
        `${r.lifecycle} ${r.product}`,
        r.value_segment || '',
        r.targeted_customers || 0,
        r.targeted_responders || 0,
        pct(r.targeted_responders, r.targeted_customers),
        pct(r.control_responders, r.control_customers),
        liftPP(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers),
      ].join(','))
      dl([headers.join(','), ...rows].join('\n'), `reload-data-${selectedMonth.replace(' ', '-')}.csv`)
      return
    }

    if (type === 'funnel') {
      const headers = ['Date', 'Funnel', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl Conv %', 'Conv vs Control']
      // Aggregate per date+label
      const dateLabels = []
      const dates = [...new Set(funnelData.map(r => r.data_date))].sort()
      dates.forEach(date => {
        const labels = [...new Set(funnelData.filter(r => r.data_date === date).map(r => r.funnel_label))].sort()
        labels.forEach(label => {
          const rows = funnelData.filter(r => r.data_date === date && r.funnel_label === label)
          const tot = rows.reduce((a, r) => ({ t: a.t+(r.targeted_customers||0), c: a.c+(r.control_customers||0), r: a.r+(r.targeted_responders||0), cr: a.cr+(r.control_responders||0) }), {t:0,c:0,r:0,cr:0})
          dateLabels.push([date, label, tot.t, tot.c, tot.r, pct(tot.r, tot.t), pct(tot.cr, tot.c), liftPP(tot.r, tot.t, tot.cr, tot.c)].join(','))
        })
      })
      dl([headers.join(','), ...dateLabels].join('\n'), `funnel-data-${selectedMonth.replace(' ', '-')}.csv`)
      return
    }

    // Promos (Ad-Hoc + Promo Code)
    const exportPromos = domainFilter === 'All' ? promos : promos.filter(p => p.domain === domainFilter)
    const headers = ['Date','Name','Domain','Type','Reporting Tag','Reward Type','Trigger Type','Targeted','Depositors','Bonus Cost','GGR','B/GGR %','NGR','Status']
    const rows = exportPromos.map(p => {
      const bggr = p.bonus_cost && p.ggr ? ((Number(p.bonus_cost)/Number(p.ggr))*100).toFixed(1)+'%' : ''
      return [p.start_date||'', `"${(p.name||'').replace(/"/g,'""')}"`, p.domain||'', p.type||'', p.reporting_tag||'', p.reward_type||'', p.trigger_type||'', p.targeted_count||'', p.depositors||'', p.bonus_cost||'', p.ggr||'', bggr, p.ngr||'', p.status||''].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `promos-${selectedMonth.replace(' ', '-')}-${domainFilter}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify('CSV exported ✓')
  }

  const statusCounts = tabPromos.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, background: 'rgba(245,245,247,0.96)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            PROMO<span style={{ color: 'var(--accent)' }}>TRACK</span>
          </span>
          <span style={{ fontSize: '0.67rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '10px', borderLeft: '1px solid var(--border)' }}>Hepsibahis CRM</span>
        </div>
        <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
          <button className="btn-analysis" style={{ padding: '7px 14px', fontSize: '0.8rem' }} onClick={() => setShowAnalysis(true)} disabled={promos.length === 0}>🧠 Monthly Analysis</button>
          <button className="btn-primary" onClick={() => { setEditPromo(null); setShowForm(true) }}>+ New Promo</button>
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 2px' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text3)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.email}</span>
          <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* MONTH SELECTOR */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '10px 24px', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>{currentYear}</span>
        {ALL_MONTHS.map(m => (
          <button key={m} onClick={() => setSelectedMonth(m)} style={{
            padding: '4px 11px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 500,
            border: '1px solid', cursor: 'pointer', transition: 'all 0.12s',
            background: selectedMonth === m ? 'var(--accent)' : 'transparent',
            borderColor: selectedMonth === m ? 'var(--accent)' : 'var(--border)',
            color: selectedMonth === m ? '#fff' : 'var(--text2)',
          }}>
            {m.split(' ')[0].slice(0, 3)}
          </button>
        ))}
      </div>

      {/* DOMAIN FILTER */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Domain</span>
        {DOMAINS.map(d => (
          <button key={d} onClick={() => setDomainFilter(d)} style={{
            padding: '3px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 500,
            border: '1px solid', cursor: 'pointer', transition: 'all 0.12s',
            background: domainFilter === d ? '#1a6ef5' : 'transparent',
            borderColor: domainFilter === d ? '#1a6ef5' : 'var(--border)',
            color: domainFilter === d ? '#fff' : 'var(--text2)',
          }}>
            {d}
          </button>
        ))}
      </div>

      {/* EVENTS BAR */}
      <div style={{ background: domainFilter === 'All' ? '#fffdf0' : 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '7px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {editingEvents ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flex: 1 }}>
            <textarea value={monthEvents} onChange={e => setMonthEvents(e.target.value)}
              placeholder="Log key events — Süper Lig fixtures, holidays, competitor activity..."
              style={{ flex: 1, minHeight: '48px', fontSize: '0.8rem' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button className="btn-primary" style={{ padding: '5px 12px', fontSize: '0.76rem' }} onClick={saveMonthEvents}>Save</button>
              <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: '0.76rem' }} onClick={() => setEditingEvents(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }} onClick={() => setEditingEvents(true)}>
            <span style={{ fontSize: '0.68rem', color: '#854f0b', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>🗓 {selectedMonth.split(' ')[0]} Events</span>
            {monthEvents
              ? <span style={{ fontSize: '0.8rem', color: '#854f0b', flex: 1 }}>{monthEvents}</span>
              : <span style={{ fontSize: '0.8rem', color: 'var(--text3)', fontStyle: 'italic', flex: 1 }}>Click to add events & context…</span>}
            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', flexShrink: 0 }}>Edit</span>
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', gap: '0' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 16px', fontSize: '0.82rem', fontWeight: activeTab === tab ? 600 : 400,
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === tab ? `2px solid ${tab === 'Overview' ? 'var(--accent)' : TYPE_COLORS[tab] || 'var(--accent)'}` : '2px solid transparent',
            color: activeTab === tab ? (tab === 'Overview' ? 'var(--accent)' : TYPE_COLORS[tab]) : 'var(--text2)',
            marginBottom: '-1px', transition: 'all 0.12s',
          }}>
            {tab === 'Overview' ? '📊 ' : ''}{tab}
            <span style={{ marginLeft: '5px', fontSize: '0.68rem', background: 'var(--bg3)', padding: '1px 6px', borderRadius: '10px', color: 'var(--text3)' }}>
              {tab === 'Overview' ? domainFiltered.length : domainFiltered.filter(p => p.type === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <main style={{ padding: '16px 24px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
            <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
            <p style={{ marginTop: '14px', fontSize: '0.85rem' }}>Loading…</p>
          </div>
        ) : activeTab === 'Funnel' ? (
          /* FUNNEL DASHBOARD — always shown, handles its own empty state */
          <FunnelDashboard key={funnelRefreshKey} onUpload={() => setShowFunnelUpload(true)} />
        ) : activeTab === 'Reload' ? (
          /* RELOAD DASHBOARD — always shown, handles its own empty state */
          <ReloadDashboard key={reloadRefreshKey} onUpload={() => setShowReloadUpload(true)} />
        ) : tabPromos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>{promos.length === 0 ? `No promotions for ${selectedMonth}` : `No ${activeTab} promotions`}</h3>
            <p style={{ marginBottom: '20px' }}>Start by adding a promotion.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {activeTab === 'Funnel' && (
                <button className="btn-analysis" onClick={() => setShowFunnelUpload(true)}>📡 Upload Optimove CSV</button>
              )}
              <button className="btn-primary" onClick={() => { setEditPromo(null); setShowForm(true) }}>+ Add Promotion</button>
            </div>
          </div>
        ) : activeTab === 'Overview' ? (
          /* OVERVIEW TABLE */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{tabPromos.length} promotion{tabPromos.length !== 1 ? 's' : ''}</span>
                {Object.entries(statusCounts).map(([s, c]) => <span key={s} className={`tag tag-${s}`}>{c} {s}</span>)}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => handleExportCSV('promos')}>⬇ Promos CSV</button>
                <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => handleExportCSV('reload')}>⬇ Reload CSV</button>
                <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => handleExportCSV('funnel')}>⬇ Funnel CSV</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)' }}>
                    {['Date','Promotion','Domain','Type','Targeted','Depositors','Bonus Cost','GGR','B/GGR','NGR','Status',''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', color: 'var(--text2)', fontWeight: 500, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabPromos.map(p => {
                    const isExpanded = expandedRow === p.id
                    const days = p.start_date && p.end_date ? Math.ceil((new Date(p.end_date) - new Date(p.start_date)) / 86400000) + 1 : null
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isExpanded ? 'rgba(26,110,245,0.03)' : 'transparent', transition: 'background 0.1s' }}
                          onMouseEnter={e => !isExpanded && (e.currentTarget.style.background = 'var(--bg3)')}
                          onMouseLeave={e => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                          onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                        >
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                            {p.start_date ? p.start_date.slice(0, 10) : '—'}
                            {p.ongoing && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text3)' }}>Ongoing</span>}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: '200px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text2)' }}>{p.domain || '—'}</td>
                          <td style={{ padding: '10px 12px' }}><TypeTag type={p.type} /></td>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmtN(p.targeted_count)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmtN(p.depositors)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--danger)' }}>{fmt(p.bonus_cost)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmt(p.ggr)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: bGgrColor(p.bonus_cost, p.ggr) }}>{bGgrVal(p.bonus_cost, p.ggr)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: p.ngr > 0 ? 'var(--success)' : p.ngr < 0 ? 'var(--danger)' : 'var(--text)' }}>{fmt(p.ngr)}</td>
                          <td style={{ padding: '10px 12px' }}><StatusTag status={p.status} /></td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>{isExpanded ? '▲' : '▼'}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <td colSpan={12} style={{ padding: '12px 16px', background: 'rgba(26,110,245,0.02)' }}>
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                {p.offer_description && (
                                  <div style={{ flex: 2, minWidth: '200px', fontSize: '0.8rem', color: 'var(--text2)', borderLeft: '2px solid var(--border)', paddingLeft: '10px' }}>
                                    {p.offer_description}
                                  </div>
                                )}
                                {p.event_context && (
                                  <div style={{ flex: 1, minWidth: '140px', fontSize: '0.78rem', color: '#854f0b', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', padding: '6px 10px' }}>
                                    🗓 {p.event_context}
                                  </div>
                                )}
                                {p.analysis_result && (
                                  <div style={{ flex: 2, minWidth: '200px', fontSize: '0.78rem', color: '#0369a1', background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '6px', padding: '6px 10px' }}>
                                    ⚡ {p.analysis_result.slice(0, 200)}{p.analysis_result.length > 200 ? '…' : ''}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'flex-start' }}>
                                  <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={e => { e.stopPropagation(); setEditPromo(p); setShowForm(true) }}>Edit</button>
                                  <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={e => { e.stopPropagation(); handleDuplicate(p) }}>⧉ Copy</button>
                                  <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={e => { e.stopPropagation(); setKpiPromo(p) }}>📊 KPIs</button>
                                  <button className="btn-danger" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={e => { e.stopPropagation(); handleDelete(p.id) }}>✕</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* RELOAD & FUNNEL SUMMARY IN OVERVIEW */}
            <ReloadOverviewSection reloadData={reloadData} />
            <FunnelOverviewSection funnelData={funnelData} />
          </>
        ) : (
          /* TYPE TAB — card grid */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{tabPromos.length} promotion{tabPromos.length !== 1 ? 's' : ''}</span>
                {Object.entries(statusCounts).map(([s, c]) => <span key={s} className={`tag tag-${s}`}>{c} {s}</span>)}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {activeTab === 'Funnel' && (
                  <button className="btn-analysis" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={() => setShowFunnelUpload(true)}>
                    📡 Upload Optimove CSV
                  </button>
                )}
                {activeTab === 'Reload' && (
                  <button className="btn-analysis" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={() => setShowReloadUpload(true)}>
                    🔄 Upload Reload CSV
                  </button>
                )}
                <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '7px 14px' }} onClick={() => { setEditPromo(null); setShowForm(true) }}>+ New {activeTab}</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {tabPromos.map(p => <PromoCardCompact key={p.id} promo={p} onEdit={() => { setEditPromo(p); setShowForm(true) }} onKpi={() => setKpiPromo(p)} onDelete={() => handleDelete(p.id)} onDuplicate={() => handleDuplicate(p)} />)}
            </div>

          </>
        )}
      </main>

      {/* MODALS */}
      {showForm && <PromoForm promo={editPromo} onSave={handleSavePromo} onClose={() => { setShowForm(false); setEditPromo(null) }} />}
      {kpiPromo && <KpiForm promo={promos.find(p => p.id === kpiPromo.id) || kpiPromo} onSave={handleSaveKpi} onClose={() => setKpiPromo(null)} onAnalyse={handleAnalyse} />}
      {showAnalysis && <MonthlyAnalysis promos={promos} month={selectedMonth} monthEvents={monthEvents} domainFilter={domainFilter} onClose={() => setShowAnalysis(false)} />}
      {showFunnelUpload && <FunnelUpload onClose={() => { setShowFunnelUpload(false); setFunnelRefreshKey(k => k + 1) }} onSuccess={() => {}} />}
      {showReloadUpload && <ReloadUpload onClose={() => { setShowReloadUpload(false); setReloadRefreshKey(k => k + 1) }} onSuccess={() => {}} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

// Compact card for type tabs
function PromoCardCompact({ promo, onEdit, onKpi, onDelete, onDuplicate }) {
  const fmt = v => v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—'
  const hasKpis = promo.bonus_cost || promo.depositors || promo.participants
  const bonusGgr = promo.bonus_cost && promo.ggr ? ((Number(promo.bonus_cost) / Number(promo.ggr)) * 100).toFixed(1) : null
  const ratioColor = bonusGgr ? (Number(bonusGgr) <= 20 ? 'var(--success)' : Number(bonusGgr) <= 28 ? 'var(--warning)' : 'var(--danger)') : null
  const ratioIcon = bonusGgr ? (Number(bonusGgr) <= 20 ? '✅' : Number(bonusGgr) <= 28 ? '⚠️' : '🔴') : null

  return (
    <div className="card" style={{ transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3, marginBottom: '5px' }}>{promo.name}</div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <span className={`tag tag-${promo.status}`}>{promo.status}</span>
            {promo.domain && <span style={{ fontSize: '0.7rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: '4px' }}>{promo.domain}</span>}
            {promo.lifecycle_stage && <span style={{ fontSize: '0.7rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: '4px' }}>{promo.lifecycle_stage}</span>}
            {promo.value_segment && <span style={{ fontSize: '0.7rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: '4px' }}>{promo.value_segment}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={onDuplicate} title="Duplicate">⧉</button>
          <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={onEdit}>Edit</button>
          <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={onDelete}>✕</button>
        </div>
      </div>

      <div style={{ fontSize: '0.76rem', color: 'var(--text2)', marginBottom: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {promo.start_date && <span>📅 {promo.start_date}{promo.ongoing ? ' → ongoing' : promo.end_date ? ` → ${promo.end_date}` : ''}</span>}
        {promo.reporting_tag && <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>{promo.reporting_tag}</span>}
        {promo.promo_code && <span className="mono" style={{ color: 'var(--accent2)', fontSize: '0.7rem' }}>{promo.promo_code}</span>}
      </div>

      {promo.offer_description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '8px', borderLeft: '2px solid var(--border)', paddingLeft: '8px', lineHeight: 1.5 }}>
          {promo.offer_description}
        </p>
      )}

      {hasKpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px', marginBottom: '8px' }}>
          {promo.depositors && <div style={{ background: 'var(--bg3)', borderRadius: '5px', padding: '6px 8px' }}><div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Depositors</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{Number(promo.depositors).toLocaleString()}</div></div>}
          {promo.bonus_cost && <div style={{ background: 'var(--bg3)', borderRadius: '5px', padding: '6px 8px' }}><div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase' }}>Bonus Cost</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--danger)' }}>{fmt(promo.bonus_cost)}</div></div>}
          {promo.ngr && <div style={{ background: 'var(--bg3)', borderRadius: '5px', padding: '6px 8px' }}><div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase' }}>NGR</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: Number(promo.ngr) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(promo.ngr)}</div></div>}
          {bonusGgr && <div style={{ background: 'var(--bg3)', borderRadius: '5px', padding: '6px 8px' }}><div style={{ fontSize: '0.6rem', color: 'var(--text3)', textTransform: 'uppercase' }}>B/GGR</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: ratioColor }}>{ratioIcon} {bonusGgr}%</div></div>}
        </div>
      )}

      {promo.event_context && (
        <div style={{ fontSize: '0.74rem', color: '#854f0b', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '5px', padding: '5px 8px', marginBottom: '8px' }}>🗓 {promo.event_context}</div>
      )}
      {promo.analysis_result && (
        <div style={{ fontSize: '0.74rem', color: '#0369a1', background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '5px', padding: '5px 8px', marginBottom: '8px' }}>
          ⚡ {promo.analysis_result.slice(0, 140)}{promo.analysis_result.length > 140 ? '…' : ''}
        </div>
      )}

      <button className="btn-secondary" style={{ width: '100%', fontSize: '0.78rem', padding: '7px' }} onClick={onKpi}>
        {hasKpis ? '📊 Update KPI Results' : '📊 Enter KPI Results'}
      </button>
    </div>
  )
}


// Reload summary for Overview tab
function ReloadOverviewSection({ reloadData }) {
  if (!reloadData || reloadData.length === 0) return null

  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '0'
  const pct = (a, b) => (a > 0 && b > 0) ? ((a / b) * 100).toFixed(1) + '%' : '—'
  const liftPP = (tR, tT, cR, cT) => {
    if (!tT || !cT) return null
    return ((tR / tT) - (cR / cT)) * 100
  }

  const VALUE_ORDER = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'EV', '']
  const dates = [...new Set(reloadData.map(r => r.data_date).filter(Boolean))].sort().reverse()
  const recentDates = dates.slice(0, 3)
  if (!recentDates.length) return null

  const rows = recentDates.flatMap(date =>
    reloadData
      .filter(r => r.data_date === date)
      .sort((a, b) => {
        const lc = (a.lifecycle || '').localeCompare(b.lifecycle || '')
        if (lc !== 0) return lc
        return VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment)
      }).map(r => ({ ...r, _date: date }))
  )

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="section-heading" style={{ margin: 0 }}>🔄 Reload — Recent {recentDates.length} Days</div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{dates.length} day{dates.length !== 1 ? 's' : ''} uploaded</span>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg3)' }}>
              {['Date', 'Segment', 'Value', 'Targeted', 'Responders', 'Conv %', 'Ctrl Conv %', 'Conv vs Control'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const liftVal = liftPP(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{r._date}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{r.lifecycle} {r.product}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.value_segment ? <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', fontWeight: 700 }}>{r.value_segment}</span> : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.targeted_customers)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmtN(r.targeted_responders)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{pct(r.targeted_responders, r.targeted_customers)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{pct(r.control_responders, r.control_customers)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: liftVal === null ? 'var(--text3)' : liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FunnelOverviewSection({ funnelData }) {
  if (!funnelData || funnelData.length === 0) return null

  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '0'
  const pct = (a, b) => (a > 0 && b > 0) ? ((a / b) * 100).toFixed(1) + '%' : '—'
  const liftPP = (tR, tT, cR, cT) => {
    if (!tT || !cT) return null
    return ((tR / tT) - (cR / cT)) * 100
  }

  const dates = [...new Set(funnelData.map(r => r.data_date))].sort().reverse()
  const recentDates = dates.slice(0, 3)

  const agg = (rows) => rows.reduce((acc, r) => ({
    targeted: acc.targeted + (r.targeted_customers || 0),
    control: acc.control + (r.control_customers || 0),
    responders: acc.responders + (r.targeted_responders || 0),
    ctrl_resp: acc.ctrl_resp + (r.control_responders || 0),
  }), { targeted: 0, control: 0, responders: 0, ctrl_resp: 0 })

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="section-heading" style={{ margin: 0 }}>📡 Funnel — Recent {recentDates.length} Days</div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{dates.length} total upload{dates.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg3)' }}>
              {['Date', 'Funnel', 'Targeted', 'Control', 'Responders', 'Conv %', 'Ctrl Conv %', 'Conv vs Control'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentDates.map(date => {
              const dateRows = funnelData.filter(r => r.data_date === date)
              const labels = [...new Set(dateRows.map(r => r.funnel_label))].sort()
              return labels.map((label) => {
                const tot = agg(dateRows.filter(r => r.funnel_label === label))
                const liftVal = liftPP(tot.responders, tot.targeted, tot.ctrl_resp, tot.control)
                return (
                  <tr key={`${date}-${label}`} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{date}</td>
                    <td style={{ padding: '7px 12px', fontWeight: 500, fontSize: '0.75rem' }}>{label}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)' }}>{fmtN(tot.targeted)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{fmtN(tot.control)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmtN(tot.responders)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{pct(tot.responders, tot.targeted)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{pct(tot.ctrl_resp, tot.control)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: liftVal === null ? 'var(--text3)' : liftVal > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
