import React, { useState, useEffect } from 'react'

const PROMO_TYPES = ['Reload', 'Promo Code', 'Onsite']
const ONSITE_SUBTYPES = ['Cashback / Kayıp İade', 'Bet & Get', 'Leaderboard', 'Free Bet / Bedava Bahis', 'Deposit Match', 'Tournament', 'Other']
const CAMPAIGN_OBJECTIVES = ['Retention', 'Reactivation', 'Acquisition', 'Monetisation', 'Engagement']
const LIFECYCLE_STAGES = ['New', 'RND', 'Active', 'Churned', 'Dormant', 'Reactivated', 'VIP']
const VALUE_SEGMENTS = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'All']
const PRODUCT_PREFERENCES = ['Sports', 'Casino', 'Hybrid', 'Live Casino', 'All']
const SEGMENTS = ['All Players', 'Active Sports', 'Active Casino', 'Active Both', 'Lapsed (30d)', 'Lapsed (60d)', 'Lapsed (90d+)', 'VIP', 'New Depositors', 'Non-Depositors', 'High Value', 'Custom']
const ELIGIBLE_PRODUCTS = ['Sports Only', 'Casino Only', 'Sports & Casino', 'Live Casino Only', 'Slots Only', 'All Products']
const REWARD_TYPES = ['Free Bet / Bedava Bahis', 'Bonus Para', 'Free Spins / Bedava Dönüş', 'Cash / Nakit', 'Percentage Cashback', 'Fixed Cashback', 'Multiplier Prize', 'Points']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const currentYear = new Date().getFullYear()

const defaultForm = {
  month: MONTHS[new Date().getMonth()] + ' ' + currentYear,
  name: '',
  type: 'Reload',
  subtype: '',
  campaign_objective: '',
  lifecycle_stage: '',
  value_segment: '',
  product_preference: '',
  reporting_tag: '',
  start_date: '',
  end_date: '',
  target_segment: '',
  opt_in: false,
  promo_code: '',
  offer_description: '',
  reward_type: '',
  reward_value: '',
  max_reward_cap: '',
  min_deposit: '',
  min_bet_amount: '',
  min_odds: '',
  eligible_products: '',
  event_context: '',
  status: 'planned',
}

export default function PromoForm({ promo, onSave, onClose }) {
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (promo) setForm({ ...defaultForm, ...promo })
  }, [promo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('Promotion name is required')
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
              <label>Campaign Objective</label>
              <select value={form.campaign_objective} onChange={e => set('campaign_objective', e.target.value)}>
                <option value="">— Select —</option>
                {CAMPAIGN_OBJECTIVES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Lifecycle Stage</label>
              <select value={form.lifecycle_stage} onChange={e => set('lifecycle_stage', e.target.value)}>
                <option value="">— Select —</option>
                {LIFECYCLE_STAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Value Segmentation</label>
              <select value={form.value_segment} onChange={e => set('value_segment', e.target.value)}>
                <option value="">— Select —</option>
                {VALUE_SEGMENTS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Product Preference</label>
              <select value={form.product_preference} onChange={e => set('product_preference', e.target.value)}>
                <option value="">— Select —</option>
                {PRODUCT_PREFERENCES.map(p => <option key={p}>{p}</option>)}
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
            <input
              placeholder="e.g. Weekend Reload — HV Active Sports"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Promo Type *</label>
              <select value={form.type} onChange={e => { set('type', e.target.value); set('subtype', '') }}>
                {PROMO_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {form.type === 'Onsite' && (
              <div className="form-group">
                <label>Onsite Sub-type</label>
                <select value={form.subtype} onChange={e => set('subtype', e.target.value)}>
                  <option value="">— Select —</option>
                  {ONSITE_SUBTYPES.map(s => <option key={s}>{s}</option>)}
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
              <label>End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="section-heading">Targeting & Eligibility</div>
          <div className="form-row">
            <div className="form-group">
              <label>Target Segment</label>
              <select value={form.target_segment} onChange={e => set('target_segment', e.target.value)}>
                <option value="">— Select —</option>
                {SEGMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Eligible Products</label>
              <select value={form.eligible_products} onChange={e => set('eligible_products', e.target.value)}>
                <option value="">— Select —</option>
                {ELIGIBLE_PRODUCTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input type="checkbox" checked={form.opt_in} onChange={e => set('opt_in', e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">Opt-in Required</span>
          </div>

          <div className="section-heading">Offer Mechanic</div>
          <div className="form-group">
            <label>Offer Description</label>
            <textarea
              placeholder="e.g. Deposit min ₺200 and get 25% match up to ₺500 as Bonus Para..."
              value={form.offer_description}
              onChange={e => set('offer_description', e.target.value)}
            />
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
              <label>Reward Value (₺ or %)</label>
              <input type="number" placeholder="e.g. 500" value={form.reward_value} onChange={e => set('reward_value', e.target.value)} />
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
              <label>Min. Odds (if applicable)</label>
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
            <textarea
              placeholder="e.g. Süper Lig Derby weekend, Galatasaray vs Fenerbahçe on Day 2. High expected traffic."
              value={form.event_context}
              onChange={e => set('event_context', e.target.value)}
              style={{ minHeight: '64px' }}
            />
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
