import React, { useState, useEffect } from 'react'

export default function KpiForm({ promo, onSave, onClose, onAnalyse }) {
  const [form, setForm] = useState({
    participants: '',
    depositors: '',
    deposit_volume: '',
    total_stakes: '',
    bonus_cost: '',
    ggr: '',
    ngr: '',
    notes: '',
    status: 'completed',
  })
  const [saving, setSaving] = useState(false)
  const [analysing, setAnalysing] = useState(false)

  useEffect(() => {
    if (promo) {
      setForm({
        participants: promo.participants ?? '',
        depositors: promo.depositors ?? '',
        deposit_volume: promo.deposit_volume ?? '',
        total_stakes: promo.total_stakes ?? '',
        bonus_cost: promo.bonus_cost ?? '',
        ggr: promo.ggr ?? '',
        ngr: promo.ngr ?? '',
        notes: promo.notes ?? '',
        status: promo.status === 'planned' ? 'completed' : promo.status,
      })
    }
  }, [promo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fmt = v => v ? `₺${Number(v).toLocaleString('tr-TR')}` : '—'

  // Computed metrics
  const roi = form.bonus_cost && form.ngr
    ? (((Number(form.ngr) - Number(form.bonus_cost)) / Number(form.bonus_cost)) * 100).toFixed(1)
    : null
  const cpd = form.bonus_cost && form.depositors
    ? (Number(form.bonus_cost) / Number(form.depositors)).toFixed(0)
    : null
  const avgDeposit = form.deposit_volume && form.depositors
    ? (Number(form.deposit_volume) / Number(form.depositors)).toFixed(0)
    : null

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...form, status: form.status })
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
              {promo?.type} · {promo?.month}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          <div className="section-heading">Participation</div>
          <div className="form-row">
            <div className="form-group">
              <label>Total Recipients / Targeted</label>
              <input type="number" placeholder="e.g. 4200" value={form.participants} onChange={e => set('participants', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Depositors (Responders)</label>
              <input type="number" placeholder="e.g. 312" value={form.depositors} onChange={e => set('depositors', e.target.value)} />
            </div>
          </div>

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

          {/* Live computed preview */}
          {(roi !== null || cpd !== null || avgDeposit !== null) && (
            <>
              <div className="section-heading">Computed Metrics (Live Preview)</div>
              <div className="stats-grid" style={{ marginBottom: '16px' }}>
                {roi !== null && (
                  <div className="stat-card">
                    <div className="stat-label">ROI</div>
                    <div className={`stat-value ${Number(roi) >= 0 ? 'positive' : 'negative'}`}>{roi}%</div>
                  </div>
                )}
                {cpd !== null && (
                  <div className="stat-card">
                    <div className="stat-label">Cost / Depositor</div>
                    <div className="stat-value">₺{Number(cpd).toLocaleString('tr-TR')}</div>
                  </div>
                )}
                {avgDeposit !== null && (
                  <div className="stat-card">
                    <div className="stat-label">Avg Deposit</div>
                    <div className="stat-value">₺{Number(avgDeposit).toLocaleString('tr-TR')}</div>
                  </div>
                )}
                {form.depositors && form.participants && (
                  <div className="stat-card">
                    <div className="stat-label">Conversion Rate</div>
                    <div className="stat-value">{((form.depositors / form.participants) * 100).toFixed(1)}%</div>
                  </div>
                )}
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

          {/* Analysis result */}
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
