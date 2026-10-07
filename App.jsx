import { useEffect, useMemo, useState } from 'react'
import { sections } from './content.js'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const Hl = ({ text, q }) => {
  if (!q) return text
  return text.split(new RegExp('(' + esc(q) + ')', 'ig')).map((t, i) =>
    t.toLowerCase() === q.toLowerCase() ? <mark key={i}>{t}</mark> : t)
}

const TOK = /(\/\/.*|`[^`]*`|"[^"]*"|'[^']*')|\b(import|from|export|default|function|const|var|let|return|class|extends|super|this|if|true|false)\b|(\b\d+\b)/g
function colorize(src) {
  const out = []; let last = 0, m, k = 0
  TOK.lastIndex = 0
  while ((m = TOK.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index))
    const cls = m[1] ? (m[1].startsWith('//') ? 'c' : 's') : m[2] ? 'k' : 'n'
    out.push(<span key={k++} className={'t-' + cls}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  out.push(src.slice(last)); return out
}

function Code({ text, out }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove() }
    setDone(true); setTimeout(() => setDone(false), 1500)
  }
  return (
    <div className={'code' + (out ? ' out' : '')}>
      <button className="copy" onClick={copy}>{done ? 'Copied' : 'Copy code'}</button>
      <pre><code>{out ? text : colorize(text)}</code></pre>
    </div>
  )
}

function Block({ b, q }) {
  const [t, v] = b
  if (t === 'p') return <p><Hl text={v} q={q} /></p>
  if (t === 'h') return <h3><Hl text={v} q={q} /></h3>
  if (t === 'ul') return <ul>{v.map((x, i) => <li key={i}><Hl text={x} q={q} /></li>)}</ul>
  if (t === 'ol') return <ol>{v.map((x, i) => <li key={i}><Hl text={x} q={q} /></li>)}</ol>
  if (t === 'code') return <Code text={v} />
  if (t === 'out') return <Code text={v} out />
  if (t === 'table') return (
    <div className="tablewrap"><table>
      <thead><tr>{v[0].map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>{v.slice(1).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Hl text={c} q={q} /></td>)}</tr>)}</tbody>
    </table></div>)
  if (t === 'flow') return (
    <div className="flow">{v.map(([a, d], i) => (
      <div key={i} className="flowstep"><strong>{a}</strong><span>{d}</span>{i < v.length - 1 && <em>↓</em>}</div>))}
    </div>)
  return null
}

const textOf = (s) => (s.title + ' ' + s.blocks.map(([t, v]) =>
  t === 'table' ? v.flat().join(' ') : t === 'flow' ? v.flat().join(' ') : Array.isArray(v) ? v.join(' ') : v).join(' ')).toLowerCase()

export default function App() {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(sections[0].id)
  const [menu, setMenu] = useState(false)
  const [top, setTop] = useState(false)
  const query = q.trim()
  const index = useMemo(() => sections.map(textOf), [])
  const shown = useMemo(() => query ? sections.filter((_, i) => index[i].includes(query.toLowerCase())) : sections, [query, index])
  const groups = [...new Set(sections.map((s) => s.group))]

  useEffect(() => {
    const onScroll = () => {
      setTop(window.scrollY > 400)
      let cur = shown[0]?.id
      for (const s of shown) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top < 120) cur = s.id }
      if (cur) setActive(cur)
    }
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [shown])

  const go = (id) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const pos = shown.findIndex((s) => s.id === active)

  return (
    <>
      <header className="hdr">
        <button className="burger" aria-label="Menu" onClick={() => setMenu(!menu)}>☰</button>
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>ETT Notes</a>
        <input className="search" type="search" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>
      <div className="layout">
        <nav className={'side' + (menu ? ' open' : '')}>
          {groups.map((g) => (
            <div key={g}><div className="grp">{g}</div>
              {sections.filter((s) => s.group === g).map((s) => (
                <button key={s.id} className={s.id === active ? 'on' : ''} onClick={() => go(s.id)}>{s.title}</button>))}
            </div>))}
        </nav>
        {menu && <div className="scrim" onClick={() => setMenu(false)} />}
        <main>
          {query && <p className="count">{shown.length} section{shown.length !== 1 && 's'} match “{query}”</p>}
          {shown.length === 0 && <p className="count">No results. Try a different word.</p>}
          {shown.map((s) => (
            <section key={s.id} id={s.id} className="card">
              <h2><Hl text={s.title} q={query} /></h2>
              {s.blocks.map((b, i) => <Block key={i} b={b} q={query} />)}
            </section>))}
          {shown.length > 0 && (
            <div className="pn">
              <button disabled={pos <= 0} onClick={() => go(shown[pos - 1].id)}>← Previous Topic</button>
              <button disabled={pos < 0 || pos >= shown.length - 1} onClick={() => go(shown[pos + 1].id)}>Next Topic →</button>
            </div>)}
        </main>
      </div>
      {top && <button className="totop" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑ Back to Top</button>}
      <footer><strong>ETT Notes</strong><br />Educational Study Material</footer>
    </>
  )
}
