import React, { useState, useRef } from 'react'
import { supabase } from '../supabase'

const REQUIRED_COLS = ['Target Group', 'Targeted Customers', 'Control Customers', 'Targeted Responders', 'Control Responders']

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

function detectSep(line) {
  const sc = (line.match(/;/g) || []).length
  return sc > 0 ? ';' : ','
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const sep = detectSep(lines[0])
  const headers = parseCSVLine(lines[0], sep)

  // Only extract the columns we care about — ignore everything else
  const TARGET_COLS = ['Target Group', 'Targeted Customers', 'Control Customers', 'Targeted Responders', 'Control Responders']
  const colIdx = {}
  TARGET_COLS.forEach(col => {
    const idx = headers.findIndex(h => h === col)
    if (idx !== -1) colIdx[col] = idx
  })

  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line, sep)
    const row = {}
    TARGET_COLS.forEach(col => {
      row[col] = colIdx[col] !== undefined ? (vals[colIdx[col]] || '') : ''
    })
    return row
  }).filter(r => r['Target Group']?.trim())
}

function detectSep(line) {
  const sc = (line.match(/;/g) || []).length
  return sc > 0 ? ';' : ','
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const sep = detectSep(lines[0])
  const headers = parseCSVLine(lines[0], sep)
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line, sep)
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(r => r['Target Group'])
}

