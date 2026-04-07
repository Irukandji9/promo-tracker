import React, { useState, useEffect } from 'react'

const BONUS_GGR_THRESHOLD = 0.20 // 20% max bonus cost / GGR

function getRatioStatus(bonusCost, ggr) {
  if (!bonusCost || !ggr) return null
  const ratio = Number(bonusCost) / Number(ggr)
  if (ratio <= 0.20) return 'healthy'
  if (ratio <= 0.28) return 'borderline'
  return 'over'
}

const ratioLabels = {
  healthy: { icon: '✅', label: 'Healthy', color: 'var(--success)' },
  borderline: { icon: '⚠️', label: 'Borderline', color: 'var(--warning)' },
  over: { icon: '🔴', label: 'Over Threshold', color: 'var(--danger)' },
}

export default function KpiForm({ promo, onSave, onClose, onAnalyse }) {
  const isOnsite = promo?.type === 'Onsite'

  const [form, setForm] = useState({
    // Shared
    bonus_cost: '',
    ggr: '',
    ngr: '',
    notes: '',
    status: 'completed',
    // Deposit-based (Reload / Promo Code)
    targeted_count: '',
    opt_in_count: '',
    participants: '',
    depositors: '',
    deposit_volume: '',
    total_stakes: '',
    control_group_count: '',
    control_group_responders: '',
    // Onsite / Engagement
    unique_players_engaged: '',
    game_rounds_played: '',
    total_turnover: '',
    avg_session_length: '',
  })
  const [saving, setSaving] = useState(false)
  const [analysing, setAnalysing] = useState(false)

  useEffect(() => {
    if (promo) {
      setForm(f => ({
        ...f,
        bonus_cost: promo.bonus_cost ?? '',
        ggr: promo.ggr ?? '',
        ngr: promo.ngr ?? '',
        notes: promo.notes ?? '',
        status: promo.status === 'planned' ? 'completed' : (promo.status ?? 'completed'),
        targeted_count: promo.targeted_count ?? '',
        opt_in_count: promo.opt_in_count ?? '',
        participants: promo.participants ?? '',
        depositors: promo.depositors ?? '',
        deposit_volume: promo.deposit_volume ?? '',
        total_stakes: promo.total_stakes ?? '',
        control_group_count: promo.control_group_count ?? '',
        control_group_responders: promo.control_group_responders ?? '',
        unique_players_engaged: promo.unique_players_engaged ?? '',
        game_rounds_played: promo.game_rounds_played ?? '',
        total_turnover: promo.total_turnover ?? '',
        avg_session_length: promo.avg_session_length ?? '',
      }))
    }
  }, [promo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fmt = v => v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—'
  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '—'
  const pct = (a, b) => (a && b) ? ((Number(a) / Number(b)) * 100).toFixed(1) + '%' : '—'

  // Computed
  const roi = form.bonus_cost && form.ngr ? (((Number(form.ngr) - Number(form.bonus_cost)) / Number(form.bonus_cost)) * 100).toFixed(1) : null
  const cpd = form.bonus_cost && form.depositors ? (Number(form.bonus_cost) / Number(form.depositors)).toFixed(0) : null
  const avgDeposit = form.deposit_volume && form.depositors ? (Number(form.deposit_volume) / Number(form.depositors)).toFixed(0) : null
  const convRate = form.depositors && form.targeted_count ? ((Number(form.depositors) / Number(form.targeted_count)) * 100).toFixed(1) : null
  const optInRate = form.opt_in_count && form.targeted_count ? ((Number(form.opt_in_count) / Number(form.targeted_count)) * 100).toFixed(1) : null
  const participationRate = form.participants && form.opt_in_count ? ((Number(form.participants) / Number(form.opt_in_count)) * 100).toFixed(1) : null
  const controlConvRate = form.control_group_responders && form.control_group_count ? ((Number(form.control_group_responders) / Number(form.control_group_count)) * 100).toFixed(1) : null
  const incrementalLift = convRate && controlConvRate ? (Number(convRate) - Number(controlConvRate)).toFixed(1) : null
  const bonusGgrRatio = form.bonus_cost && form.ggr ? ((Number(form.bonus_cost) / Number(form.ggr)) * 100).toFixed(1) : null
  const ratioStatus = getRatioStatus(form.bonus_cost, form.ggr)

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...form })
    setSaving(false)
  }

  const handleAnalyse = async () => {
    setAnalysing(true)
    await onAnalyse({ ...promo, ...form })
    setAnalysing(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h2>📊 KPI Results — {promo?.name}</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>
              {promo?.type}{promo?.subtype ? ' · ' + promo.subtype : ''} · {promo?.month}
              {promo?.reporting_tag && <span style={{ fontFamily: 'var(--font-mono)', marginLeft: '8px', color: 'var(--accent)', fontSize: '0.75rem' }}>{promo.reporting_tag}</span>}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* DEPOSIT-BASED KPIs */}
          {!isOnsite && (
            <>
              <div className="section-heading">Participation Funnel</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Targeted</label>
                  <input type="number" placeholder="e.g. 4200" value={form.targeted_count} onChange={e => set('targeted_count', e.target.value)} />
                </div>
                {promo?.opt_in && (
                  <div className="form-group">
                    <label>Opt-ins</label>
                    <input type="number" placeholder="e.g. 980" value={form.opt_in_count} onChange={e => set('opt_in_count', e.target.value)} />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Participants (Completed Mechanic)</label>
                  <input type="number" placeholder="e.g. 620" value={form.participants} onChange={e => set('participants', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Depositors (Responders)</label>
                  <input type="number" placeholder="e.g. 312" value={form.depositors} onChange={e => set('depositors', e.target.value)} />
                </div>
              </div>

              {/* Funnel live preview */}
              {(form.targeted_count || form.opt_in_count || form.participants || form.depositors) && (
                <div className="funnel-bar">
                  {form.targeted_count && <div className="funnel-step"><span className="funnel-n">{fmtN(form.targeted_count)}</span><span className="funnel-label">Targeted</span></div>}
                  {promo?.opt_in && form.opt_in_count && <><div className="funnel-arrow">→</div><div className="funnel-step"><span className="funnel-n">{fmtN(form.opt_in_count)}</span><span className="funnel-label">Opted In {optInRate ? `(${optInRate}%)` : ''}</span></div></>}
                  {form.participants && <><div className="funnel-arrow">→</div><div className="funnel-step"><span className="funnel-n">{fmtN(form.participants)}</span><span className="funnel-label">Participated {participationRate ? `(${participationRate}%)` : ''}</span></div></>}
                  {form.depositors && <><div className="funnel-arrow">→</div><div className="funnel-step" style={{ color: 'var(--success)' }}><span className="funnel-n">{fmtN(form.depositors)}</span><span className="funnel-label">Deposited {convRate ? `(${convRate}%)` : ''}</span></div></>}
                </div>
              )}

              <div className="section-heading" style={{ marginTop: '18px' }}>Control Group</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Control Group Size</label>
                  <input type="number" placeholder="e.g. 500" value={form.control_group_count} onChange={e => set('control_group_count', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Control Group Responders</label>
                  <input type="number" placeholder="e.g. 18" value={form.control_group_responders} onChange={e => set('control_group_responders', e.target.value)} />
                </div>
              </div>
              {controlConvRate && (
                <div className="info-pill">
                  Control conversion: <strong>{controlConvRate}%</strong>
                  {incrementalLift && <> · Incremental lift: <strong style={{ color: Number(incrementalLift) > 0 ? 'var(--success)' : 'var(--danger)' }}>+{incrementalLift}pp</strong></>}
                </div>
              )}

              <div className="section-heading">Volume & Financials</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Deposit Volume (₺)</label>
                  <input type="number" placeholder="e.g. 850000" value={form.deposit_volume} onChange={e => set('deposit_volume', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Total Stakes (₺)</label>
                  <input type="number" placeholder="e.g. 1200000" value={form.total_stakes} onChange={e => set('total_stakes', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ONSITE / ENGAGEMENT KPIs */}
          {isOnsite && (
            <>
              <div className="section-heading">Engagement Metrics</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unique Players Engaged</label>
                  <input type="number" placeholder="e.g. 3400" value={form.unique_players_engaged} onChange={e => set('unique_players_engaged', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Game Rounds Played</label>
                  <input type="number" placeholder="e.g. 84000" value={form.game_rounds_played} onChange={e => set('game_rounds_played', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Turnover (₺)</label>
                  <input type="number" placeholder="e.g. 2400000" value={form.total_turnover} onChange={e => set('total_turnover', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Avg. Session Length (mins)</label>
                  <input type="number" placeholder="e.g. 24" value={form.avg_session_length} onChange={e => set('avg_session_length', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* FINANCIALS — always shown */}
          <div className="section-heading">{isOnsite ? 'Financials' : ''}</div>
          <div className="form-row-3">
            <div className="form-group">
              <label>Bonus Cost (₺)</label>
              <input type="number" placeholder="e.g. 45000" value={form.bonus_cost} onChange={e => set('bonus_cost', e.target.value)} />
            </div>
            <div className="form-group">
              <label>GGR (₺)</label>
              <input type="number" placeholder="e.g. 120000" value={form.ggr} onChange={e => set('ggr', e.target.value)} />
            </div>
            <div className="form-group">
              <label>NGR (₺)</label>
              <input type="number" placeholder="e.g. 75000" value={form.ngr} onChange={e => set('ngr', e.target.value)} />
            </div>
          </div>

          {/* Bonus/GGR threshold indicator */}
          {ratioStatus && (
            <div className={`threshold-banner threshold-${ratioStatus}`}>
              <span>{ratioLabels[ratioStatus].icon} Bonus Cost / GGR: <strong>{bonusGgrRatio}%</strong></span>
              <span style={{ color: ratioLabels[ratioStatus].color, fontWeight: 600 }}>{ratioLabels[ratioStatus].label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Target: ≤20%</span>
            </div>
          )}

          {/* Computed metrics preview */}
          {(roi !== null || cpd !== null || avgDeposit !== null || convRate !== null) && (
            <>
              <div className="section-heading" style={{ marginTop: '16px' }}>Computed Metrics</div>
              <div className="stats-grid">
                {roi !== null && <div className="stat-card"><div className="stat-label">ROI</div><div className={`stat-value ${Number(roi) >= 0 ? 'positive' : 'negative'}`}>{roi}%</div></div>}
                {cpd !== null && <div className="stat-card"><div className="stat-label">Cost / Depositor</div><div className="stat-value">₺{Number(cpd).toLocaleString('tr-TR')}</div></div>}
                {avgDeposit !== null && <div className="stat-card"><div className="stat-label">Avg Deposit</div><div className="stat-value">₺{Number(avgDeposit).toLocaleString('tr-TR')}</div></div>}
                {convRate !== null && <div className="stat-card"><div className="stat-label">Conversion Rate</div><div className="stat-value">{convRate}%</div></div>}
              </div>
            </>
          )}

          <div className="section-heading">Notes & Status</div>
          <div className="form-group">
            <label>Notes / Observations</label>
            <textarea
              placeholder="Any observations, anomalies, or learnings from this promotion..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="analysed">Analysed</option>
            </select>
          </div>

          {promo?.analysis_result && (
            <>
              <div className="section-heading">AI Analysis</div>
              <div className="analysis-box">{promo.analysis_result}</div>
            </>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-analysis" onClick={handleAnalyse} disabled={analysing || !form.bonus_cost}>
            {analysing ? <><span className="spinner" style={{ marginRight: '8px' }} />Analysing…</> : '⚡ Run AI Analysis'}
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save Results'}
          </button>
        </div>
      </div>
    </div>
  )
}
