import { useState, useEffect, useRef, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { rust } from '@codemirror/lang-rust'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { marked } from 'marked'
import type { Extension } from '@codemirror/state'
import './App.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  issues: string[]
  suggestion: string
}

// ── Language config ───────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', dot: '#3178C6' },
  { id: 'javascript', label: 'JavaScript', dot: '#F7DF1E' },
  { id: 'python',     label: 'Python',     dot: '#3776AB' },
  { id: 'html',       label: 'HTML',       dot: '#E44D26' },
  { id: 'css',        label: 'CSS',        dot: '#264DE4' },
  { id: 'json',       label: 'JSON',       dot: '#8BC34A' },
  { id: 'sql',        label: 'SQL',        dot: '#E38C00' },
  { id: 'rust',       label: 'Rust',       dot: '#CE422B' },
  { id: 'java',       label: 'Java',       dot: '#007396' },
  { id: 'cpp',        label: 'C++',        dot: '#00599C' },
] as const

type LangId = typeof LANGUAGES[number]['id']

function getLangExtension(id: LangId): Extension {
  switch (id) {
    case 'typescript': return javascript({ typescript: true, jsx: true })
    case 'javascript': return javascript({ jsx: true })
    case 'python':     return python()
    case 'html':       return html()
    case 'css':        return css()
    case 'json':       return json()
    case 'sql':        return sql()
    case 'rust':       return rust()
    case 'java':       return java()
    case 'cpp':        return cpp()
  }
}

// ── Grade config ──────────────────────────────────────────────────────────────

const GRADE_CONFIG = {
  A: { color: '#34D399', glow: 'rgba(52,211,153,0.4)',  bg: 'rgba(52,211,153,0.1)',  label: 'Excellent' },
  B: { color: '#22D3EE', glow: 'rgba(34,211,238,0.4)',  bg: 'rgba(34,211,238,0.1)',  label: 'Good'      },
  C: { color: '#FBBF24', glow: 'rgba(251,191,36,0.4)',  bg: 'rgba(251,191,36,0.1)',  label: 'Fair'      },
  D: { color: '#FB923C', glow: 'rgba(251,146,60,0.4)',  bg: 'rgba(251,146,60,0.1)',  label: 'Poor'      },
  F: { color: '#F87171', glow: 'rgba(248,113,113,0.4)', bg: 'rgba(248,113,113,0.1)', label: 'Critical'  },
} as const

const CIRCUMFERENCE = 2 * Math.PI * 52

marked.use({ breaks: true, gfm: true })
function renderMd(text: string): string {
  const r = marked.parse(text)
  return typeof r === 'string' ? r : String(r)
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCode() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  )
}
function IconShield() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
}
function IconWarn() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}
function IconBug() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" /></svg>
}
function IconSparkle() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
}
function IconLoader() {
  return <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
}
function IconClear() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

function issueIcon(text: string) {
  const t = text.toLowerCase()
  if (t.includes('eval') || t.includes('xss') || t.includes('inject') || t.includes('credential') || t.includes('prototype') || t.includes('hardcoded')) return <IconShield />
  if (t.includes('bracket') || t.includes('unclosed') || t.includes('unmatched') || t.includes('syntax')) return <IconBug />
  return <IconWarn />
}
function issueColor(text: string) {
  const t = text.toLowerCase()
  if (t.includes('eval') || t.includes('xss') || t.includes('inject') || t.includes('credential') || t.includes('prototype') || t.includes('hardcoded')) return '#F87171'
  if (t.includes('bracket') || t.includes('unclosed') || t.includes('unmatched')) return '#FBBF24'
  return '#94A3B8'
}

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const [offset, setOffset] = useState(CIRCUMFERENCE)
  const [display, setDisplay] = useState(0)
  const cfg = GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.F

  useEffect(() => {
    const t1 = setTimeout(() => setOffset(CIRCUMFERENCE * (1 - score / 100)), 100)
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1200, 1)
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * score))
      if (p < 1) requestAnimationFrame(tick)
    }
    const t2 = setTimeout(() => requestAnimationFrame(tick), 100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [score])

  return (
    <div className="score-ring-wrap">
      <svg width="140" height="140" viewBox="0 0 120 120" overflow="visible">
        <defs>
          <filter id="rg" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={cfg.color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          transform="rotate(-90 60 60)" filter="url(#rg)"
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.34,1.2,0.64,1)' }} />
      </svg>
      <div className="score-ring-center">
        <span className="score-number" style={{ color: cfg.color }}>{display}</span>
        <span className="score-sub">/100</span>
      </div>
    </div>
  )
}