export default function FunnelUpload({ onClose, onSuccess }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [importProgress, setImportProgress] = useState('')
  const fileRef = useRef()

  const handleFile = async (f) => {
    setFile(f)
    setError(null)
    setPreview(null)
    setMapping(null)
    setResult(null)
    setLoading(true)

    try {
      const text = await f.text()
      const rows = parseCSV(text)

      // Check required columns
      const missing = REQUIRED_COLS.filter(c => !Object.keys(rows[0] || {}).includes(c))
      if (missing.length > 0) {
        setError(`Missing columns: ${missing.join(', ')}`)
        setLoading(false)
        return
      }

      // Fetch funnel mapping from Supabase
      const { data: funnelMap, error: mapErr } = await supabase
        .from('funnel_mapping')
        .select('target_group, funnel_label')

      if (mapErr) throw new Error('Could not load funnel mapping: ' + mapErr.message)

      const lookupMap = {}
      funnelMap.forEach(r => { lookupMap[r.target_group.trim()] = r.funnel_label })

      // Build preview with mapped labels
      const mapped = rows.map(r => ({
        target_group: r['Target Group'],
        funnel_label: lookupMap[r['Target Group']?.trim()] || null,
        targeted_customers: parseInt(r['Targeted Customers']) || 0,
        control_customers: parseInt(r['Control Customers']) || 0,
        targeted_responders: parseInt(r['Targeted Responders']) || 0,
        control_responders: parseInt(r['Control Responders']) || 0,
      }))

      const matched = mapped.filter(r => r.funnel_label)
      const unmatched = mapped.filter(r => !r.funnel_label)

      setPreview(mapped)
      setMapping({ matched: matched.length, unmatched: unmatched.length, unmatchedList: unmatched.map(r => r.target_group) })
    } catch (e) {
      setError('Error reading file: ' + e.message)
    }
    setLoading(false)
  }

  const handleImport = async () => {
    if (!preview || !date) {
      setError('Please select a date before importing')
      return
    }
    setImporting(true)
    setError(null)
    setImportProgress('Preparing records…')

    try {
      const toInsert = preview.filter(r => r.funnel_label).map(r => ({
        data_date: date,
        target_group: r.target_group,
        funnel_label: r.funnel_label,
        targeted_customers: r.targeted_customers,
        control_customers: r.control_customers,
        targeted_responders: r.targeted_responders,
        control_responders: r.control_responders,
      }))

      setImportProgress(`Clearing existing data for ${date}…`)
      const { error: delErr } = await supabase.from('funnel_daily').delete().eq('data_date', date)
      if (delErr) throw new Error('Delete failed: ' + delErr.message)

      setImportProgress(`Inserting ${toInsert.length} records into database…`)
      const { error: insertErr } = await supabase.from('funnel_daily').insert(toInsert)
      if (insertErr) throw new Error('Insert failed: ' + insertErr.message)

      setImportProgress('Done!')
      setResult({ imported: toInsert.length, skipped: preview.filter(r => !r.funnel_label).length })
      onSuccess && onSuccess(date)
    } catch (e) {
      setError('Import failed: ' + e.message)
      setImportProgress('')
    }
    setImporting(false)
  }

  const fmtN = v => v ? Number(v).toLocaleString('tr-TR') : '0'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: '760px' }}>
        <div className="modal-header">
          <div>
            <h2>📡 Upload Optimove Funnel CSV</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '2px' }}>
              Daily campaign performance data — matched against funnel mapping
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Date selector */}
          <div className="section-heading">Data Date</div>
          <div className="form-group" style={{ maxWidth: '240px' }}>
            <label>Date this file relates to</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '16px' }}>
            If uploading on a Monday for Friday's data, change the date above before importing.
          </p>

          {/* File drop zone */}
          <div className="section-heading">CSV File</div>
          <div
            style={{
              border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
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
                <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{file.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: '4px' }}>Click to change file</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.4 }}>📂</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text2)' }}>Drop your Optimove CSV here or click to browse</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '6px' }}>Required columns: {REQUIRED_COLS.join(', ')}</div>
              </div>
            )}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)', fontSize: '0.85rem' }}>
              <span className="spinner" style={{ marginRight: '8px' }} />Parsing and matching…
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <>
              <div className="section-heading">Preview</div>

              {/* Match summary */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>✅ Matched</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--success)' }}>{mapping.matched}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>target groups recognised</div>
                </div>
                <div style={{ background: mapping.unmatched > 0 ? 'rgba(220,38,38,0.07)' : 'var(--bg3)', border: `1px solid ${mapping.unmatched > 0 ? 'rgba(220,38,38,0.2)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: mapping.unmatched > 0 ? 'var(--danger)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                    {mapping.unmatched > 0 ? '⚠️ Unmatched' : '✓ None unmatched'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: mapping.unmatched > 0 ? 'var(--danger)' : 'var(--text3)' }}>{mapping.unmatched}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>will be skipped</div>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>📅 Data Date</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{date}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>will overwrite if reimported</div>
                </div>
              </div>

              {/* Unmatched warning */}
              {mapping.unmatchedList.length > 0 && (
                <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '14px', fontSize: '0.78rem' }}>
                  <strong style={{ color: 'var(--danger)' }}>Unmatched target groups (will be skipped):</strong>
                  <div style={{ color: 'var(--text2)', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                    {mapping.unmatchedList.join(' · ')}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                    <tr>
                      {['Target Group', 'Funnel Label', 'Targeted', 'Control', 'Responders', 'Ctrl Resp.'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text2)', fontWeight: 500, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: r.funnel_label ? 1 : 0.4 }}>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target_group}</td>
                        <td style={{ padding: '6px 10px', fontSize: '0.75rem', color: r.funnel_label ? 'var(--accent)' : 'var(--danger)' }}>{r.funnel_label || '— no match'}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.targeted_customers)}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.control_customers)}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{fmtN(r.targeted_responders)}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{fmtN(r.control_responders)}</td>
                      </tr>
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
                {result.imported} target groups imported for {date}
                {result.skipped > 0 && ` · ${result.skipped} skipped (unmatched)`}
              </div>
            </div>
          )}

        </div>
        {importing && (
          <div style={{ padding: '0 24px 12px' }}>
            <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px', animation: 'progressPulse 1.2s ease-in-out infinite' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
              {importProgress}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={importing}>{result ? 'Close' : 'Cancel'}</button>
          {preview && !result && (
            <button className="btn-primary" onClick={handleImport} disabled={importing || mapping.matched === 0}>
              {importing
                ? <><span className="spinner" style={{ marginRight: '8px' }} />{importProgress || 'Importing…'}</>
                : `Import ${mapping.matched} Records`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
