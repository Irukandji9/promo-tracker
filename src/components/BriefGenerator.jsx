import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── DOCX CDN loader ──────────────────────────────────
let docxLoaded = false
function loadDocx() {
  return new Promise((resolve) => {
    if (docxLoaded && window.docx) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/docx@8.5.0/build/index.js'
    s.onload = () => { docxLoaded = true; resolve() }
    document.head.appendChild(s)
  })
}

// ─── STANDARD CLAUSES (locked — never AI-generated) ───
const STD = {
  'Free Bet': {
    title: 'Free Bet Rules', tr: 'Bedava Bahis Kuralları',
    clauses: [
      ['You can only use your free bet on sports.', 'Bedava bahsiniz sadece Spor\'da geçerlidir.'],
      ['Once you place your free bet, any winnings you receive are yours and are free of any rollover requirement.', 'Bedava Bahis kupon kazancına dahil olmaz; kazanç hesabınıza çevirim koşulsuz nakit olarak eklenir.'],
      ['Free Bets will be valid for 3 days from day of credit.', 'Bedava bahsiniz tanımlandıktan sonra 3 gün için geçerlidir.'],
      ['Free Bets can only be used on selections with odds of 1.5 or higher. If you place a multiple, each selection must contain odds of 1.5 or higher.', 'Bedava bahisinizi kullanabilmeniz için kuponunuzda bulunan seçiminizin en az 1.5 oranda olması gerekir. Çoklu bahislerinizde de tercihlerinizin her birinin 1.5 veya daha yüksek oran içermesi gerekmektedir.'],
      ['Free Bet winnings are paid in cash without the stake and are free of roll over conditions.', 'Bedava bahis ile olan kazancınız hesabınıza nakit olarak aktarılır ve çevrim şartı uygulanmaz.'],
    ]
  },
  'Casino Bonus': {
    title: 'Casino Bonus Rules', tr: 'Casino Bonusu Kuralları',
    clauses: (isVip) => [
      ['Casino Bonus will be valid for 30 days from day of credit.', 'Bonus, hesabınıza aktarılmasının ardından 30 gün geçerli olacaktır.'],
      isVip
        ? ['Casino Bonus must be wagered 20 times on Slot games or 40 times on Live Casino games within 30 days.', 'Para Çekim talebi vermeden önce, hesabınıza eklenen bonusunuzun 20 katı tutarını Slot oyunlarında veya 40 katı tutarını Canlı Casino oyunlarında 30 gün içinde çevirmeniz gereklidir.']
        : ['Casino Bonus must be wagered 25 times on Slot games or 75 times on Live Casino games within 30 days.', 'Para Çekim talebi vermeden önce, hesabınıza eklenen bonusunuzun 25 katı tutarını Slot oyunlarında veya 75 katı tutarını Canlı Casino oyunlarında 30 gün içinde çevirmeniz gereklidir.'],
      ['In case of exceeding this period, remaining bonus and winnings will be voided.', 'Bu sürenin aşılması durumunda, hesabınızda kalan mevcut bonus tutarı ve kazançlar geçersiz sayılır.'],
      ['Requesting a withdrawal before completing wagering will void your bonus and winnings.', 'Bonus koşullarını yerine getirmeden para çekme talebinde bulunulduğu takdirde, bonusunuz ve kazançlarınız silinecektir.'],
    ]
  },
  'Free Spins': {
    title: 'Free Spin Rules', tr: 'Bedava Dönüş Kuralları',
    clauses: [
      ['Free Spins will be valid for 30 days from day of credit.', 'Bedava dönüşler, hesabınıza aktarılmasının ardından 30 gün geçerli olacaktır.'],
      ['You must wager your Free Spin winnings 25 times before requesting a withdrawal.', 'Para Çekim talebi vermeden önce, bedava dönüşlerden gelen kazancınızın 25 katını çevirmeniz gereklidir.'],
      ['In case of exceeding this period, remaining bonus and winnings will be voided.', 'Bu sürenin aşılması durumunda, hesabınızda kalan mevcut bonus tutarı ve kazançlar geçersiz sayılır.'],
    ]
  }
}

function getStdSections(rewards, aud) {
  const isVip = aud === 'vip'
  const secs = []
  for (const rt of rewards) {
    if (rt === 'Free Bet') secs.push({ title: STD['Free Bet'].title, tr: STD['Free Bet'].tr, clauses: STD['Free Bet'].clauses })
    if (rt === 'Casino Bonus') secs.push({ title: STD['Casino Bonus'].title, tr: STD['Casino Bonus'].tr, clauses: STD['Casino Bonus'].clauses(isVip) })
    if (rt === 'Free Spins') secs.push({ title: STD['Free Spins'].title, tr: STD['Free Spins'].tr, clauses: STD['Free Spins'].clauses })
  }
  return secs
}

