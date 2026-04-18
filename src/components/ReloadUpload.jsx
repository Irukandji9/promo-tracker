import React, { useState, useRef } from 'react'
import { supabase } from '../supabase'

const REQUIRED_COLS = ['Target Group', 'Communication type', 'Targeted Customers', 'Control Customers', 'Targeted Responders', 'Control Responders']
const VALUE_ORDER = ['HV', 'MV', 'LHV', 'LLV', 'NV', 'EV', '']

function parseCSVLine(line, sep) {
  const result = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === sep && !inQuote) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result.map(v => v.replace(/^"|"$/g, '').trim())
}

function detectSep(firstLine) {
  return (firstLine.match(/;/g) || []).length > 0 ? ';' : ','
}

function parseNum(val) {
  if (!val) return 0
  return parseInt(String(val).replace(/,/g, '').trim()) || 0
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const sep = detectSep(lines[0])
  const headers = parseCSVLine(lines[0], sep)

  const colIdx = {}
  REQUIRED_COLS.forEach(col => {
    const idx = headers.findIndex(h => h === col)
    if (idx !== -1) colIdx[col] = idx
  })

  return {
    sep,
    rows: lines.slice(1).map(line => {
      const vals = parseCSVLine(line, sep)
      const row = {}
      REQUIRED_COLS.forEach(col => {
        row[col] = colIdx[col] !== undefined ? (vals[colIdx[col]] || '') : ''
      })
      return row
    }).filter(r => r['Target Group']?.trim() && r['Communication type']?.trim() === 'Scheduled')
  }
}

export default function ReloadUpload({ onClose, onSuccess }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [matchSummary, setMatchSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')
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

      if (!rows.length) throw new Error('No Scheduled rows found in file')

      // Auto-read date from filename
      const dateMatch = f.name.match(/(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) setDate(dateMatch[1])

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
    if (!preview || !date) { setError('Please select a date before importing'); return }
    setImporting(true)
    setError(null)

    try {
      const toInsert = preview.filter(r => r.decoded_label).map(r => ({
        data_date: date,
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

      // Deduplicate by target_group
      const dedupedMap = {}
      toInsert.forEach(r => { dedupedMap[r.target_group] = r })
      const deduped = Object.values(dedupedMap)

      setImportProgress(`Importing ${deduped.length} records for ${date}…`)
      const { error: upsertErr } = await supabase
        .from('reload_daily')
        .upsert(deduped, { onConflict: 'data_date,target_group' })
      if (upsertErr) throw new Error('Upsert failed: ' + upsertErr.message)

      setResult({ imported: deduped.length, skipped: preview.filter(r => !r.decoded_label).length })
      onSuccess && onSuccess(date)
    } catch (e) {
      setError('Import failed: ' + e.message)
      setImportProgress('')
    }
    setImporting(false)
  }

  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '0'
  const convRate = (resp, targ) => targ > 0 ? ((resp / targ) * 100).toFixed(1) + '%' : '—'

  const grouped = preview ? preview.reduce((acc, r) => {
    const key = r.lifecycle || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {}) : {}

  const lifecycleOrder = ['Active', 'Churned Short Lapse', 'Churned Long Lapse', 'OTD', 'Dormant', 'Unknown']

  if (result) return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '460px', textAlign: 'center', padding: '0' }}>
        <div style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '10px' }}>Import Successful!</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text2)', marginBottom: '6px' }}>
            <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{result.imported}</strong> reload segments imported
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text2)', background: 'var(--bg3)', padding: '8px 16px', borderRadius: 'var(--radius)', margin: '12px 0', display: 'inline-block' }}>
            {date}
          </div>
          {result.skipped > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: '8px' }}>{result.skipped} skipped (unmatched)</div>}
          <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: '24px' }}>Close this window — the Reload tab will refresh automatically.</div>
          <button className="btn-primary" style={{ padding: '12px 32px', fontSize: '0.9rem' }} onClick={onClose}>Close & View Data</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div>
            <h2>🔄 Upload Reload Campaign CSV</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>Reads Scheduled rows only — Target Group, Targeted, Control, Responders</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          <div className="section-heading">Data Date</div>
          <div className="form-group" style={{ maxWidth: '240px' }}>
            <label>Date this file relates to</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '16px' }}>
            Auto-read from filename if date found. Adjust if needed.
          </p>

          <div className="section-heading">CSV File</div>
          <div
            style={{ border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(26,110,245,0.03)' : 'var(--bg3)', transition: 'all 0.15s', marginBottom: '16px' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px' }}>Click to change file</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.4 }}>📂</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text2)' }}>Drop your Optimove reload CSV here or click to browse</div>
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

          {preview && matchSummary && (
            <>
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
                  <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>📅 Date</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{date}</div>
                </div>
              </div>

              {matchSummary.unmatchedList.length > 0 && (
                <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: '14px', fontSize: '0.76rem' }}>
                  <strong style={{ color: 'var(--danger)' }}>Unmatched (skipped):</strong>
                  <span style={{ color: 'var(--text2)', marginLeft: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{matchSummary.unmatchedList.join(' · ')}</span>
                </div>
              )}

              <div className="section-heading">Data Preview</div>
              <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                    <tr>
                      {['Target Group', 'Decoded Label', 'Product', 'Value', 'Targeted', 'Control', 'Responders', 'Conv%'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycleOrder.filter(lc => grouped[lc]).map(lc => (
                      <React.Fragment key={lc}>
                        <tr>
                          <td colSpan={8} style={{ padding: '6px 10px', background: 'var(--bg3)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{lc}</td>
                        </tr>
                        {[...grouped[lc]].sort((a, b) => VALUE_ORDER.indexOf(a.value_segment) - VALUE_ORDER.indexOf(b.value_segment)).map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: r.decoded_label ? 1 : 0.4 }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.is_reminder && <span style={{ fontSize: '0.6rem', background: 'rgba(251,191,36,0.15)', color: 'var(--warning)', padding: '1px 4px', borderRadius: '3px', marginRight: '4px' }}>REM</span>}
                              {r.target_group}
                            </td>
                            <td style={{ padding: '6px 10px', fontSize: '0.73rem', color: r.decoded_label ? 'var(--text)' : 'var(--danger)' }}>{r.decoded_label || '— no match'}</td>
                            <td style={{ padding: '6px 10px', fontSize: '0.73rem', color: 'var(--text2)' }}>{r.product || '—'}</td>
                            <td style={{ padding: '6px 10px' }}>
                              {r.value_segment && <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg3)', border: '1px solid var(--border)' }}>{r.value_segment}</span>}
                            </td>
                            <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.targeted_customers)}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{fmtN(r.control_customers)}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600 }}>{fmtN(r.targeted_responders)}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{convRate(r.targeted_responders, r.targeted_customers)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>

        {importing && (
          <div style={{ padding: '0 24px 12px' }}>
            <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px', animation: 'progressPulse 1.2s ease-in-out infinite' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{importProgress}</div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={importing}>Cancel</button>
          {preview && matchSummary && (
            <button className="btn-primary" onClick={handleImport} disabled={importing || matchSummary.matched === 0}>
              {importing ? <><span className="spinner" style={{ marginRight: '8px' }} />{importProgress || 'Importing…'}</> : `Import ${matchSummary.matched} Records`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
