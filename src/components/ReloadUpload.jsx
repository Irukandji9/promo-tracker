import React, { useState, useRef } from 'react'
import { supabase } from '../supabase'

const REQUIRED_COLS = ['Target Group', 'Targeted Customers', 'Control Customers', 'Targeted Responders', 'Control Responders']

function detectSeparator(text) {
  const firstLine = text.split('\n')[0]
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return semicolons > commas ? ';' : ','
}

function parseNum(val) {
  if (!val) return 0
  return parseInt(String(val).replace(/,/g, '').trim()) || 0
}

function parseDate(val) {
  if (!val) return null
  // Handle DD/MM/YYYY format
  const parts = String(val).trim().split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  return val
}

function parseCSV(text) {
  const sep = detectSeparator(text)
  const lines = text.trim().split('\n').filter(l => l.trim())
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  return {
    sep,
    rows: lines.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      headers.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    }).filter(r => r['Target Group']?.trim())
  }
}

const VALUE_ORDER = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'EV', '']

export default function ReloadUpload({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [preview, setPreview] = useState(null)
  const [matchSummary, setMatchSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = async (f) => {
    setFile(f)
    setError(null)
    setPreview(null)
    setMatchSummary(null)
    setResult(null)
    setLoading(true)

    try {
      const text = await f.text()
      const { sep, rows } = parseCSV(text)

      if (!rows.length) throw new Error('No data rows found in file')

      const missing = REQUIRED_COLS.filter(c => !Object.keys(rows[0]).includes(c))
      if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`)

      // Auto-read dates from file
      const fileStart = parseDate(rows[0]['Range Start Date'])
      const fileEnd = parseDate(rows[0]['Range End Date'])
      if (fileStart) setRangeStart(fileStart)
      if (fileEnd) setRangeEnd(fileEnd)

      // Fetch reload mapping
      const { data: reloadMap, error: mapErr } = await supabase
        .from('reload_mapping')
        .select('target_group, decoded_label, lifecycle, product, value_segment, is_reminder')
      if (mapErr) throw new Error('Could not load reload mapping: ' + mapErr.message)

      const lookup = {}
      reloadMap.forEach(r => { lookup[r.target_group.trim()] = r })

      const mapped = rows.map(r => {
        const tg = r['Target Group'].trim()
        const match = lookup[tg]
        return {
          target_group: tg,
          decoded_label: match?.decoded_label || null,
          lifecycle: match?.lifecycle || null,
          product: match?.product || null,
          value_segment: match?.value_segment || null,
          is_reminder: match?.is_reminder || false,
          targeted_customers: parseNum(r['Targeted Customers']),
          control_customers: parseNum(r['Control Customers']),
          targeted_responders: parseNum(r['Targeted Responders']),
          control_responders: parseNum(r['Control Responders']),
        }
      })

      const matched = mapped.filter(r => r.decoded_label)
      const unmatched = mapped.filter(r => !r.decoded_label)

      setPreview(mapped)
      setMatchSummary({ matched: matched.length, unmatched: unmatched.length, unmatchedList: unmatched.map(r => r.target_group), sep })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleImport = async () => {
    if (!preview || !rangeStart || !rangeEnd) return alert('Please confirm the date range before importing')
    setImporting(true)
    setError(null)

    try {
      const toInsert = preview.filter(r => r.decoded_label).map(r => ({
        range_start: rangeStart,
        range_end: rangeEnd,
        target_group: r.target_group,
        decoded_label: r.decoded_label,
        lifecycle: r.lifecycle,
        product: r.product,
        value_segment: r.value_segment,
        is_reminder: r.is_reminder,
        targeted_customers: r.targeted_customers,
        control_customers: r.control_customers,
        targeted_responders: r.targeted_responders,
        control_responders: r.control_responders,
      }))

      // Delete existing for this range first
      await supabase.from('reload_daily').delete().eq('range_start', rangeStart).eq('range_end', rangeEnd)

      const { error: insertErr } = await supabase.from('reload_daily').insert(toInsert)
      if (insertErr) throw new Error(insertErr.message)

      setResult({ imported: toInsert.length, skipped: preview.filter(r => !r.decoded_label).length, rangeStart, rangeEnd })
      onSuccess && onSuccess({ rangeStart, rangeEnd })
    } catch (e) {
      setError('Import failed: ' + e.message)
    }
    setImporting(false)
  }

  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '0'
  const convRate = (resp, targ) => targ > 0 ? ((resp / targ) * 100).toFixed(1) + '%' : '—'
  const lift = (tResp, tTarg, cResp, cTarg) => {
    if (!tTarg || !cTarg) return null
    return ((tResp / tTarg) - (cResp / cTarg)) * 100
  }

  // Group preview by lifecycle for display
  const grouped = preview ? preview.reduce((acc, r) => {
    const key = r.lifecycle || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {}) : {}

  const lifecycleOrder = ['Active', 'Churned Short Lapse', 'Churned Long Lapse', 'OTD', 'Dormant', 'Unknown']

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div>
            <h2>🔄 Upload Reload Campaign CSV</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>
              Optimove reload campaign data — matched against all 43 reload target groups
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* File drop zone */}
          <div className="section-heading">CSV File</div>
          <div
            style={{
              border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'rgba(26,110,245,0.03)' : 'var(--bg3)',
              transition: 'all 0.15s',
              marginBottom: '16px',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{file.name}</div>
                {matchSummary && <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: '3px' }}>Detected separator: {matchSummary.sep === ';' ? 'semicolon' : 'comma'}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px' }}>Click to change file</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.4 }}>📂</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text2)' }}>Drop your Optimove reload CSV here or click to browse</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '4px' }}>Auto-detects semicolon or comma separator</div>
              </div>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text2)', fontSize: '0.85rem' }}>
              <span className="spinner" style={{ marginRight: '8px' }} />Parsing and matching…
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {/* Date range — shown after file parsed */}
          {preview && !result && (
            <>
              <div className="section-heading">Date Range</div>
              <div className="form-row" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Range Start Date</label>
                  <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Range End Date</label>
                  <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '16px', marginTop: '-8px' }}>
                Dates auto-read from file. Adjust if needed — re-importing for the same date range will overwrite existing data.
              </p>

              {/* Match summary */}
              <div className="section-heading">Match Summary</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>✅ Matched</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--success)' }}>{matchSummary.matched}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>target groups recognised</div>
                </div>
                <div style={{ background: matchSummary.unmatched > 0 ? 'rgba(220,38,38,0.07)' : 'var(--bg3)', border: `1px solid ${matchSummary.unmatched > 0 ? 'rgba(220,38,38,0.2)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: matchSummary.unmatched > 0 ? 'var(--danger)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                    {matchSummary.unmatched > 0 ? '⚠️ Unmatched' : '✓ All matched'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: matchSummary.unmatched > 0 ? 'var(--danger)' : 'var(--text3)' }}>{matchSummary.unmatched}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>will be skipped</div>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>📅 Period</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{rangeStart} →</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{rangeEnd}</div>
                </div>
              </div>

              {matchSummary.unmatchedList.length > 0 && (
                <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: '14px', fontSize: '0.76rem' }}>
                  <strong style={{ color: 'var(--danger)' }}>Unmatched (skipped):</strong>
                  <span style={{ color: 'var(--text2)', marginLeft: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{matchSummary.unmatchedList.join(' · ')}</span>
                </div>
              )}

              {/* Preview grouped by lifecycle */}
              <div className="section-heading">Data Preview</div>
              <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                    <tr>
                      {['Target Group', 'Decoded Label', 'Product', 'Value', 'Targeted', 'Control', 'Responders', 'Ctrl Resp.', 'Conv%', 'Lift'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycleOrder.filter(lc => grouped[lc]).map(lc => (
                      <React.Fragment key={lc}>
                        <tr>
                          <td colSpan={10} style={{ padding: '6px 10px', background: 'var(--bg3)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
                            {lc}
                          </td>
                        </tr>
                        {grouped[lc].sort((a, b) => VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment)).map((r, i) => {
                          const liftVal = lift(r.targeted_responders, r.targeted_customers, r.control_responders, r.control_customers)
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: r.decoded_label ? 1 : 0.4 }}>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.is_reminder && <span style={{ fontSize: '0.6rem', background: 'rgba(251,191,36,0.15)', color: 'var(--warning)', padding: '1px 4px', borderRadius: '3px', marginRight: '4px' }}>REM</span>}
                                {r.target_group}
                              </td>
                              <td style={{ padding: '6px 10px', fontSize: '0.73rem', color: r.decoded_label ? 'var(--text)' : 'var(--danger)' }}>{r.decoded_label || '— no match'}</td>
                              <td style={{ padding: '6px 10px', fontSize: '0.73rem', color: 'var(--text2)' }}>{r.product || '—'}</td>
                              <td style={{ padding: '6px 10px' }}>
                                {r.value_segment && <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}>{r.value_segment}</span>}
                              </td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.targeted_customers)}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.control_customers)}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>{fmtN(r.targeted_responders)}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.control_responders)}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{convRate(r.targeted_responders, r.targeted_customers)}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: liftVal > 0 ? 'var(--success)' : liftVal < 0 ? 'var(--danger)' : 'var(--text3)' }}>
                                {liftVal !== null ? `${liftVal > 0 ? '+' : ''}${liftVal.toFixed(1)}pp` : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Success */}
          {result && (
            <div style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✅</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Import successful</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>
                {result.imported} reload segments imported for {result.rangeStart} → {result.rangeEnd}
                {result.skipped > 0 && ` · ${result.skipped} skipped`}
              </div>
            </div>
          )}

        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
          {preview && !result && (
            <button className="btn-primary" onClick={handleImport} disabled={importing || matchSummary.matched === 0 || !rangeStart || !rangeEnd}>
              {importing ? <><span className="spinner" style={{ marginRight: '8px' }} />Importing…</> : `Import ${matchSummary.matched} Records`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