// ── Empty / Loading states ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><IconCode /></div>
      <p className="empty-title">Paste your code on the left</p>
      <p className="empty-desc">CodeLM runs syntax analysis, detects code smells, audits security, then gives you a detailed Markdown report.</p>
      <div className="empty-tags">
        {['Syntax Analysis', 'Code Smells', 'Security Audit', 'Quality Score'].map(t => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="loading-state">
      <div className="thinking-ring">
        <svg width="72" height="72" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(129,140,248,0.12)" strokeWidth="5" />
          <circle cx="40" cy="40" r="30" fill="none" stroke="#818CF8" strokeWidth="5"
            strokeLinecap="round" strokeDasharray="50 140" transform="rotate(-90 40 40)"
            className="thinking-arc" />
        </svg>
        <div className="thinking-icon" style={{ color: '#818CF8' }}><IconSparkle /></div>
      </div>
      <p className="thinking-label">CodeLM is thinking<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
      <div className="skeleton-lines">
        {[70, 50, 85, 40, 65].map((w, i) => (
          <div key={i} className="skel" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  )
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result }: { result: AnalysisResult }) {
  const cfg = GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F
  return (
    <div className="results fade-in">
      <div className="score-row">
        <ScoreRing score={result.score} grade={result.grade} />
        <div className="grade-block">
          <div className="grade-badge" style={{ color: cfg.color, background: cfg.bg, boxShadow: `0 0 28px ${cfg.glow}` }}>
            {result.grade}
          </div>
          <span className="grade-label" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="grade-sub">{result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} detected</span>
        </div>
      </div>

      {result.issues.length > 0 && (
        <div className="issues-section">
          <h3 className="section-title">Issues Detected</h3>
          <ul className="issues-list">
            {result.issues.map((issue, i) => (
              <li key={i} className="issue-item stagger-in"
                style={{ animationDelay: `${i * 55}ms`, borderColor: `${issueColor(issue)}20` }}>
                <span className="issue-icon" style={{ color: issueColor(issue) }}>{issueIcon(issue)}</span>
                <span style={{ color: issueColor(issue) === '#94A3B8' ? '#CBD5E1' : issueColor(issue) }}>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.suggestion && (
        <div className="suggestion-section">
          <h3 className="section-title"><IconSparkle /> AI Review</h3>
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMd(result.suggestion) }} />
        </div>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [code, setCode]         = useState('')
  const [lang, setLang]         = useState<LangId>('typescript')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<AnalysisResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const errorTimer              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeLang = LANGUAGES.find(l => l.id === lang)!

  const showError = useCallback((msg: string) => {
    setError(msg)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 5000)
  }, [])

  const analyze = useCallback(async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      setResult(await res.json() as AnalysisResult)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unexpected error — is the backend running on :3000?')
    } finally {
      setLoading(false)
    }
  }, [code, loading, showError])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void analyze()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [analyze])

  const lines = code ? code.split('\n').length : 0

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon"><IconCode /></span>
            <span className="logo-text">Code<span className="logo-accent">LM</span></span>
          </div>
          <span className="logo-badge">AI Code Reviewer</span>
        </div>
        <span className="kbd-hint"><kbd>Ctrl</kbd><kbd>↵</kbd> to analyze</span>
      </header>

      <main className="main-grid">
        {/* Editor Panel */}
        <section className="editor-panel glass-card">
          <div className="panel-header">
            {/* Language select */}
            <div className="lang-select-wrap">
              <span className="lang-dot" style={{ background: activeLang.dot }} />
              <select
                className="lang-select"
                value={lang}
                onChange={e => setLang(e.target.value as LangId)}
                aria-label="Select language"
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <svg className="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            <div className="editor-meta">
              {lines > 0 && (
                <>
                  <span className="meta-pill">{lines} ln</span>
                  <span className="meta-pill">{code.length} ch</span>
                  <button className="clear-btn" onClick={() => { setCode(''); setResult(null) }} title="Clear">
                    <IconClear />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* CodeMirror editor */}
          <div className="editor-body">
            <CodeMirror
              value={code}
              onChange={setCode}
              theme={vscodeDark}
              extensions={[getLangExtension(lang)]}
              height="100%"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                indentOnInput: true,
                autocompletion: false,
                foldGutter: false,
              }}
              placeholder={`// Paste your ${activeLang.label} code here…`}
              aria-label="Code input"
              className="cm-outer"
            />
          </div>

          <div className="panel-footer">
            <button
              className={`analyze-btn ${loading ? 'loading' : ''}`}
              onClick={() => void analyze()}
              disabled={loading || !code.trim()}
              aria-busy={loading}
            >
              {loading ? <><IconLoader /> Analyzing…</> : <><IconSparkle /> Analyze Code</>}
            </button>
            {result && !loading && (
              <span className="footer-hint" style={{ color: (GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F).color }}>
                Score <strong>{result.score}/100</strong> · {(GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F).label}
              </span>
            )}
          </div>
        </section>

        {/* Results Panel */}
        <section className="results-panel glass-card">
          <div className="panel-header">
            <span className="panel-title">Analysis Report</span>
            {result && (
              <span className="panel-badge">
                Grade <strong style={{ color: (GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F).color }}>{result.grade}</strong>
              </span>
            )}
          </div>
          <div className="results-body">
            {loading  && <LoadingSkeleton />}
            {!loading && !result && <EmptyState />}
            {!loading && result  && <ResultsPanel result={result} />}
          </div>
        </section>
      </main>

      {error && (
        <div className="error-toast" role="alert" aria-live="assertive">
          <span style={{ color: '#F87171', flexShrink: 0 }}><IconWarn /></span>
          {error}
          <button className="toast-close" onClick={() => setError(null)} aria-label="Dismiss"><IconClear /></button>
        </div>
      )}
    </div>
  )
}
