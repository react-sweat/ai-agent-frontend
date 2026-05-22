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
import codelMLogo from './assets/CodeLM-logo-white.png'
import heroImg from './assets/hero.png'
import './App.css'

interface AnalysisResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  issues: string[]
  suggestion: string
  syntaxCount: number
  smellCount: number
  securityCount: number
}

interface ImprovementSummary {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  issues: string[]
  syntaxCount: number
  smellCount: number
  securityCount: number
}

interface RewriteResult {
  original: AnalysisResult
  rewrittenCode: string
  improved: ImprovementSummary
}

type BackendStatus = 'checking' | 'online' | 'offline'
type IssueFilter   = 'all' | 'security' | 'syntax' | 'quality'

const LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', dot: '#3178C6', ext: 'ts'   },
  { id: 'javascript', label: 'JavaScript', dot: '#F7DF1E', ext: 'js'   },
  { id: 'python',     label: 'Python',     dot: '#3776AB', ext: 'py'   },
  { id: 'html',       label: 'HTML',       dot: '#E44D26', ext: 'html' },
  { id: 'css',        label: 'CSS',        dot: '#264DE4', ext: 'css'  },
  { id: 'json',       label: 'JSON',       dot: '#8BC34A', ext: 'json' },
  { id: 'sql',        label: 'SQL',        dot: '#E38C00', ext: 'sql'  },
  { id: 'rust',       label: 'Rust',       dot: '#CE422B', ext: 'rs'   },
  { id: 'java',       label: 'Java',       dot: '#007396', ext: 'java' },
  { id: 'cpp',        label: 'C++',        dot: '#00599C', ext: 'cpp'  },
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

const GRADE_CONFIG = {
  A: { color: '#34D399', glow: 'rgba(52,211,153,0.3)',  bg: 'rgba(52,211,153,0.07)',  label: 'Excellent' },
  B: { color: '#22D3EE', glow: 'rgba(34,211,238,0.3)',  bg: 'rgba(34,211,238,0.07)',  label: 'Good'      },
  C: { color: '#FBBF24', glow: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.07)',  label: 'Fair'      },
  D: { color: '#FB923C', glow: 'rgba(251,146,60,0.3)',  bg: 'rgba(251,146,60,0.07)',  label: 'Poor'      },
  F: { color: '#F87171', glow: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.07)', label: 'Critical'  },
} as const

const ANALYSIS_STEPS = [
  'Running syntax analysis',
  'Detecting code smells',
  'Auditing security',
  'Generating report',
]

const REWRITE_STEPS = [
  'Running syntax analysis',
  'Detecting code smells',
  'Auditing security',
  'Generating review',
  'Rewriting code',
  'Verifying improvements',
]

marked.use({ breaks: true, gfm: true })
function renderMd(text: string): string {
  const r = marked.parse(text)
  return typeof r === 'string' ? r : String(r)
}

function classifyIssue(text: string): IssueFilter {
  const t = text.toLowerCase()
  if (
    t.includes('eval') || t.includes('xss') || t.includes('inject') ||
    t.includes('credential') || t.includes('prototype') ||
    t.includes('hardcoded') || t.includes('http://') || t.includes('innerhtml') ||
    t.includes('document.write') || t.includes('math.random') || t.includes('settimeout') ||
    t.includes('exec(')
  ) return 'security'
  if (
    t.includes('bracket') || t.includes('unclosed') ||
    t.includes('unmatched') || t.includes('syntax') || t.includes('semicolon')
  ) return 'syntax'
  return 'quality'
}

function issueColor(cls: IssueFilter): string {
  if (cls === 'security') return '#F87171'
  if (cls === 'syntax')   return '#FBBF24'
  return '#64748B'
}

function IconShield() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconWarn() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconBug() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
    </svg>
  )
}

function IconSparkle() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  )
}

function IconLoader() {
  return (
    <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function IconWand() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
    </svg>
  )
}

