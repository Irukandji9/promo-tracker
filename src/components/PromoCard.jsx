import React from 'react'

function fmt(v) {
  if (v === null || v === undefined || v === '') return null
  return `₺${Number(v).toLocaleString('tr-TR')}`
}

export default function PromoCard({ promo, onEdit, onKpi, onDelete }) {
  const hasKpis = promo.bonus_cost || promo.depositors
  const roi = promo.bonus_cost && promo.ngr
    ? (((Number(promo.ngr) - Number(promo.bonus_cost)) / Number(promo.bonus_cost)) * 100).toFixed(1)
    : null

  const typeClass = promo.type === 'Reload' ? 'reload'
    : promo.type === 'Promo Code' ? 'promoCode'
    : 'onsite'

  const days = promo.start_date && promo.end_date
    ? Math.ceil((new Date(promo.end_date) - new Date(promo.start_date)) / 86400000) + 1
    : null

  return (
    <div className="card promo-card" style={{ position: 'relative', transition: 'border-color 0.15s', cursor: 'default' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '5px', lineHeight: 1.3 }}>
            {promo.name}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`tag tag-${typeClass}`}>{promo.subtype || promo.type}</span>
            <span className={`tag tag-${promo.status}`}>{promo.status}</span>
            {promo.opt_in && <span className="tag" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.2)' }}>Opt-in</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => onEdit(promo)}>Edit</button>
          <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => onDelete(promo.id)}>✕</button>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text2)' }}>
        {promo.start_date && (
          <span>📅 {promo.start_date}{promo.end_date ? ` → ${promo.end_date}` : ''}{days ? ` (${days}d)` : ''}</span>
        )}
        {promo.target_segment && <span>🎯 {promo.target_segment}</span>}
        {promo.promo_code && <span className="mono" style={{ color: 'var(--accent)', background: 'rgba(232,255,71,0.07)', padding: '1px 7px', borderRadius: '4px' }}>{promo.promo_code}</span>}
        {promo.eligible_products && <span>🎮 {promo.eligible_products}</span>}
      </div>

      {/* Offer description */}
      {promo.offer_description && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.5, borderLeft: '2px solid var(--border)', paddingLeft: '10px' }}>
          {promo.offer_description}
        </p>
      )}

      {/* KPI summary if exists */}
      {hasKpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {promo.depositors && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Depositors</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '2px' }}>{Number(promo.depositors).toLocaleString('tr-TR')}</div>
            </div>
          )}
          {promo.bonus_cost && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus Cost</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '2px', color: 'var(--danger)' }}>{fmt(promo.bonus_cost)}</div>
            </div>
          )}
          {promo.ngr && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NGR</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '2px', color: Number(promo.ngr) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(promo.ngr)}</div>
            </div>
          )}
          {roi !== null && (
            <div style={{ background: 'var(--bg3)', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ROI</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '2px', color: Number(roi) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{roi}%</div>
            </div>
          )}
        </div>
      )}

      {/* Analysis snippet */}
      {promo.analysis_result && (
        <div style={{ fontSize: '0.78rem', color: '#0369a1', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', lineHeight: 1.5 }}>
          ⚡ {promo.analysis_result.slice(0, 180)}{promo.analysis_result.length > 180 ? '…' : ''}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button className="btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }} onClick={() => onKpi(promo)}>
          {hasKpis ? '📊 Update KPIs' : '📊 Enter KPI Results'}
        </button>
      </div>
    </div>
  )
}
