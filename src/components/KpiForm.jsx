import React, { useState, useEffect } from 'react'

function getRatioStatus(bonusCost, ggr) {
  if (!bonusCost || !ggr) return null
  const r = (Number(bonusCost) / Number(ggr)) * 100
  if (r <= 20) return { status: 'healthy', icon: '✅', label: 'Healthy', color: 'var(--success)' }
  if (r <= 28) return { status: 'borderline', icon: '⚠️', label: 'Borderline', color: 'var(--warning)' }
  return { status: 'over', icon: '🔴', label: 'Over Threshold', color: 'var(--danger)' }
}

export default function KpiForm({ promo, onSave, onClose, onAnalyse }) {
  const type = promo?.type || 'Ad-Hoc'
  const isOnsite = type === 'Ad-Hoc' // Ad-Hoc onsite promos use engagement metrics
  const isDepositBased = type === 'Reload' || type === 'Funnel' || type === 'Promo Code'
  const hasControlGroup = type === 'Reload' || type === 'Funnel'
  const hasDepositors = type !== 'Ad-Hoc'

  const [form, setForm] = useState({
    targeted_count: '', opt_in_count: '', participants: '', depositors: '',
    control_group_count: '', control_group_responders: '',
    deposit_volume: '', total_stakes: '',
    game_rounds_played: '', total_turnover: '',
    bonus_cost: '', ggr: '', ngr: '', notes: '',
    status: 'completed',
  })
  const [saving, setSaving] = useState(false)
  const [analysing, setAnalysing] = useState(false)

  useEffect(() => {
    if (promo) {
      setForm(f => ({
        ...f,
        targeted_count: promo.targeted_count ?? '',
        opt_in_count: promo.opt_in_count ?? '',
        participants: promo.participants ?? '',
        depositors: promo.depositors ?? '',
        control_group_count: promo.control_group_count ?? '',
        control_group_responders: promo.control_group_responders ?? '',
        deposit_volume: promo.deposit_volume ?? '',
        total_stakes: promo.total_stakes ?? '',
        game_rounds_played: promo.game_rounds_played ?? '',
        total_turnover: promo.total_turnover ?? '',
        bonus_cost: promo.bonus_cost ?? '',
        ggr: promo.ggr ?? '',
        ngr: promo.ngr ?? '',
        notes: promo.notes ?? '',
        status: promo.status === 'planned' ? 'completed' : (promo.status ?? 'completed'),
      }))
    }
  }, [promo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '—'
  const fmt = v => v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—'

  // Computed
  const bonusGgr = form.bonus_cost && form.ggr ? ((Number(form.bonus_cost) / Number(form.ggr)) * 100).toFixed(1) : null
  const ratioInfo = getRatioStatus(form.bonus_cost, form.ggr)
  const roi = form.bonus_cost && form.ngr ? (((Number(form.ngr) - Number(form.bonus_cost)) / Number(form.bonus_cost)) * 100).toFixed(1) : null
  const convRate = form.depositors && form.targeted_count ? ((Number(form.depositors) / Number(form.targeted_count)) * 100).toFixed(1) : null
  const optInRate = form.opt_in_count && form.targeted_count ? ((Number(form.opt_in_count) / Number(form.targeted_count)) * 100).toFixed(1) : null
  const partRate = form.participants && form.opt_in_count ? ((Number(form.participants) / Number(form.opt_in_count)) * 100).toFixed(1) : null
  const controlConv = form.control_group_responders && form.control_group_count ? ((Number(form.control_group_responders) / Number(form.control_group_count)) * 100).toFixed(1) : null
  const lift = convRate && controlConv ? (Number(convRate) - Number(controlConv)).toFixed(1) : null
  const cpd = form.bonus_cost && form.depositors ? (Number(form.bonus_cost) / Number(form.depositors)).toFixed(0) : null
  const avgTurnover = form.total_turnover && form.participants ? (Number(form.total_turnover) / Number(form.participants)).toFixed(0) : null

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
              {promo?.domain} · {promo?.type}{promo?.subtype ? ' · ' + promo.subtype : ''} · {promo?.month}
              {promo?.reporting_tag && <span style={{ fontFamily: 'var(--font-mono)', marginLeft: '8px', color: 'var(--accent)', fontSize: '0.73rem' }}>{promo.reporting_tag}</span>}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* PARTICIPATION */}
          <div className="section-heading">Participation</div>
          <div className="form-row">
            <div className="form-group">
              <label>Total Targeted {type === 'Ad-Hoc' || type === 'Promo Code' ? '(optional)' : ''}</label>
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
              <label>Participants {type === 'Ad-Hoc' ? '(unique players engaged)' : '(completed mechanic)'}</label>
              <input type="number" placeholder="e.g. 620" value={form.participants} onChange={e => set('participants', e.target.value)} />
            </div>
            {hasDepositors && (
              <div className="form-group">
                <label>Depositors</label>
                <input type="number" placeholder="e.g. 312" value={form.depositors} onChange={e => set('depositors', e.target.value)} />
              </div>
            )}
          </div>

          {/* Funnel visual */}
          {(form.targeted_count || form.opt_in_count || form.participants || form.depositors) && (
            <div className="funnel-bar">
              {form.targeted_count && <div className="funnel-step"><span className="funnel-n">{fmtN(form.targeted_count)}</span><span className="funnel-label">Targeted</span></div>}
              {promo?.opt_in && form.opt_in_count && <><div className="funnel-arrow">→</div><div className="funnel-step"><span className="funnel-n">{fmtN(form.opt_in_count)}</span><span className="funnel-label">Opted In{optInRate ? ` (${optInRate}%)` : ''}</span></div></>}
              {form.participants && <><div className="funnel-arrow">→</div><div className="funnel-step"><span className="funnel-n">{fmtN(form.participants)}</span><span className="funnel-label">Participated{partRate ? ` (${partRate}%)` : ''}</span></div></>}
              {form.depositors && <><div className="funnel-arrow">→</div><div className="funnel-step" style={{ color: 'var(--success)' }}><span className="funnel-n">{fmtN(form.depositors)}</span><span className="funnel-label">Deposited{convRate ? ` (${convRate}%)` : ''}</span></div></>}
            </div>
          )}

          {/* CONTROL GROUP — Reload & Funnel only */}
          {hasControlGroup && (
            <>
              <div className="section-heading" style={{ marginTop: '16px' }}>Control Group</div>
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
              {controlConv && (
                <div className="info-pill">
                  Control conversion: <strong>{controlConv}%</strong>
                  {lift && <> · Incremental lift: <strong style={{ color: Number(lift) > 0 ? 'var(--success)' : 'var(--danger)' }}>+{lift}pp</strong></>}
                </div>
              )}
            </>
          )}

          {/* VOLUME — deposit based */}
          {isDepositBased && (
            <>
              <div className="section-heading">Volume</div>
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

          {/* ENGAGEMENT — Ad-Hoc onsite */}
          {type === 'Ad-Hoc' && (
            <>
              <div className="section-heading">Engagement</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Game Rounds Played (casino)</label>
                  <input type="number" placeholder="e.g. 84000" value={form.game_rounds_played} onChange={e => set('game_rounds_played', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Total Turnover (₺)</label>
                  <input type="number" placeholder="e.g. 2400000" value={form.total_turnover} onChange={e => set('total_turnover', e.target.value)} />
                </div>
              </div>
              {avgTurnover && (
                <div className="info-pill">Avg turnover per participant: <strong>₺{Number(avgTurnover).toLocaleString('tr-TR')}</strong></div>
              )}
            </>
          )}

          {/* FINANCIALS */}
          <div className="section-heading">Financials</div>
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

          {/* Threshold */}
          {ratioInfo && (
            <div className={`threshold-banner threshold-${ratioInfo.status}`}>
              <span>{ratioInfo.icon} Bonus Cost / GGR: <strong>{bonusGgr}%</strong></span>
              <span style={{ color: ratioInfo.color, fontWeight: 600 }}>{ratioInfo.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Target ≤20%</span>
            </div>
          )}

          {/* Computed */}
          {(roi !== null || cpd !== null || convRate !== null) && (
            <>
              <div className="section-heading" style={{ marginTop: '14px' }}>Computed Metrics</div>
              <div className="stats-grid">
                {roi !== null && <div className="stat-card"><div className="stat-label">ROI</div><div className={`stat-value ${Number(roi) >= 0 ? 'positive' : 'negative'}`}>{roi}%</div></div>}
                {cpd !== null && <div className="stat-card"><div className="stat-label">Cost / Depositor</div><div className="stat-value">₺{Number(cpd).toLocaleString('tr-TR')}</div></div>}
                {convRate !== null && <div className="stat-card"><div className="stat-label">Conversion Rate</div><div className="stat-value">{convRate}%</div></div>}
                {avgTurnover !== null && <div className="stat-card"><div className="stat-label">Avg Turnover/Player</div><div className="stat-value">₺{Number(avgTurnover).toLocaleString('tr-TR')}</div></div>}
              </div>
            </>
          )}

          <div className="section-heading">Notes & Status</div>
          <div className="form-group">
            <label>Notes / Observations</label>
            <textarea placeholder="Observations, anomalies, learnings..." value={form.notes} onChange={e => set('notes', e.target.value)} />
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