function issueIcon(cls: IssueFilter) {
  if (cls === 'security') return <IconShield />
  if (cls === 'syntax')   return <IconBug />
  return <IconWarn />
}

function ScoreRing({ score, grade, size = 128 }: { score: number; grade: string; size?: number }) {
  const r = size === 128 ? 52 : 32
  const circumference = 2 * Math.PI * r
  const [offset, setOffset] = useState(circumference)
  const [display, setDisplay] = useState(0)
  const cfg = GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.F

  useEffect(() => {
    const t1 = setTimeout(() => setOffset(circumference * (1 - score / 100)), 120)
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1100, 1)
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * score))
      if (p < 1) requestAnimationFrame(tick)
    }
    const t2 = setTimeout(() => requestAnimationFrame(tick), 120)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [score, circumference])

  const cx = size / 2
  const cy = size / 2
  const sw = size === 128 ? 6 : 4

  return (
    <div className="score-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
        <defs>
          <filter id={`glow-ring-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={cfg.color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          filter={`url(#glow-ring-${size})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)' }}
        />
      </svg>
      <div className="score-ring-center">
        <span className="score-number" style={{ color: cfg.color, fontSize: size === 128 ? 30 : 18 }}>{display}</span>
        {size === 128 && <span className="score-sub">/100</span>}
      </div>
    </div>
  )
}

function ScoreBreakdown({ syntaxCount, smellCount, securityCount }: {
  syntaxCount: number
  smellCount: number
  securityCount: number
}) {
  const total = syntaxCount + smellCount + securityCount

  const rows = [
    { label: 'Security', count: securityCount, icon: <IconShield />, okColor: '#34D399', badColor: '#F87171', health: Math.max(0, 100 - Math.min(securityCount * 25, 100)) },
    { label: 'Syntax',   count: syntaxCount,   icon: <IconBug />,    okColor: '#34D399', badColor: '#FBBF24', health: Math.max(0, 100 - Math.min(syntaxCount * 20, 100))   },
    { label: 'Quality',  count: smellCount,    icon: <IconWarn />,   okColor: '#34D399', badColor: '#94A3B8', health: Math.max(0, 100 - Math.min(smellCount * 12, 100))    },
  ]

  if (total === 0) {
    return (
      <div className="breakdown-clean">
        <span className="breakdown-clean-icon"><IconCheck /></span>
        <span>All checks passed — no issues detected</span>
      </div>
    )
  }

  return (
    <div className="score-breakdown">
      {rows.map((row, i) => {
        const color = row.count === 0 ? row.okColor : row.badColor
        return (
          <div key={row.label} className="bd-row fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="bd-icon" style={{ color }}>{row.icon}</span>
            <span className="bd-label">{row.label}</span>
            <div className="bd-track">
              <div className="bd-fill" style={{ width: `${row.health}%`, background: color }} />
            </div>
            <span className="bd-count" style={{ color: row.count > 0 ? color : '#1E293B' }}>{row.count}</span>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <img src={heroImg} alt="" className="empty-hero" aria-hidden="true" />
      <div className="empty-body">
        <h3 className="empty-title">Ready to review</h3>
        <p className="empty-desc">Paste code in the editor, pick a language, and run the analysis.</p>
        <div className="empty-pipeline">
          {[
            { num: '1', label: 'Paste code',      sub: 'Any language supported'        },
            { num: '2', label: 'Select language',  sub: 'For accurate highlighting'     },
            { num: '3', label: 'Analyze or Rewrite', sub: 'Ctrl+Enter to analyze only' },
          ].map((step, i) => (
            <div key={i} className="ep-step">
              <div className="ep-num">{step.num}</div>
              <div className="ep-text">
                <strong>{step.label}</strong>
                <span>{step.sub}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="empty-chips">
          {['Syntax', 'Smells', 'Security', 'Score', 'AI Rewrite', 'Verify'].map(t => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoadingState({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="loading-state">
      <div className="steps-track">
        {steps.map((label, i) => (
          <div key={i} className={`step-row ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>
            <div className="step-indicator">
              {i < step
                ? <span className="step-check"><IconCheck /></span>
                : i === step
                  ? <IconLoader />
                  : <span className="step-dot" />
              }
            </div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IssueList({ issues }: { issues: string[] }) {
  const [filter, setFilter] = useState<IssueFilter>('all')
  const classified = issues.map(text => ({ text, cls: classifyIssue(text) }))
  const secCount  = classified.filter(i => i.cls === 'security').length
  const synCount  = classified.filter(i => i.cls === 'syntax').length
  const qualCount = classified.filter(i => i.cls === 'quality').length
  const visible   = filter === 'all' ? classified : classified.filter(i => i.cls === filter)

  if (issues.length === 0) return null

  return (
    <div className="issues-section">
      <div className="issues-header">
        <span className="section-label">Issues</span>
        <div className="filter-bar">
          {([
            { key: 'all'      as IssueFilter, label: 'All',      count: issues.length },
            { key: 'security' as IssueFilter, label: 'Security', count: secCount,  cls: 'sec'  },
            { key: 'syntax'   as IssueFilter, label: 'Syntax',   count: synCount,  cls: 'syn'  },
            { key: 'quality'  as IssueFilter, label: 'Quality',  count: qualCount, cls: 'qual' },
          ] as Array<{ key: IssueFilter; label: string; count: number; cls?: string }>)
            .filter(f => f.count > 0 || f.key === 'all')
            .map(f => (
              <button
                key={f.key}
                className={`filter-btn ${f.cls ?? ''} ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="filter-count">{f.count}</span>
              </button>
            ))
          }
        </div>
      </div>
      <ul className="issues-list">
        {visible.map((issue, i) => (
          <li
            key={`${issue.cls}-${i}`}
            className="issue-item stagger-in"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <span className="issue-icon" style={{ color: issueColor(issue.cls) }}>{issueIcon(issue.cls)}</span>
            <span className="issue-text">{issue.text}</span>
            <span className="issue-tag" style={{ color: issueColor(issue.cls), borderColor: `${issueColor(issue.cls)}28`, background: `${issueColor(issue.cls)}0d` }}>
              {issue.cls}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResultsPanel({ result, langLabel }: { result: AnalysisResult; langLabel: string }) {
  const cfg = GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F
  const mdRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mdRef.current
    if (!el) return
    el.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.copy-btn')) return
      const btn = document.createElement('button')
      btn.textContent = 'Copy'
      btn.className = 'copy-btn'
      btn.onclick = () => {
        void navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '')
        btn.textContent = '✓ Copied'
        btn.classList.add('copied')
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 2000)
      }
      pre.appendChild(btn)
    })
  }, [result.suggestion])

  return (
    <div className="results fade-in">
      <div className="score-card">
        <div className="score-left">
          <ScoreRing score={result.score} grade={result.grade} />
        </div>
        <div className="score-right">
          <div className="grade-row">
            <span className="grade-badge" style={{ color: cfg.color, background: cfg.bg, boxShadow: `0 0 20px ${cfg.glow}` }}>
              {result.grade}
            </span>
            <div className="grade-info">
              <span className="grade-label" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="grade-sub">{result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} · {langLabel}</span>
            </div>
          </div>
          <ScoreBreakdown syntaxCount={result.syntaxCount} smellCount={result.smellCount} securityCount={result.securityCount} />
        </div>
      </div>

      <IssueList issues={result.issues} />

      {result.suggestion && (
        <div className="report-section">
          <span className="section-label"><IconSparkle /> Report</span>
          <div className="markdown-body" ref={mdRef} dangerouslySetInnerHTML={{ __html: renderMd(result.suggestion) }} />
        </div>
      )}
    </div>
  )
}

function RewriteResultsPanel({ result, lang }: { result: RewriteResult; lang: LangId; langLabel: string }) {
  const [codeCopied, setCodeCopied] = useState(false)
  const mdRef = useRef<HTMLDivElement>(null)
  const delta = result.improved.score - result.original.score
  const origCfg = GRADE_CONFIG[result.original.grade] ?? GRADE_CONFIG.F
  const impCfg  = GRADE_CONFIG[result.improved.grade] ?? GRADE_CONFIG.F

  useEffect(() => {
    const el = mdRef.current
    if (!el) return
    el.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.copy-btn')) return
      const btn = document.createElement('button')
      btn.textContent = 'Copy'
      btn.className = 'copy-btn'
      btn.onclick = () => {
        void navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '')
        btn.textContent = '✓ Copied'
        btn.classList.add('copied')
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 2000)
      }
      pre.appendChild(btn)
    })
  }, [result.original.suggestion])

  const copyCode = () => {
    void navigator.clipboard.writeText(result.rewrittenCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2200)
  }

  return (
    <div className="results fade-in">
      {/* Score comparison */}
      <div className="score-compare-card">
        <div className="score-compare-side">
          <span className="score-compare-label">Before</span>
          <ScoreRing score={result.original.score} grade={result.original.grade} size={80} />
          <span className="score-compare-grade" style={{ color: origCfg.color }}>{result.original.grade}</span>
          <span className="score-compare-sub" style={{ color: origCfg.color }}>{result.original.score}/100</span>
        </div>

        <div className="score-compare-arrow">
          <div className={`score-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
            {delta >= 0 ? '+' : ''}{delta}
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>

        <div className="score-compare-side">
          <span className="score-compare-label">After</span>
          <ScoreRing score={result.improved.score} grade={result.improved.grade} size={80} />
          <span className="score-compare-grade" style={{ color: impCfg.color }}>{result.improved.grade}</span>
          <span className="score-compare-sub" style={{ color: impCfg.color }}>{result.improved.score}/100</span>
        </div>
      </div>

      {/* Issue comparison badges */}
      <div className="issue-compare-row">
        {[
          { label: 'Security', before: result.original.securityCount, after: result.improved.securityCount, color: '#F87171' },
          { label: 'Syntax',   before: result.original.syntaxCount,   after: result.improved.syntaxCount,   color: '#FBBF24' },
          { label: 'Quality',  before: result.original.smellCount,    after: result.improved.smellCount,    color: '#64748B' },
        ].map(row => {
          const diff = row.after - row.before
          return (
            <div key={row.label} className="issue-compare-chip">
              <span className="icc-label">{row.label}</span>
              <span className="icc-val" style={{ color: row.color }}>{row.before}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              <span className="icc-val" style={{ color: diff < 0 ? '#34D399' : diff > 0 ? '#F87171' : '#334155' }}>{row.after}</span>
            </div>
          )
        })}
      </div>

      {/* Fixed code editor */}
      <div className="fixed-code-section">
        <div className="fixed-code-header">
          <span className="section-label"><IconWand /> Fixed Code</span>
          <button
            className={`copy-report-btn ${codeCopied ? 'copied' : ''}`}
            onClick={copyCode}
          >
            {codeCopied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy code</>}
          </button>
        </div>
        <div className="fixed-code-editor">
          <CodeMirror
            value={result.rewrittenCode}
            theme={vscodeDark}
            extensions={[getLangExtension(lang)]}
            editable={false}
            basicSetup={{
              lineNumbers: true,
              syntaxHighlighting: true,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
              bracketMatching: true,
              foldGutter: false,
              autocompletion: false,
            }}
            className="cm-outer cm-readonly"
          />
        </div>
      </div>

      {/* Original report */}
      {result.original.suggestion && (
        <div className="report-section">
          <span className="section-label"><IconSparkle /> Original Report</span>
          <div className="markdown-body" ref={mdRef} dangerouslySetInnerHTML={{ __html: renderMd(result.original.suggestion) }} />
        </div>
      )}

      {/* Remaining issues after rewrite */}
      {result.improved.issues.length > 0 && (
        <div>
          <span className="section-label" style={{ marginBottom: 8, display: 'block' }}>Remaining Issues</span>
          <IssueList issues={result.improved.issues} />
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [code, setCode]               = useState('')
  const [lang, setLang]               = useState<LangId>('typescript')
  const [loading, setLoading]         = useState(false)
  const [loadingMode, setLoadingMode] = useState<'analyze' | 'rewrite'>('analyze')
  const [result, setResult]           = useState<AnalysisResult | null>(null)
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [status, setStatus]           = useState<BackendStatus>('checking')
  const [step, setStep]               = useState(0)
  const [reportCopied, setReportCopied] = useState(false)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeLang = LANGUAGES.find(l => l.id === lang)!
  const activeSteps = loadingMode === 'rewrite' ? REWRITE_STEPS : ANALYSIS_STEPS

  useEffect(() => {
    fetch('/api/agent/ping', { method: 'POST' })
      .then(r => setStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
  }, [])

  useEffect(() => {
    if (!loading) { setStep(0); return }
    setStep(0)
    const interval = loadingMode === 'rewrite' ? 1800 : 2200
    const id = setInterval(() => setStep(s => Math.min(s + 1, activeSteps.length - 1)), interval)
    return () => clearInterval(id)
  }, [loading, loadingMode, activeSteps.length])

  const showError = useCallback((msg: string) => {
    setError(msg)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 6000)
  }, [])

  const analyze = useCallback(async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setLoadingMode('analyze')
    setResult(null)
    setRewriteResult(null)
    setError(null)
    try {
      const res = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang }),
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
  }, [code, lang, loading, showError])

  const analyzeAndRewrite = useCallback(async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setLoadingMode('rewrite')
    setResult(null)
    setRewriteResult(null)
    setError(null)
    try {
      const res = await fetch('/api/agent/analyze-and-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      setRewriteResult(await res.json() as RewriteResult)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unexpected error — is the backend running on :3000?')
    } finally {
      setLoading(false)
    }
  }, [code, lang, loading, showError])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void analyze()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [analyze])

  const copyReport = useCallback(() => {
    if (!result?.suggestion) return
    void navigator.clipboard.writeText(result.suggestion)
    setReportCopied(true)
    setTimeout(() => setReportCopied(false), 2200)
  }, [result])

  const activeResult = result ?? rewriteResult
  const currentScore = result?.score ?? rewriteResult?.improved.score
  const currentGrade = result?.grade ?? rewriteResult?.improved.grade

  const lines  = code ? code.split('\n').length : 0
  const kbSize = new TextEncoder().encode(code).length / 1024

  return (
    <div className="app">
      {loading && <div className="top-bar" />}

      <header className="header">
        <div className="header-left">
          <img src={codelMLogo} alt="CodeLM" className="logo-img" />
          <span className={`status-pill ${status}`}>
            <span className="status-dot-inner" />
            {status === 'online' ? 'Connected' : status === 'offline' ? 'Offline' : 'Connecting'}
          </span>
        </div>
        <div className="header-right">
          <span className="kbd-hint">
            <kbd>Ctrl</kbd><kbd>↵</kbd>
            <span className="kbd-label">Analyze</span>
          </span>
        </div>
      </header>

      <main className="main-grid">
        <section className="editor-panel glass-card">
          <div className="panel-header">
            <div className="file-tab">
              <span className="file-dot" style={{ background: activeLang.dot }} />
              <span className="file-name">untitled.{activeLang.ext}</span>
            </div>
            <div className="panel-header-right">
              <div className="lang-select-wrap">
                <select
                  className="lang-select"
                  value={lang}
                  onChange={e => { setLang(e.target.value as LangId); setResult(null); setRewriteResult(null) }}
                  aria-label="Select language"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <svg className="select-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {lines > 0 && (
                <div className="editor-meta">
                  <span className="meta-pill">{lines} ln</span>
                  <span className="meta-pill">{kbSize.toFixed(1)} KB</span>
                  <button className="clear-btn" onClick={() => { setCode(''); setResult(null); setRewriteResult(null) }} title="Clear editor">
                    <IconX />
                  </button>
                </div>
              )}
            </div>
          </div>

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
              placeholder={`Paste your ${activeLang.label} here…`}
              aria-label="Code input"
              className="cm-outer"
            />
          </div>

          <div className="panel-footer">
            <button
              className={`analyze-btn ${loading && loadingMode === 'analyze' ? 'loading' : ''}`}
              onClick={() => void analyze()}
              disabled={loading || !code.trim()}
              aria-busy={loading && loadingMode === 'analyze'}
              title="Ctrl+Enter"
            >
              <span className="btn-shimmer" />
              {loading && loadingMode === 'analyze'
                ? <><IconLoader /><span>Analyzing…</span></>
                : <><IconSparkle /><span>Analyze</span></>
              }
            </button>

            <button
              className={`rewrite-btn ${loading && loadingMode === 'rewrite' ? 'loading' : ''}`}
              onClick={() => void analyzeAndRewrite()}
              disabled={loading || !code.trim()}
              aria-busy={loading && loadingMode === 'rewrite'}
              title="Analyze, rewrite, and verify"
            >
              <span className="btn-shimmer" />
              {loading && loadingMode === 'rewrite'
                ? <><IconLoader /><span>Rewriting…</span></>
                : <><IconWand /><span>Analyze & Rewrite</span></>
              }
            </button>

            {activeResult && !loading && currentScore !== undefined && currentGrade !== undefined && (
              <span className="footer-score" style={{ color: (GRADE_CONFIG[currentGrade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.F).color }}>
                <strong>{currentScore}</strong>/100 · {(GRADE_CONFIG[currentGrade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.F).label}
              </span>
            )}
          </div>
        </section>

        <section className="results-panel glass-card">
          <div className="panel-header">
            <div className="file-tab">
              <span className="panel-title-text">
                {rewriteResult ? 'Rewrite Report' : 'Analysis Report'}
              </span>
            </div>
            <div className="panel-header-right">
              {result && !loading && (
                <>
                  <button
                    className={`copy-report-btn ${reportCopied ? 'copied' : ''}`}
                    onClick={copyReport}
                    title="Copy report markdown"
                  >
                    {reportCopied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
                  </button>
                  <span
                    className="report-badge"
                    style={{
                      color: (GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F).color,
                      borderColor: `${(GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F).color}28`,
                      background: (GRADE_CONFIG[result.grade] ?? GRADE_CONFIG.F).bg,
                    }}
                  >
                    Grade {result.grade}
                  </span>
                </>
              )}
              {rewriteResult && !loading && (
                <span
                  className="report-badge"
                  style={{
                    color: (GRADE_CONFIG[rewriteResult.improved.grade] ?? GRADE_CONFIG.F).color,
                    borderColor: `${(GRADE_CONFIG[rewriteResult.improved.grade] ?? GRADE_CONFIG.F).color}28`,
                    background: (GRADE_CONFIG[rewriteResult.improved.grade] ?? GRADE_CONFIG.F).bg,
                  }}
                >
                  {rewriteResult.original.grade} → {rewriteResult.improved.grade}
                </span>
              )}
            </div>
          </div>
          <div className="results-body">
            {loading     && <LoadingState steps={activeSteps} step={step} />}
            {!loading && !result && !rewriteResult && <EmptyState />}
            {!loading && result      && <ResultsPanel result={result} langLabel={activeLang.label} />}
            {!loading && rewriteResult && <RewriteResultsPanel result={rewriteResult} lang={lang} langLabel={activeLang.label} />}
          </div>
        </section>
      </main>

      {error && (
        <div className="error-toast" role="alert" aria-live="assertive">
          <span className="toast-icon"><IconWarn /></span>
          <span>{error}</span>
          <button className="toast-close" onClick={() => setError(null)} aria-label="Dismiss">
            <IconX />
          </button>
        </div>
      )}
    </div>
  )
}