// ─── HELPERS ──────────────────────────────────────────
function fd(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
function mkCode(n, d) {
  const dt = (d || 'XXXXXX').replace(/-/g, '').slice(2)
  const sl = (n || 'PROMO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
  return `${dt}_${sl}`
}
function tierCode(a) {
  if (a === 'vip') return '1, 4'
  if (a === 'standard_vip') return 'Any except 2, 3, 98'
  if (a === 'acquisition') return 'REC'
  return 'Any except 1, 2, 3, 4, 98'
}
function tierLabel(a) {
  if (a === 'vip') return 'VIP players (Tier 1 & 4)'
  if (a === 'standard_vip') return 'Standard + VIP players (all except TC 2, 3, 98)'
  if (a === 'acquisition') return 'new players (first deposit)'
  return 'Standard players (all except TC 1, 2, 3, 4, 98)'
}
function buildSummary(d) {
  const who = tierLabel(d.aud)
  const who2 = who.charAt(0).toUpperCase() + who.slice(1)
  const what = d.trigger === 'Deposit' ? 'make a qualifying deposit' : d.trigger === 'Bet' ? 'place qualifying bets' : 'stake'
  const when = d.days ? `${d.days}${d.hours ? `, ${d.hours}` : ''}` : d.sd ? `from ${d.sd}` : 'during the promotion period'
  const till = d.ed === '∞ Indefinite' ? ' (ongoing indefinitely)' : d.ed ? ` until ${d.ed}` : ''
  const recv = `${d.incentive ? d.incentive + ' ' : ''}${d.rewardStr}${d.maxReward ? ` up to ${d.maxReward}` : ''}`
  return `${who2} who ${d.optIn ? 'opt in and ' : ''}${what} on ${d.product} during ${when}${till} will receive ${recv}.${d.optIn ? ' Opt-in required.' : ''} Reward credited: ${d.cred || 'as specified'}.`
}

// ─── MAIN COMPONENT ───────────────────────────────────
export default function BriefGenerator() {
  // Instructions
  const [instructions, setInstructions] = useState('')
  const [instructionsEdit, setInstructionsEdit] = useState('')
  const [instrOpen, setInstrOpen] = useState(false)
  const [instrSaving, setInstrSaving] = useState(false)

  // History
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedHistory, setSelectedHistory] = useState(null)

  // Form
  const [selectedRewards, setSelectedRewards] = useState(new Set(['Free Bet']))
  const [indefinite, setIndefinite] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  // Brief output
  const [briefData, setBriefData] = useState(null)
  const [aiClauses, setAiClauses] = useState(null)
  const [stdSections, setStdSections] = useState(null)

  // Form fields
  const f = (id) => document.getElementById(`bf-${id}`)?.value?.trim() || ''
  const fc = (id) => document.getElementById(`bf-${id}`)?.checked

  // Load instructions + history
  useEffect(() => {
    loadInstructions()
    loadHistory()
  }, [])

  async function loadInstructions() {
    const { data } = await supabase.from('brief_instructions').select('content').eq('id', 1).single()
    if (data) { setInstructions(data.content); setInstructionsEdit(data.content) }
  }

  async function loadHistory() {
    setHistoryLoading(true)
    const { data } = await supabase.from('brief_history').select('*').order('created_at', { ascending: false }).limit(50)
    setHistory(data || [])
    setHistoryLoading(false)
  }

  async function saveInstructions() {
    setInstrSaving(true)
    await supabase.from('brief_instructions').update({ content: instructionsEdit, updated_at: new Date().toISOString() }).eq('id', 1)
    setInstructions(instructionsEdit)
    setInstrSaving(false)
    setInstrOpen(false)
  }

  async function deleteHistory(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this brief from history?')) return
    await supabase.from('brief_history').delete().eq('id', id)
    setHistory(h => h.filter(x => x.id !== id))
    if (selectedHistory?.id === id) setSelectedHistory(null)
  }

  function toggleReward(v) {
    setSelectedRewards(prev => {
      const next = new Set(prev)
      if (next.has(v)) { if (next.size === 1) return prev; next.delete(v) }
      else next.add(v)
      return next
    })
  }

  function updateProductFields() {
    const prod = f('product') || document.getElementById('bf-product')?.value
    const isSp = ['Sports', 'Both'].includes(prod)
    const sf = document.getElementById('bf-sports-fields')
    const of2 = document.getElementById('bf-odds-field')
    if (sf) sf.style.display = isSp ? 'grid' : 'none'
    if (of2) of2.style.opacity = isSp ? '1' : '0.3'
  }

  function collectForm() {
    const prod = document.getElementById('bf-product')?.value || 'Sports'
    const aud  = document.getElementById('bf-audience')?.value || 'standard'
    const sd   = document.getElementById('bf-startDate')?.value || ''
    const edRaw = document.getElementById('bf-endDate')?.value || ''
    const days = document.getElementById('bf-activeDays')?.value?.trim() || ''
    const hours = document.getElementById('bf-activeHours')?.value?.trim() || ''
    const isSports = ['Sports', 'Both'].includes(prod)
    const rewards = [...selectedRewards]

    return {
      name:       document.getElementById('bf-name')?.value?.trim() || 'Untitled Promotion',
      domain:     document.getElementById('bf-domain')?.value || 'Hepsibahis / Youwin',
      aud,
      tc:         tierCode(aud),
      sd:         fd(sd),
      ed:         indefinite ? '∞ Indefinite' : fd(edRaw),
      rawSd:      sd,
      days, hours,
      cred:       document.getElementById('bf-creditTiming')?.value?.trim() || '',
      product:    prod,
      trigger:    document.getElementById('bf-trigger')?.value || 'Bet',
      games:      document.getElementById('bf-games')?.value?.trim() || '',
      market:     document.getElementById('bf-market')?.value?.trim() || '',
      betType:    document.getElementById('bf-bettingType')?.value || '',
      minStake:   document.getElementById('bf-minStake')?.value?.trim() || '',
      minOdds:    document.getElementById('bf-minOdds')?.value?.trim() || '',
      incentive:  document.getElementById('bf-incentive')?.value?.trim() || '',
      maxReward:  document.getElementById('bf-maxReward')?.value?.trim() || '',
      repeat:     document.getElementById('bf-repeat')?.value || 'No',
      optIn:      document.getElementById('bf-optIn')?.checked || false,
      rtc:        document.getElementById('bf-rtCode')?.value?.trim() || '—',
      bc:         document.getElementById('bf-bonusCode')?.value?.trim() || '—',
      special:    document.getElementById('bf-special')?.value?.trim() || '',
      notes:      document.getElementById('bf-notes')?.value?.trim() || '',
      rewards,
      rewardStr:  rewards.join(' + '),
      promoCode:  mkCode(document.getElementById('bf-name')?.value?.trim() || 'PROMO', sd),
      isSports,
    }
  }

  async function generate() {
    const nameEl = document.getElementById('bf-name')
    if (!nameEl?.value?.trim()) { alert('Please enter a Promotion Name.'); return }

    setGenerating(true)
    setLoadingStep('Calling Claude API…')
    setBriefData(null)
    setAiClauses(null)
    setSelectedHistory(null)

    try {
      const data = collectForm()
      const isSports = data.isSports

      const systemPrompt = `You are an expert CRM bonus brief writer for an online sports betting and casino company operating in Turkey (brands: Hepsibahis, Youwin, UWIN).

STANDING INSTRUCTIONS (always follow these):
${instructions}

YOUR TASK:
Generate the Terms & Conditions clauses for a bonus brief. Return ONLY a JSON array of clause objects. No preamble, no explanation, no markdown fences.

Each clause object: { "en": "English clause text.", "tr": "Turkish clause text." }

RULES:
1. Write simple, clear clauses — no section headers, no numbering. Just the clause text.
2. Cover: qualification requirements → timing/period → what the player receives → any special conditions or disqualifiers → tiered reward structures integrated naturally into the flow.
3. Tiered structures must be written as proper clauses in the flow — not as a block at the end.
4. Keep each clause to 1–2 sentences maximum.
5. Do NOT include standard reward clauses (Free Bet rules, Casino Bonus wagering, Free Spin rules) — those are appended automatically after your output.
6. Do NOT number the clauses.
7. Aim for 3–8 clauses for a standard promo. Tiered promos may need more.`

      const userPrompt = `Write the T&C clauses for this promotion:

PROMOTION: ${data.name}
DOMAIN: ${data.domain}
AUDIENCE: ${tierLabel(data.aud)}
REWARD TYPE: ${data.rewardStr}
PRODUCT: ${data.product}
${data.games ? `ELIGIBLE GAMES/EVENTS: ${data.games}` : ''}
${isSports && data.market ? `MARKET: ${data.market}` : ''}
${isSports && data.betType ? `BET TYPE: ${data.betType}` : ''}
TRIGGER: ${data.trigger}
OPT-IN: ${data.optIn ? 'Yes' : 'No'}
${data.minStake ? `MIN. STAKE/DEPOSIT: ${data.minStake}` : ''}
${isSports && data.minOdds ? `MIN. ODDS: ${data.minOdds}` : ''}
${data.incentive ? `INCENTIVE: ${data.incentive}` : ''}
${data.maxReward ? `MAX REWARD: ${data.maxReward}` : ''}
START DATE: ${data.sd || 'TBD'}
END DATE: ${data.ed || 'TBD'}
${data.days ? `ACTIVE DAYS: ${data.days}` : ''}
${data.hours ? `ACTIVE HOURS: ${data.hours}` : ''}
CREDITING: ${data.cred || 'TBD'}
REPEAT: ${data.repeat}

SPECIAL CONDITIONS & REWARD DETAILS:
${data.special || 'None'}

Return ONLY the JSON array.`

      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(JSON.stringify(err))
      }

      const apiData = await res.json()
      const text = apiData.content?.find(b => b.type === 'text')?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const clauses = JSON.parse(clean)
      const stds = getStdSections(data.rewards, data.aud)

      setLoadingStep('Saving to history…')

      // Save to history
      await supabase.from('brief_history').insert([{
        promo_code: data.promoCode,
        name: data.name,
        domain: data.domain,
        reward_type: data.rewardStr,
        form_data: data,
        ai_clauses: clauses,
        brief_data: { ...data, summary: buildSummary(data) }
      }])

      setBriefData({ ...data, summary: buildSummary(data) })
      setAiClauses(clauses)
      setStdSections(stds)
      loadHistory()

    } catch (e) {
      console.error(e)
      alert('Error generating brief: ' + e.message)
    }

    setGenerating(false)
    setLoadingStep('')
  }

  function loadFromHistory(entry) {
    setSelectedHistory(entry)
    setBriefData(entry.brief_data)
    setAiClauses(entry.ai_clauses)
    setStdSections(getStdSections(entry.brief_data?.rewards || [], entry.brief_data?.aud || 'standard'))
  }

  async function downloadDocx() {
    if (!briefData || !aiClauses) return
    await loadDocx()
    const d = briefData
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType, VerticalAlign } = window.docx

    const N = '00163B', B = '3FA9F5', G2 = '1F3560'
    const pW = 12240, mg = { top: 1080, right: 1080, bottom: 1080, left: 1080 }
    const cW = 10080, half = 5040
    const bd = { style: BorderStyle.SINGLE, size: 1, color: 'D4D8E0' }
    const bd4 = { top: bd, bottom: bd, left: bd, right: bd }
    const hb = { style: BorderStyle.SINGLE, size: 1, color: N }
    const hb4 = { top: hb, bottom: hb, left: hb, right: hb }
    const cm = { top: 80, bottom: 80, left: 120, right: 120 }

    const hCell = (t, w, bg = N) => new TableCell({
      borders: hb4, width: { size: w, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR }, margins: cm,
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: 'FFFFFF', size: 19, font: 'Arial' })] })]
    })
    const dCell = (ch, w, sh = false) => new TableCell({
      borders: bd4, width: { size: w, type: WidthType.DXA },
      shading: { fill: sh ? 'F7F9FC' : 'FFFFFF', type: ShadingType.CLEAR },
      margins: cm, verticalAlign: VerticalAlign.TOP, children: ch
    })
    const pp = (t, opts = {}) => new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [new TextRun({ text: t, bold: opts.bold, size: opts.sz || 20, color: opts.col || '1a1a1a', italics: opts.it, font: 'Arial' })]
    })
    const mRow = (l1, v1, l2, v2, sh = false) => {
      const q = cW / 4
      return new TableRow({ children: [dCell([pp(l1, { bold: true, sz: 18 })], q, sh), dCell([pp(v1 || '—', { sz: 18 })], half - q, sh), dCell([pp(l2, { bold: true, sz: 18 })], q, sh), dCell([pp(v2 || '—', { sz: 18 })], half - q, sh)] })
    }
    const sRow = (en, tr) => new TableRow({
      children: [new TableCell({
        columnSpan: 2, borders: hb4, width: { size: cW, type: WidthType.DXA },
        shading: { fill: G2, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: `${en}   /   ${tr}`, bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
      })]
    })
    const cRows = (pairs, isStd = false) => pairs.map((c, i) => {
      const en = Array.isArray(c) ? c[0] : c
      const tr = Array.isArray(c) ? c[1] : '—'
      const sh = i % 2 === 0
      const cl = isStd ? '777777' : '1a1a1a'
      return new TableRow({
        children: [
          dCell([new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true, size: 19, font: 'Arial' }), new TextRun({ text: en, size: 19, font: 'Arial', color: cl, italics: isStd })] })], half, sh),
          dCell([new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true, size: 19, font: 'Arial' }), new TextRun({ text: tr, size: 19, font: 'Arial', color: cl, italics: isStd })] })], half, sh),
        ]
      })
    })

    const termRows = [new TableRow({ children: [hCell('English', half), hCell('Turkish / Türkçe', half)] })]
    aiClauses.forEach((c, i) => {
      const sh = i % 2 === 0
      termRows.push(new TableRow({
        children: [
          dCell([new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true, size: 19, font: 'Arial' }), new TextRun({ text: c.en, size: 19, font: 'Arial' })] })], half, sh),
          dCell([new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true, size: 19, font: 'Arial' }), new TextRun({ text: c.tr, size: 19, font: 'Arial' })] })], half, sh),
        ]
      }))
    })
    stdSections.forEach(s => {
      termRows.push(sRow(s.title, s.tr))
      termRows.push(...cRows(s.clauses, true))
    })
    termRows.push(new TableRow({
      children: [new TableCell({
        columnSpan: 2, borders: bd4, width: { size: cW, type: WidthType.DXA },
        shading: { fill: 'FAFBFC', type: ShadingType.CLEAR }, margins: cm,
        children: [new Paragraph({ children: [new TextRun({ text: 'General Terms & Conditions apply.  /  Genel Hüküm ve Koşullar geçerlidir.', size: 18, italics: true, color: '888888', font: 'Arial' })] })]
      })]
    }))

    const isSp = d.isSports
    const mechRows = [
      new TableRow({ children: [hCell('Qualification', half), hCell('Crediting', half)] }),
      mRow('Product', d.product, 'Reward Type', d.rewardStr, false),
      mRow('Game(s)/Event(s)', d.games || 'All', 'Campaign Code', d.rtc, true),
      ...(isSp ? [mRow('Market', d.market || 'Any', 'Reporting Tag', d.bc, false), mRow('Pre-Live/Live', d.betType || 'Both', 'Max. Amount', d.maxReward || '—', true)] : [mRow('Reporting Tag', d.bc, 'Max. Amount', d.maxReward || '—', false)]),
      mRow('Trigger', d.trigger, 'Crediting Date', d.cred || '—', isSp),
      mRow('Opt-in', d.optIn ? 'Yes' : 'No', 'Repeat', d.repeat, !isSp),
      mRow('Min. Stake/Dep', d.minStake || 'None', '', '', isSp),
      ...(isSp ? [mRow('Min. Odds', d.minOdds || 'N/A', '', '', false)] : []),
      mRow('Qualify from', `${d.sd || '—'}${d.days ? ' (' + d.days + ')' : ''}${d.hours ? ', ' + d.hours : ''}`, '', '', true),
      mRow('Till', d.ed || '—', '', '', false),
      mRow('Incentive', d.incentive || '—', '', '', true),
      mRow('Tier Code', d.tc, '', '', false),
    ]

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
      sections: [{
        properties: { page: { size: { width: pW, height: 15840 }, margin: mg } },
        children: [
          new Paragraph({ spacing: { before: 0, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: B, space: 4 } }, children: [new TextRun({ text: 'Bonus Brief', bold: true, size: 36, font: 'Arial', color: N })] }),
          new Table({ width: { size: cW, type: WidthType.DXA }, columnWidths: [cW / 3, cW / 3, cW / 3], rows: [new TableRow({ children: [dCell([pp('Code', { bold: true, sz: 17, col: '555555' }), pp(d.promoCode, { bold: true, sz: 18, col: N })], cW / 3), dCell([pp('Domain', { bold: true, sz: 17, col: '555555' }), pp(d.domain, { sz: 18 })], cW / 3), dCell([pp('Tier Code', { bold: true, sz: 17, col: '555555' }), pp(d.tc, { sz: 18 })], cW / 3)] })] }),
          new Paragraph({ spacing: { before: 180, after: 0 }, children: [] }),
          new Table({ width: { size: cW, type: WidthType.DXA }, columnWidths: [cW], rows: [new TableRow({ children: [new TableCell({ borders: { top: { style: BorderStyle.SINGLE, size: 2, color: B }, bottom: { style: BorderStyle.SINGLE, size: 2, color: B }, left: { style: BorderStyle.SINGLE, size: 12, color: B }, right: { style: BorderStyle.SINGLE, size: 2, color: B } }, width: { size: cW, type: WidthType.DXA }, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [new Paragraph({ children: [new TextRun({ text: d.summary, size: 20, font: 'Arial' })] })] })] })] }),
          new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'Mechanism', bold: true, size: 24, font: 'Arial', color: N })] }),
          new Table({ width: { size: cW, type: WidthType.DXA }, columnWidths: [cW / 4, cW / 4, cW / 4, cW / 4], rows: mechRows }),
          new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'Terms & Conditions', bold: true, size: 24, font: 'Arial', color: N })] }),
          new Table({ width: { size: cW, type: WidthType.DXA }, columnWidths: [half, half], rows: termRows }),
          ...(d.notes ? [new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'Notes (internal)', bold: true, size: 24, font: 'Arial', color: N })] }), new Paragraph({ children: [new TextRun({ text: d.notes, size: 18, font: 'Arial', color: '555555', italics: true })] })] : []),
        ]
      }]
    })

    const buf = await Packer.toBuffer(doc)
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${d.promoCode}_BonusBrief.docx`; a.click()
    URL.revokeObjectURL(url)
  }

  const rewards = ['Free Bet', 'Casino Bonus', 'Free Spins', 'Cash', 'VEFA Coins']

  const s = {
    card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '14px', overflow: 'hidden' },
    cardHdr: { background: '#00163B', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardHdrTitle: { fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#fff' },
    cardBody: { padding: '14px' },
    label: { display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' },
    labelOpt: { fontWeight: 400, color: 'var(--text3)', textTransform: 'none', letterSpacing: 0, fontSize: '0.65rem', marginLeft: '4px' },
    input: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '7px 10px', outline: 'none' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    pill: (active) => ({ padding: '5px 14px', borderRadius: '20px', border: `1.5px solid ${active ? '#00163B' : 'var(--border)'}`, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: active ? '#00163B' : 'var(--bg)', color: active ? '#fff' : 'var(--text2)', transition: 'all 0.15s', userSelect: 'none' }),
    section: { fontSize: '0.72rem', fontWeight: 700, color: '#00163B', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '14px 0 5px', paddingBottom: '3px', borderBottom: '1px solid var(--border)' },
  }

  const activeBrief = selectedHistory ? { data: selectedHistory.brief_data, clauses: selectedHistory.ai_clauses, stds: getStdSections(selectedHistory.brief_data?.rewards || [], selectedHistory.brief_data?.aud || 'standard') } : briefData ? { data: briefData, clauses: aiClauses, stds: stdSections } : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr 260px', gap: '20px', alignItems: 'start' }}>

      {/* ═══ LEFT: FORM ═══ */}
      <div>

        {/* STANDING INSTRUCTIONS */}
        <div style={s.card}>
          <div style={s.cardHdr}>
            <span style={s.cardHdrTitle}>⚙ Standing Instructions</span>
            <button onClick={() => setInstrOpen(o => !o)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer' }}>
              {instrOpen ? 'Close' : 'Edit'}
            </button>
          </div>
          {instrOpen && (
            <div style={s.cardBody}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '8px', lineHeight: 1.5 }}>
                These rules are injected into every brief generation. Edit to update terminology, tone, or standing rules.
              </p>
              <textarea value={instructionsEdit} onChange={e => setInstructionsEdit(e.target.value)}
                style={{ ...s.input, minHeight: '180px', resize: 'vertical', lineHeight: 1.5, fontSize: '0.78rem' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '7px 16px' }} onClick={saveInstructions} disabled={instrSaving}>
                  {instrSaving ? 'Saving…' : 'Save Instructions'}
                </button>
                <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => { setInstructionsEdit(instructions); setInstrOpen(false) }}>Cancel</button>
              </div>
            </div>
          )}
          {!instrOpen && (
            <div style={{ padding: '8px 16px' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text3)', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {instructions.split('\n')[0] || 'No instructions set'}
              </p>
            </div>
          )}
        </div>

        {/* IDENTITY */}
        <div style={s.card}>
          <div style={s.cardHdr}><span style={s.cardHdrTitle}>🏷 Identity</span></div>
          <div style={s.cardBody}>
            <div style={{ marginBottom: '10px' }}>
              <label style={s.label}>Promotion Name</label>
              <input id="bf-name" type="text" placeholder="e.g. French Open Daily Cashback" style={s.input} />
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Domain</label>
                <select id="bf-domain" style={s.input}>
                  <option>Hepsibahis / Youwin</option>
                  <option>Hepsibahis</option>
                  <option>Youwin</option>
                  <option>UWIN</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Audience</label>
                <select id="bf-audience" style={s.input}>
                  <option value="standard">Standard (excl. TC 1,2,3,4,98)</option>
                  <option value="standard_vip">Standard + VIP (excl. TC 2,3,98)</option>
                  <option value="vip">VIP only (TC 1 & 4)</option>
                  <option value="acquisition">Acquisition / Welcome (REC)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* REWARD TYPE */}
        <div style={s.card}>
          <div style={s.cardHdr}><span style={s.cardHdrTitle}>🎁 Reward Type <span style={{ fontWeight: 400, opacity: 0.7, fontSize: '0.65rem', textTransform: 'none', letterSpacing: 0 }}>(select all that apply)</span></span></div>
          <div style={s.cardBody}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {rewards.map(r => (
                <div key={r} style={s.pill(selectedRewards.has(r))} onClick={() => toggleReward(r)}>{r}</div>
              ))}
            </div>
          </div>
        </div>

        {/* TIMING */}
        <div style={s.card}>
          <div style={s.cardHdr}><span style={s.cardHdrTitle}>📅 Timing</span></div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div>
                <label style={s.label}>Start Date</label>
                <input id="bf-startDate" type="date" style={s.input} />
              </div>
              <div>
                <label style={s.label}>End Date</label>
                <div style={{ position: 'relative' }}>
                  <input id="bf-endDate" type="date" style={{ ...s.input, opacity: indefinite ? 0 : 1 }} disabled={indefinite} />
                  {indefinite && <div style={{ position: 'absolute', inset: 0, background: '#00163B', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => setIndefinite(false)}>∞ Indefinite</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                  <input type="checkbox" id="bf-indefinite" checked={indefinite} onChange={e => setIndefinite(e.target.checked)} style={{ accentColor: '#00163B' }} />
                  <label htmlFor="bf-indefinite" style={{ fontSize: '0.72rem', color: 'var(--text3)', cursor: 'pointer' }}>Set as indefinite</label>
                </div>
              </div>
            </div>
            <div style={{ ...s.row, marginTop: '10px' }}>
              <div>
                <label style={s.label}>Active Days <span style={s.labelOpt}>optional</span></label>
                <input id="bf-activeDays" type="text" placeholder="e.g. Tuesday – Thursday" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Active Hours <span style={s.labelOpt}>optional</span></label>
                <input id="bf-activeHours" type="text" placeholder="e.g. 12:00 – 16:00 TR" style={s.input} />
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label style={s.label}>Crediting Timing</label>
              <input id="bf-creditTiming" type="text" placeholder="e.g. Every Friday / Instant / Next day" style={s.input} />
            </div>
          </div>
        </div>

        {/* MECHANICS */}
        <div style={s.card}>
          <div style={s.cardHdr}><span style={s.cardHdrTitle}>⚙️ Mechanics</span></div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div>
                <label style={s.label}>Product</label>
                <select id="bf-product" style={s.input} onChange={updateProductFields}>
                  <option>Sports</option><option>Casino</option><option>Both</option><option>Slots</option><option>Live Casino</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Trigger</label>
                <select id="bf-trigger" style={s.input}>
                  <option>Deposit</option><option>Bet</option><option>Stake</option><option>Registration</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label style={s.label}>Eligible Games / Events <span style={s.labelOpt}>optional</span></label>
              <input id="bf-games" type="text" placeholder="e.g. French Open Tennis / All Pragmatic Play slots" style={s.input} />
            </div>
            <div id="bf-sports-fields" style={{ ...s.row, marginTop: '10px' }}>
              <div>
                <label style={s.label}>Market <span style={s.labelOpt}>optional</span></label>
                <input id="bf-market" type="text" placeholder="e.g. Match Winner" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Pre-Live / Live <span style={s.labelOpt}>optional</span></label>
                <select id="bf-bettingType" style={s.input}>
                  <option value="">Both (default)</option>
                  <option value="Live only">Live only</option>
                  <option value="Pre-match only">Pre-match only</option>
                </select>
              </div>
            </div>
            <div style={{ ...s.row, marginTop: '10px' }}>
              <div>
                <label style={s.label}>Min. Stake / Deposit <span style={s.labelOpt}>optional</span></label>
                <input id="bf-minStake" type="text" placeholder="e.g. ₺500" style={s.input} />
              </div>
              <div id="bf-odds-field">
                <label style={s.label}>Min. Odds <span style={s.labelOpt}>sports only</span></label>
                <input id="bf-minOdds" type="text" placeholder="e.g. 1.5" style={s.input} />
              </div>
            </div>
            <div style={{ ...s.row, marginTop: '10px' }}>
              <div>
                <label style={s.label}>Incentive <span style={s.labelOpt}>optional</span></label>
                <input id="bf-incentive" type="text" placeholder="e.g. 20% or ₺2,000" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Max Reward Cap <span style={s.labelOpt}>optional</span></label>
                <input id="bf-maxReward" type="text" placeholder="e.g. ₺3,000" style={s.input} />
              </div>
            </div>
            <div style={{ ...s.row, marginTop: '10px' }}>
              <div>
                <label style={s.label}>Repeat</label>
                <select id="bf-repeat" style={s.input}>
                  <option value="No">One-time</option><option value="Weekly">Weekly</option><option value="Daily">Daily</option><option value="Monthly">Monthly</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" id="bf-optIn" style={{ accentColor: '#00163B' }} />
                  Opt-in required
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* BONUS ENGINE */}
        <div style={s.card}>
          <div style={s.cardHdr}><span style={s.cardHdrTitle}>🔑 Bonus Engine</span></div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div>
                <label style={s.label}>Campaign Code <span style={s.labelOpt}>bonus engine</span></label>
                <input id="bf-rtCode" type="text" placeholder="e.g. TR_SPT_CASHBACK" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Reporting Tag</label>
                <input id="bf-bonusCode" type="text" placeholder="e.g. YWRSPO--CB--ADH" style={s.input} />
              </div>
            </div>
          </div>
        </div>

        {/* CONDITIONS */}
        <div style={s.card}>
          <div style={s.cardHdr}><span style={s.cardHdrTitle}>📋 Conditions &amp; Notes</span></div>
          <div style={s.cardBody}>
            <div style={{ marginBottom: '10px' }}>
              <label style={s.label}>Special Rules, Conditions &amp; Reward Details <span style={s.labelOpt}>tiered structures, disqualifiers — AI will format everything</span></label>
              <textarea id="bf-special" rows={5} placeholder={'e.g. Only single bets qualify. No cashed out bets.\n\nTiered cashback:\n₺1,000–₺2,999 net loss → 10% up to ₺100\n₺3,000–₺4,999 → 15% up to ₺450'} style={{ ...s.input, resize: 'vertical', minHeight: '100px', lineHeight: 1.5 }} />
            </div>
            <div>
              <label style={s.label}>Internal Notes <span style={s.labelOpt}>NOT in brief — Looker links, ops info</span></label>
              <textarea id="bf-notes" rows={2} placeholder="e.g. Looker: https://... · Prize pool: ₺50,000 total" style={{ ...s.input, resize: 'vertical', lineHeight: 1.5 }} />
            </div>
          </div>
        </div>

        <button className="btn-primary" style={{ width: '100%', padding: '13px', fontSize: '0.88rem', letterSpacing: '0.5px' }} onClick={generate} disabled={generating}>
          {generating ? `⏳ ${loadingStep}` : '✦  Generate Bonus Brief with AI'}
        </button>
      </div>

      {/* ═══ CENTRE: PREVIEW ═══ */}
      <div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '400px' }}>
          {!activeBrief && !generating && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--text3)', gap: '12px', textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>📄</div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>Fill in the details on the left<br />and click <strong>Generate</strong> to build your brief.</p>
            </div>
          )}
          {generating && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
              <span className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>{loadingStep}</p>
            </div>
          )}
          {activeBrief && !generating && <BriefPreview data={activeBrief.data} clauses={activeBrief.clauses} stds={activeBrief.stds} />}
        </div>
        {activeBrief && !generating && (
          <button className="btn-secondary" style={{ width: '100%', marginTop: '10px', padding: '11px', fontSize: '0.82rem', fontWeight: 700 }} onClick={downloadDocx}>
            ⬇ &nbsp;Download as .docx
          </button>
        )}
      </div>

      {/* ═══ RIGHT: HISTORY ═══ */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '12px' }}>Brief History</div>
        {historyLoading && <div style={{ fontSize: '0.8rem', color: 'var(--text3)', textAlign: 'center', padding: '20px' }}>Loading…</div>}
        {!historyLoading && history.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text3)', textAlign: 'center', padding: '20px', lineHeight: 1.6 }}>No briefs generated yet.<br />Your history will appear here.</div>
        )}
        {history.map(h => (
          <div key={h.id}
            onClick={() => loadFromHistory(h)}
            style={{ background: selectedHistory?.id === h.id ? 'rgba(26,110,245,0.06)' : 'var(--bg2)', border: `1px solid ${selectedHistory?.id === h.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (selectedHistory?.id !== h.id) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)' }}
            onMouseLeave={e => { if (selectedHistory?.id !== h.id) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3, marginBottom: '3px', flex: 1, paddingRight: '6px' }}>{h.name}</div>
              <button onClick={(e) => deleteHistory(h.id, e)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '0.75rem', cursor: 'pointer', padding: '0', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: '3px', fontFamily: 'var(--font-mono)' }}>{h.promo_code}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{h.domain} · {h.reward_type}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: '3px' }}>{new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

// ─── BRIEF PREVIEW COMPONENT ──────────────────────────
function BriefPreview({ data: d, clauses, stds }) {
  if (!d || !clauses) return null
  const isSp = d.isSports

  let num = 1
  const clauseRows = clauses.map(c => {
    const n = num++
    const shade = n % 2 === 0 ? '#f7f9fc' : '#fff'
    return (
      <tr key={n}>
        <td style={{ border: '1px solid #dde1ea', padding: '5px 9px', verticalAlign: 'top', background: shade }}>
          <div style={{ display: 'flex', gap: '7px' }}><span style={{ fontWeight: 700, color: '#00163B', minWidth: '18px' }}>{n}.</span><span>{c.en}</span></div>
        </td>
        <td style={{ border: '1px solid #dde1ea', padding: '5px 9px', verticalAlign: 'top', background: shade }}>
          <div style={{ display: 'flex', gap: '7px' }}><span style={{ fontWeight: 700, color: '#00163B', minWidth: '18px' }}>{n}.</span><span>{c.tr}</span></div>
        </td>
      </tr>
    )
  })

  const stdRows = stds.flatMap(s => {
    const hdr = (
      <tr key={`hdr-${s.title}`}>
        <td colSpan={2} style={{ background: '#1F3560', padding: '5px 9px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '10.5px' }}>{s.title} &nbsp;/&nbsp; {s.tr}</span>
        </td>
      </tr>
    )
    const rows = s.clauses.map((c, i) => {
      const shade = i % 2 === 0 ? '#fff' : '#f7f9fc'
      return (
        <tr key={`${s.title}-${i}`}>
          <td style={{ border: '1px solid #dde1ea', padding: '5px 9px', verticalAlign: 'top', background: shade }}>
            <div style={{ display: 'flex', gap: '7px' }}><span style={{ fontWeight: 700, color: '#00163B', minWidth: '18px' }}>{i + 1}.</span><span style={{ color: '#777', fontStyle: 'italic', fontSize: '11px' }}>{c[0]}</span></div>
          </td>
          <td style={{ border: '1px solid #dde1ea', padding: '5px 9px', verticalAlign: 'top', background: shade }}>
            <div style={{ display: 'flex', gap: '7px' }}><span style={{ fontWeight: 700, color: '#00163B', minWidth: '18px' }}>{i + 1}.</span><span style={{ color: '#777', fontStyle: 'italic', fontSize: '11px' }}>{c[1]}</span></div>
          </td>
        </tr>
      )
    })
    return [hdr, ...rows]
  })

  return (
    <div style={{ background: '#fff', fontFamily: 'Arial, sans-serif', fontSize: '11.5px', lineHeight: 1.5, padding: '24px 28px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#00163B', borderBottom: '2px solid #3FA9F5', paddingBottom: '6px', marginBottom: '8px' }}>Bonus Brief</div>
      <div style={{ fontSize: '10.5px', color: '#555', marginBottom: '14px', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
        <span><strong style={{ color: '#00163B' }}>Code:</strong> {d.promoCode}</span>
        <span><strong style={{ color: '#00163B' }}>Domain:</strong> {d.domain}</span>
        <span><strong style={{ color: '#00163B' }}>Audience:</strong> {d.tc}</span>
        <span><strong style={{ color: '#00163B' }}>Reward:</strong> {d.rewardStr}</span>
      </div>
      <div style={{ background: '#EFF6FF', borderLeft: '4px solid #3FA9F5', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', borderRadius: '0 4px 4px 0', lineHeight: 1.6 }}>{d.summary}</div>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#00163B', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '16px 0 6px', paddingBottom: '3px', borderBottom: '1px solid #D4D8E0' }}>⚙ Mechanism</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '0' }}>
        <thead>
          <tr><th style={{ background: '#00163B', color: '#fff', padding: '6px 9px', textAlign: 'left', width: '50%' }}>Qualification</th><th style={{ background: '#00163B', color: '#fff', padding: '6px 9px', textAlign: 'left', width: '50%' }}>Crediting</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #dde1ea', padding: '6px 9px', verticalAlign: 'top' }}>
              <strong>Product:</strong> {d.product}<br />
              <strong>Game(s)/Event(s):</strong> {d.games || 'All'}<br />
              {isSp && <><strong>Market:</strong> {d.market || 'Any'}<br /></>}
              {isSp && <><strong>Pre-Live/Live:</strong> {d.betType || 'Both'}<br /></>}
              <strong>Trigger:</strong> {d.trigger}<br />
              <strong>Opt-in:</strong> {d.optIn ? 'Yes' : 'No'}<br />
              <strong>Min. Stake/Dep:</strong> {d.minStake || 'None'}<br />
              {isSp && <><strong>Min. Odds:</strong> {d.minOdds || 'N/A'}<br /></>}
              <strong>Qualify from:</strong> {d.sd || '—'}{d.days ? ` (${d.days})` : ''}{d.hours ? `, ${d.hours}` : ''}<br />
              <strong>Till:</strong> {d.ed || '—'}<br />
              <strong>Incentive:</strong> {d.incentive || '—'}<br />
              <strong>Tier Code:</strong> {d.tc}<br />
              <strong>Repeat:</strong> {d.repeat}
            </td>
            <td style={{ border: '1px solid #dde1ea', padding: '6px 9px', verticalAlign: 'top' }}>
              <strong>Reward Type:</strong> {d.rewardStr}<br />
              <strong>Campaign Code:</strong> {d.rtc}<br />
              <strong>Reporting Tag:</strong> {d.bc}<br />
              <strong>Max. Amount:</strong> {d.maxReward || '—'}<br />
              <strong>Crediting Date:</strong> {d.cred || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#00163B', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '16px 0 6px', paddingBottom: '3px', borderBottom: '1px solid #D4D8E0' }}>📋 Terms &amp; Conditions</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            <th style={{ background: '#00163B', color: '#fff', padding: '6px 9px', textAlign: 'left', width: '50%' }}>English</th>
            <th style={{ background: '#00163B', color: '#fff', padding: '6px 9px', textAlign: 'left', width: '50%' }}>Turkish / Türkçe</th>
          </tr>
        </thead>
        <tbody>
          {clauseRows}
          {stdRows}
          <tr>
            <td colSpan={2} style={{ border: '1px solid #dde1ea', padding: '5px 9px', background: '#fafbfc', fontStyle: 'italic', fontSize: '10.5px', color: '#888' }}>
              General Terms &amp; Conditions apply. &nbsp;/&nbsp; Genel Hüküm ve Koşullar geçerlidir.
            </td>
          </tr>
        </tbody>
      </table>

      {d.notes && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#00163B', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '16px 0 6px', paddingBottom: '3px', borderBottom: '1px solid #D4D8E0' }}>📎 Notes (internal)</div>
          <div style={{ fontSize: '11px', color: '#555', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{d.notes}</div>
        </>
      )}
    </div>
  )
}
