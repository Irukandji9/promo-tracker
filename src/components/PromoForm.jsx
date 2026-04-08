import React, { useState, useEffect } from 'react'

const DOMAINS = ['Hepsibahis', 'MrOyun', 'UWIN']
const PROMO_TYPES = ['Ad-Hoc', 'Promo Code', 'Reload', 'Funnel']
const SUBTYPES = ['Cashback', 'Bet & Get', 'Leaderboard', 'Tournament', 'Deposit & Get']
const OBJECTIVES = ['Reactivation', 'Acquisition']
const LIFECYCLE = ['New', 'RND', 'Active', 'Churned', 'Dormant', 'Reactivated', 'VIP', 'OTD']
const VALUE_SEGMENTS = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'Onsite', 'All']
const PRODUCT_PREFS = ['Sport', 'Casino', 'Hybrid', 'All']
const REWARD_TYPES = ['Free Bet', 'Free Spins', 'VEFA Coins', 'Casino Bonus', 'Cash']
const REWARD_UNITS = ['₺', '%', 'Count']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const currentYear = new Date().getFullYear()

const defaultForm = {
  month: MONTHS[new Date().getMonth()] + ' ' + currentYear,
  domain: '',
  name: '',
  type: 'Ad-Hoc',
  subtype: '',
  promo_code: '',
  campaign_objective: '',
  lifecycle_stage: '',
  value_segment: '',
  product_preference: '',
  reporting_tag: '',
  start_date: '',
  end_date: '',
  ongoing: false,
  opt_in: false,
  offer_description: '',
  reward_type: '',
  reward_value: '',
  reward_unit: '₺',
  max_reward_cap: '',
  min_deposit: '',
  min_bet_amount: '',
  min_odds: '',
  event_context: '',
  status: 'planned',
}

const showSubtype = (type) => type === 'Ad-Hoc' || type === 'Promo Code'

export default function PromoForm({ promo, onSave, onClose }) {
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (promo) setForm({ ...defaultForm, ...promo })
  }, [promo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('Promotion name is required')
    if (!form.domain) return alert('Domain is required')
    if (!form.start_date) return alert('Start date is required')
    if (!form.reporting_tag.trim()) return alert('Reporting tag is required')
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>{promo ? '✏️ Edit Promotion' : '➕ New Promotion'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          <div className="section-heading">Strategic Context</div>
          <div className="form-row">
            <div className="form-group">
              <label>Domain *</label>
              <select value={form.domain} onChange={e => set('domain', e.target.value)}>
                <option value="">— Select —</option>
                {DOMAINS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Campaign Objective</label>
              <select value={form.campaign_objective} onChange={e => set('campaign_objective', e.target.value)}>
                <option value="">— Select —</option>
                {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label>Lifecycle Stage</label>
              <select value={form.lifecycle_stage} onChange={e => set('lifecycle_stage', e.target.value)}>
                <option value="">— Select —</option>
                {LIFECYCLE.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Value Segment</label>
              <select value={form.value_segment} onChange={e => set('value_segment', e.target.value)}>
                <option value="">— Select —</option>
                {VALUE_SEGMENTS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Product Preference</label>
              <select value={form.product_preference} onChange={e => set('product_preference', e.target.value)}>
                <option value="">— Select —</option>
                {PRODUCT_PREFS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="section-heading">Promotion Details</div>
          <div className="form-row">
            <div className="form-group">
              <label>Month</label>
              <select value={form.month} onChange={e => set('month', e.target.value)}>
                {MONTHS.map(m => <option key={m} value={`${m} ${currentYear}`}>{m} {currentYear}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Reporting Tag *</label>
              <input
                placeholder="e.g. TR_R_ACT_HV_APR"
                value={form.reporting_tag}
                onChange={e => set('reporting_tag', e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Promotion Name *</label>
            <input placeholder="e.g. Weekend Reload — HV Active Sports" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Promo Type *</label>
              <select value={form.type} onChange={e => { set('type', e.target.value); set('subtype', '') }}>
                {PROMO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {showSubtype(form.type) && (
              <div className="form-group">
                <label>Sub-type</label>
                <select value={form.subtype} onChange={e => set('subtype', e.target.value)}>
                  <option value="">— Select —</option>
                  {SUBTYPES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            {form.type === 'Promo Code' && (
              <div className="form-group">
                <label>Promo Code</label>
                <input
                  placeholder="e.g. RELOAD25"
                  value={form.promo_code}
                  onChange={e => set('promo_code', e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                />
              </div>
            )}
          </div>

          <div className="section-heading">Schedule</div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date {form.ongoing ? '(Ongoing)' : ''}</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} disabled={form.ongoing} style={{ opacity: form.ongoing ? 0.4 : 1 }} />
            </div>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={form.ongoing} onChange={e => { set('ongoing', e.target.checked); if (e.target.checked) set('end_date', '') }} />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">Ongoing (no end date)</span>
          </div>

          <div className="section-heading">Offer Mechanic</div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={form.opt_in} onChange={e => set('opt_in', e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">Opt-in Required</span>
          </div>
          <div className="form-group">
            <label>Offer Description</label>
            <textarea placeholder="e.g. Deposit min ₺200 and get 25% match up to ₺500 as Casino Bonus..." value={form.offer_description} onChange={e => set('offer_description', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Reward Type</label>
              <select value={form.reward_type} onChange={e => set('reward_type', e.target.value)}>
                <option value="">— Select —</option>
                {REWARD_TYPES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Reward Value</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="number" placeholder="e.g. 500" value={form.reward_value} onChange={e => set('reward_value', e.target.value)} style={{ flex: 1 }} />
                <select value={form.reward_unit} onChange={e => set('reward_unit', e.target.value)} style={{ width: '80px' }}>
                  {REWARD_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label>Max Reward Cap (₺)</label>
              <input type="number" placeholder="e.g. 1000" value={form.max_reward_cap} onChange={e => set('max_reward_cap', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Min. Deposit (₺)</label>
              <input type="number" placeholder="e.g. 200" value={form.min_deposit} onChange={e => set('min_deposit', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Min. Bet Amount (₺)</label>
              <input type="number" placeholder="e.g. 50" value={form.min_bet_amount} onChange={e => set('min_bet_amount', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Min. Odds</label>
              <input placeholder="e.g. 1.50" value={form.min_odds} onChange={e => set('min_odds', e.target.value)} />
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
          </div>

          <div className="section-heading">Event Context</div>
          <div className="form-group">
            <label>Special Events / Context During This Promotion</label>
            <textarea placeholder="e.g. Süper Lig Derby weekend, Galatasaray vs Fenerbahçe on Day 2..." value={form.event_context} onChange={e => set('event_context', e.target.value)} style={{ minHeight: '60px' }} />
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="spinner" /> : (promo ? 'Save Changes' : 'Create Promotion')}
          </button>
        </div>
      </div>
    </div>
  )
}
