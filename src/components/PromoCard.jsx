import React from 'react'

function fmt(v) {
  if (v === null || v === undefined || v === '') return null
  return `₺${Number(v).toLocaleString('tr-TR')}`
}

function getRatioStatus(bonusCost, ggr) {
  if (!bonusCost || !ggr) return null
  const ratio = Number(bonusCost) / Number(ggr)
  if (ratio <= 0.20) return { icon: '✅', label: 'Healthy', color: 'var(--success)' }
  if (ratio <= 0.28) return { icon: '⚠️', label: 'Borderline', color: 'var(--warning)' }
  return { icon: '🔴', label: 'Over Threshold', color: 'var(--danger)' }
}

export default function PromoCard({ promo, onEdit, onKpi, onDelete, onDuplicate }) {
  const hasKpis = promo.bonus_cost || promo.depositors || promo.unique_players_engaged
  const roi = promo.bonus_cost && promo.ngr
    ? (((Number(promo.ngr) - Number(promo.bonus_cost)) / Number(promo.bonus_cost)) * 100).toFixed(1)
    : null
  const ratioStatus = getRatioStatus(promo.bonus_cost, promo.ggr)
  const bonusGgrRatio = promo.bonus_cost && promo.ggr
    ? ((Number(promo.bonus_cost) / Number(promo.ggr)) * 100).toFixed(1)
    : null

  const typeClass = promo.type === 'Reload' ? 'reload'
    : promo.type === 'Promo Code' ? 'promoCode'
    : 'onsite'

  const days = promo.start_date && promo.end_date
    ? Math.ceil((new Date(promo.end_date) - new Date(promo.start_date)) / 86400000) + 1
    : null

  return (
    <div className="card promo-card"
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '5px', lineHeight: 1.3 }}>
            {promo.name}
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`tag tag-${typeClass}`}>{promo.subtype || promo.type}</span>
            <span className={`tag tag-${promo.status}`}>{promo.status}</span>
            {promo.campaign_objective && <span className="tag tag-obj">{promo.campaign_objective}</span>}
            {promo.opt_in && <span className="tag tag-optin">Opt-in</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <button className="btn-ghost" style={{ padding: '5px 9px', fontSize: '0.72rem' }} onClick={() => onDuplicate(promo)} title="Duplicate">⧉</button>
          <button className="btn-ghost" style={{ padding: '5px 9px', fontSize: '0.72rem' }} onClick={() => onEdit(promo)}>Edit</button>
          <button className="btn-danger" style={{ padding: '5px 9px', fontSize: '0.72rem' }} onClick={() => onDelete(promo.id)}>✕</button>
        </div>
      </div>

      {/* Context pills */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--text2)' }}>
        {promo.lifecycle_stage && <span style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px' }}>📍 {promo.lifecycle_stage}</span>}
        {promo.value_segment && <span style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px' }}>💎 {promo.value_segment}</span>}
        {promo.product_preference && <span style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: '4px' }}>🎮 {promo.product_preference}</span>}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px', fontSize: '0.77rem', color: 'var(--text2)' }}>
        {promo.start_date && <span>📅 {promo.start_date}{promo.end_date ? ` → ${promo.end_date}` : ''}{days ? ` (${days}d)` : ''}</span>}
        {promo.target_segment && <span>🎯 {promo.target_segment}</span>}
        {promo.reporting_tag && <span className="mono" style={{ color: 'var(--accent)', background: 'rgba(26,110,245,0.07)', padding: '1px 7px', borderRadius: '4px', fontSize: '0.72rem' }}>{promo.reporting_tag}</span>}
        {promo.promo_code && <span className="mono" style={{ color: 'var(--accent2)', background: 'rgba(255,107,53,0.07)', padding: '1px 7px', borderRadius: '4px' }}>{promo.promo_code}</span>}
      </div>

      {/* Offer */}
      {promo.offer_description && (
        <p style={{ fontSize: '0.81rem', color: 'var(--text2)', marginBottom: '10px', lineHeight: 1.5, borderLeft: '2px solid var(--border)', paddingLeft: '10px' }}>
          {promo.offer_description}
        </p>
      )}

      {/* Reward mechanic pills */}
      {(promo.reward_type || promo.max_reward_cap || promo.min_deposit || promo.min_bet_amount) && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {promo.reward_type && <span className="tag" style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--success)', border: '1px solid rgba(22,163,74,0.2)', fontSize: '0.7rem' }}>{promo.reward_type}</span>}
          {promo.max_reward_cap && <span className="tag" style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', fontSize: '0.7rem' }}>Max {fmt(promo.max_reward_cap)}</span>}
          {promo.min_deposit && <span className="tag" style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', fontSize: '0.7rem' }}>Min dep. {fmt(promo.min_deposit)}</span>}
          {promo.min_bet_amount && <span className="tag" style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', fontSize: '0.7rem' }}>Min bet {fmt(promo.min_bet_amount)}</span>}
        </div>
      )}

      {/* KPI summary */}
      {hasKpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '7px', marginBottom: '10px' }}>
          {promo.depositors && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Depositors</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{Number(promo.depositors).toLocaleString('tr-TR')}</div>
            </div>
          )}
          {promo.unique_players_engaged && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engaged</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px' }}>{Number(promo.unique_players_engaged).toLocaleString('tr-TR')}</div>
            </div>
          )}
          {promo.bonus_cost && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus Cost</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: 'var(--danger)' }}>{fmt(promo.bonus_cost)}</div>
            </div>
          )}
          {promo.ngr && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NGR</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: Number(promo.ngr) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(promo.ngr)}</div>
            </div>
          )}
          {roi !== null && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '7px 10px' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ROI</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', marginTop: '2px', color: Number(roi) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{roi}%</div>
            </div>
          )}
        </div>
      )}

      {/* Bonus/GGR threshold badge */}
      {ratioStatus && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg3)', border: '1px solid var(--border)', marginBottom: '10px', fontSize: '0.78rem' }}>
          <span>{ratioStatus.icon}</span>
          <span style={{ color: 'var(--text2)' }}>Bonus/GGR:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: ratioStatus.color }}>{bonusGgrRatio}%</span>
          <span style={{ color: ratioStatus.color, fontSize: '0.72rem' }}>({ratioStatus.label})</span>
          <span style={{ color: 'var(--text3)', fontSize: '0.7rem', marginLeft: 'auto' }}>Target ≤20%</span>
        </div>
      )}

      {/* Event context */}
      {promo.event_context && (
        <div style={{ fontSize: '0.76rem', color: 'var(--text2)', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: '6px', padding: '7px 10px', marginBottom: '10px' }}>
          🗓️ {promo.event_context}
        </div>
      )}

      {/* Analysis snippet */}
      {promo.analysis_result && (
        <div style={{ fontSize: '0.76rem', color: '#0369a1', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)', borderRadius: '6px', padding: '7px 10px', marginBottom: '10px', lineHeight: 1.5 }}>
          ⚡ {promo.analysis_result.slice(0, 160)}{promo.analysis_result.length > 160 ? '…' : ''}
        </div>
      )}

      {/* Action */}
      <div style={{ marginTop: 'auto' }}>
        <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }} onClick={() => onKpi(promo)}>
          {hasKpis ? '📊 Update KPI Results' : '📊 Enter KPI Results'}
        </button>
      </div>
    </div>
  )
}
