import { useEffect, useState, type FormEvent } from 'react'
import { authApi, type User } from './api/auth'
import { dashboardApi, type Dashboard as DashboardData } from './api/dashboard'
import { projectApi, type Project } from './api/projects'
import { reviewApi, type Review as ApiReview } from './api/reviews'
import './App.css'

type View = 'review' | 'new' | 'reviews' | 'dashboard'
type Severity = 'critical' | 'warning' | 'suggestion' | 'success'
type SubmitMode = 'code' | 'diff' | 'file'

const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'new', label: 'New Review', icon: 'new' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'reviews', label: 'Reviews', icon: 'reviews' },
  { id: 'review', label: 'Review details', icon: 'projects' },
]

type DisplayFinding = { title: string; file: string; line: number; severity: Severity; detail: string }
type ReviewRow = readonly [string, string, string, number, number, string, string]

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === 'new' && <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />}
      {name === 'dashboard' && <path d="M4 13h6v7H4zM14 4h6v16h-6zM4 4h6v5H4z" />}
      {name === 'reviews' && <path d="M5 5h14M5 12h14M5 19h14M8 3v4M8 10v4M8 17v4" />}
      {name === 'projects' && <path d="M3 7h7l2 3h9v9H3z" />}
      {name === 'settings' && <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />}
      {name === 'bell' && <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />}
      {name === 'branch' && <path d="M7 4v9a4 4 0 0 0 4 4h6M17 13l4 4-4 4M7 4a2 2 0 1 0 0 .1" />}
      {name === 'spark' && <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6zM19 16l.8 3.2L23 20l-3.2.8L19 24l-.8-3.2L15 20l3.2-.8z" />}
      {name === 'upload' && <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />}
      {name === 'repo' && <path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h6" />}
    </svg>
  )
}

function Sidebar({ active, setActive, user, onLogout }: { active: View; setActive: (view: View) => void; user?: User; onLogout: () => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" type="button" onClick={() => setActive('review')}>
        <span className="brand-mark">&lt;/&gt;</span>
        <span>CodeReviewer</span>
      </button>
      <nav>
        {navItems.map((item) => (
          <button
            className={active === item.id ? 'active' : ''}
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="profile">
        <span className="avatar">{(user?.name ?? 'User').split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
        <div>
          <strong>{user?.name ?? 'User'}</strong>
          <small>{user?.email ?? ''}</small>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  )
}

function Shell({ active, setActive, user, onLogout, children }: { active: View; setActive: (view: View) => void; user?: User; onLogout: () => void; children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <Sidebar active={active} setActive={setActive} user={user} onLogout={onLogout} />
      {children}
    </main>
  )
}

function Header({ review }: { review?: ApiReview | null }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <strong>{review?.findings[0]?.filePath ?? 'Submitted content'}</strong>
      </div>
      <div className="top-actions">
        <span className="review-id">{review?.pullRequestNumber ? `Review #${review.pullRequestNumber}` : `Review ${review?.id.slice(-6) ?? ''}`}</span>
        <span className={`pill ${review?.status === 'FAILED' ? 'rejected' : 'success'}`}>{review?.status ?? 'No review selected'}</span>
        
      </div>
    </header>
  )
}

function CodePane({ review }: { review?: ApiReview | null }) {
  const dynamicLines = review?.inputContent
    ? review.inputContent.split(/\r?\n/).map((text, index) => ({
        no: index + 1,
        text,
        tone: text.startsWith('+') ? 'good' : text.startsWith('-') ? 'bad' : 'plain',
      }))
    : []

  return (
    <section className="code-pane">
      <div className="filebar">
        <span className="project-pill">{review?.project?.name ?? 'Project'}</span>
        <span className="branch"><Icon name="branch" /> {review?.project?.defaultBranch ?? ""}</span>
      </div>
      <Header review={review} />
      <div className="code-table" aria-label="Code review diff">
        {dynamicLines.map((line) => (
          <div className={`code-row ${line.tone}`} data-line={line.no} key={`${line.no}-${line.text}`}>
            <span className="line-no">{line.no}</span>
            <code>{line.text || ' '}</code>
          </div>
        ))}
      </div>
      {!review && <p>Select a review or submit code to begin.</p>}
      {review?.errorMessage && <p role="alert">{review.errorMessage}</p>}
      {review?.findings.map((finding) => <IssueCard finding={finding} key={finding.id} />)}
    </section>
  )
}

function IssueCard({ finding }: { finding: ApiReview['findings'][number] }) {
  return (
    <article className="issue-popover">
      <div className="issue-meta">
        <span className={`severity-dot ${toSeverity(finding.severity)}`}></span>
        <strong>{finding.severity}</strong><span>{finding.category}</span>
      </div>
      <h3>{finding.title}</h3>
      <p>{finding.filePath}:{finding.startLine}–{finding.endLine}</p>
      <p>{finding.description}</p>
      {finding.whyItMatters && <><h4>Why it matters</h4><p>{finding.whyItMatters}</p></>}
      {finding.suggestedFix && <><h4>Suggested fix</h4><pre>{finding.suggestedFix}</pre></>}
    </article>
  )
}

function toSeverity(severity?: string): Severity {
  if (severity === 'CRITICAL') return 'critical'
  if (severity === 'WARNING') return 'warning'
  if (severity === 'INFO' || severity === 'SUGGESTION') return 'suggestion'
  return 'success'
}

function ScorePanel({ review, onViewAllIssues }: { review?: ApiReview | null; onViewAllIssues: () => void }) {
  const visibleFindings = review
    ? review.findings.map((finding) => ({
        title: finding.title,
        file: finding.filePath,
        line: finding.startLine,
        severity: toSeverity(finding.severity),
        detail: finding.description,
      }))
    : []
  const score = review?.score ?? '—'

  return (
    <aside className="review-panel">
      <div className="panel-heading">
        <h2><Icon name="spark" /> AI Review</h2>
      </div>
      <div className="score-row">
        <div className="score-ring"><span>{score}</span><small>/100</small></div>
        <div>
          <strong className="score-label">{review?.status ?? "No review selected"}</strong>
          <p>Overall score</p>
          <small>{review?.summary ?? "Submit code to receive a review."}</small>
        </div>
      </div>
      <div className="stat-grid compact">
        <Metric value={String(review?.criticalCount ?? 0)} label="Critical" tone="critical" />
        <Metric value={String(review?.warningCount ?? 0)} label="Warnings" tone="warning" />
        <Metric value={String(review?.suggestionCount ?? 0)} label="Suggestions" tone="suggestion" />
        <Metric value={String(review?.totalIssues ?? 0)} label="Total Issues" />
      </div>
      <h3>Issues by category</h3>
      <Category label="Security" value={review?.findings.filter((finding) => finding.category === "SECURITY").length ?? 0} color="critical" />
      <Category label="Performance" value={review?.findings.filter((finding) => finding.category === "PERFORMANCE").length ?? 0} color="suggestion" />
      <Category label="Correctness" value={review?.findings.filter((finding) => finding.category === "CORRECTNESS").length ?? 0} color="warning" />
      <Category label="Code Quality" value={review?.findings.filter((finding) => finding.category === "CODE_QUALITY").length ?? 0} color="success" />
      <h3>Top Findings</h3>
      <div className="finding-list">
        {visibleFindings.map((finding) => (
          <Finding finding={finding} key={finding.title} />
        ))}
      </div>
      <button className="link-button" type="button" onClick={onViewAllIssues}>View all issues</button>
    </aside>
  )
}

function Metric({ value, label, tone }: { value: string; label: string; tone?: Severity }) {
  return (
    <div className="metric">
      <strong className={tone}>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Category({ label, value, color }: { label: string; value: number; color: Severity }) {
  return (
    <div className="category">
      <span><i className={`severity-dot ${color}`}></i>{label}</span>
      <div className="bar"><span className={color} style={{ width: `${Math.min(value * 22, 100)}%` }}></span></div>
      <strong>{value}</strong>
    </div>
  )
}

function Finding({ finding }: { finding: DisplayFinding }) {
  const jumpToLine = () => {
    document.querySelector(`[data-line="${finding.line}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <button className="finding" type="button" onClick={jumpToLine}>
      <span className={`finding-icon ${finding.severity}`}>{finding.line.toString().slice(-1)}</span>
      <div>
        <strong>{finding.title}</strong>
        <small>{finding.file}:{finding.line}</small>
      </div>
    </button>
  )
}

function ReviewWorkspace({ active, setActive, user, onLogout, review }: { active: View; setActive: (view: View) => void; user?: User; onLogout: () => void; review?: ApiReview | null }) {
  return (
    <Shell active={active} setActive={setActive} user={user} onLogout={onLogout}>
      <div className="workspace">
        <CodePane review={review} />
        <ScorePanel review={review} onViewAllIssues={() => setActive('reviews')} />
      </div>
    </Shell>
  )
}

function NewReview({
  active,
  setActive,
  user,
  onLogout,
  projects,
  onSubmitReview,
  busy,
  message,
}: {
  active: View
  setActive: (view: View) => void
  user?: User
  onLogout: () => void
  projects: Project[]
  onSubmitReview: (input: { mode: SubmitMode; content: string; language: string; projectId?: string }) => Promise<void>
  busy: boolean
  message?: string
}) {
  const [mode, setMode] = useState<SubmitMode>('code')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [projectId, setProjectId] = useState('')

  return (
    <Shell active={active} setActive={setActive} user={user} onLogout={onLogout}>
      <section className="page narrow">
        <div className="page-title">
          <h1>New Code Review</h1>
          <p>Choose how you want to submit your code for review</p>
        </div>
        <div className="segmented">
          <button className={mode === 'code' ? 'selected' : ''} type="button" onClick={() => setMode('code')}><Icon name="new" /> Paste Code</button>
          <button className={mode === 'diff' ? 'selected' : ''} type="button" onClick={() => setMode('diff')}><Icon name="upload" /> Paste Diff</button>
          <button className={mode === 'file' ? 'selected' : ''} type="button" onClick={() => setMode('file')}><Icon name="repo" /> Code File</button>
        </div>
        <form className="review-form" onSubmit={(event) => {
          event.preventDefault()
          void onSubmitReview({ mode, content, language, projectId: projectId || projects[0]?.id })
        }}>
          <div className="form-heading">
            <div>
              <label htmlFor="code-input">Paste your code or diff</label>
              <p>Paste your code, git diff, or a pull request diff below.</p>
            </div>
            <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
            </select>
          </div>
          <select aria-label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">{projects[0] ? `Default project: ${projects[0].name}` : 'Create default project on submit'}</option>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
          </select>
          <textarea maxLength={32000} required id="code-input" placeholder="Paste your code or diff here..." value={content} onChange={(event) => setContent(event.target.value)} />
          {message && <p className="status-message">{message}</p>}
          <div className="tips">
            <strong>Tips:</strong>
            <span>Paste a git diff for best results</span>
            <span>You can paste multiple files</span>
            <span>Maximum content: 32,000 characters; model context may impose a smaller limit.</span>
          </div>
          <div className="form-actions">
            <button type="reset" onClick={() => setContent('')}>Clear</button>
            <button className="primary" type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit Review'}</button>
          </div>
        </form>
      </section>
    </Shell>
  )
}

function formatReviewRow(review: ApiReview) {
  return [
    review.summary ?? 'Code review',
    review.project?.name ?? 'Project',
    review.pullRequestNumber ? `PR #${review.pullRequestNumber}` : review.commitSha ? `commit ${review.commitSha}` : review.id.slice(-8),
    review.score ?? 0,
    review.totalIssues,
    review.status,
    new Date(review.createdAt).toLocaleString(),
  ] as const
}

function ReviewsPage({
  active,
  setActive,
  user,
  onLogout,
  apiReviews,
  onOpenReview,
  onDeleteReview,
  onRefreshReviews,
}: {
  active: View
  setActive: (view: View) => void
  user?: User
  onLogout: () => void
  apiReviews: ApiReview[]
  onOpenReview: (review: ApiReview) => void
  onDeleteReview: (review: ApiReview) => Promise<void>
  onRefreshReviews: (query?: Record<string, string>) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const rows = apiReviews.map(formatReviewRow)

  return (
    <Shell active={active} setActive={setActive} user={user} onLogout={onLogout}>
      <section className="page">
        <div className="page-header">
          <div>
            <h1>Reviews</h1>
            <p>View and manage your code reviews</p>
          </div>
          <button className="primary" type="button" onClick={() => setActive('new')}>New Review</button>
        </div>
        <div className="filters">
          <input aria-label="Search reviews" placeholder="Search reviews..." value={search} onChange={(event) => setSearch(event.target.value)} />
          
          <select aria-label="Status" onChange={(event) => void onRefreshReviews({ search, status: event.target.value }).catch((error: Error) => setError(error.message))}>
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="ANALYZING">Analyzing</option>
          </select>
          
          <button type="button" onClick={() => void onRefreshReviews({ search }).catch((error: Error) => setError(error.message))}>Search</button>
        </div>
        {error && <p role="alert">{error}</p>}
        {!rows.length && <p>No reviews found.</p>}
        <div className="table-card">
          <table>
            <thead>
              <tr><th>Review</th><th>Project</th><th>PR / Commit</th><th>Score</th><th>Issues</th><th>Status</th><th>Reviewed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((review, index) => (
                <tr key={review[0].toString()}>
                  <td><button className="table-link" type="button" onClick={() => apiReviews[index] ? onOpenReview(apiReviews[index]) : setActive('review')}>{review[0]}</button></td>
                  <td>{review[1]}</td>
                  <td>{review[2]}</td>
                  <td><span className={Number(review[3]) < 70 ? 'warning' : 'success'}>{review[3]}/100</span></td>
                  <td>{review[4]}</td>
                  <td><span className={review[5] === 'COMPLETED' ? 'pill success' : 'pill rejected'}>{review[5]}</span></td>
                  <td>{review[6]}</td>
                  <td>{apiReviews[index] && <button type="button" onClick={() => void onDeleteReview(apiReviews[index]).catch((error: Error) => setError(error.message))}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  )
}

function Dashboard({ active, setActive, user, onLogout, data }: { active: View; setActive: (view: View) => void; user?: User; onLogout: () => void; data?: DashboardData | null }) {
  const scorePoints = (data?.scoreTrend ?? []).map((point, index, rows) => `${index * 380 / Math.max(rows.length - 1, 1)},${160 - point.averageScore * 1.6}`).join(' ')
  const categoryTotal = data ? Object.values(data.issuesByCategory).reduce((total, value) => total + value, 0) : 0
  const recentRows = (data?.recentReviews ?? []).map(formatReviewRow)

  return (
    <Shell active={active} setActive={setActive} user={user} onLogout={onLogout}>
      <section className="page dashboard">
        <div className="page-title compact-title">
          <h1>Dashboard</h1>
          <p>Overview of your code quality</p>
        </div>
        <div className="kpis">
          <Kpi label="Reviews" value={String(data?.reviewsPerformed ?? 0)} trend="latest workspace" />
          <Kpi label="Average Score" value={`${data?.averageScore ?? 0}/100`} trend="completed reviews" />
          <Kpi label="Critical Issues" value={String(data?.criticalIssues ?? 0)} trend="open and resolved" negative />
          <Kpi label="Issues Resolved" value={String(data?.issuesResolved ?? 0)} trend="resolved findings" />
        </div>
        <div className="dashboard-grid">
          <article className="panel chart-panel">
            <h2>Review Score Trend</h2>
            <svg viewBox="0 0 380 160" role="img" aria-label="Review score trend">
              <path className="grid-line" d="M0 120H380M0 80H380M0 40H380" />
              <polyline points={scorePoints} />
            </svg>
          </article>
          <article className="panel donut-panel">
            <h2>Issues by Category</h2>
            <div className="donut-wrap">
              <div className="donut" style={{ background: "radial-gradient(circle, #101827 0 48%, transparent 49%), #223044" }}><strong>{categoryTotal}</strong><span>Total</span></div>
              <ul>
                <li><i className="suggestion-bg"></i>Security <span>{data?.issuesByCategory.SECURITY ?? 0}</span></li>
                <li><i className="blue-bg"></i>Performance <span>{data?.issuesByCategory.PERFORMANCE ?? 0}</span></li>
                <li><i className="warning-bg"></i>Correctness <span>{data?.issuesByCategory.CORRECTNESS ?? 0}</span></li>
                <li><i className="success-bg"></i>Code Quality <span>{data?.issuesByCategory.CODE_QUALITY ?? 0}</span></li>
              </ul>
            </div>
          </article>
          <article className="panel">
            <h2>Recent Reviews</h2>
            {recentRows.map((review) => <MiniReview review={review} key={review[0].toString()} />)}
          </article>
          <article className="panel">
            <h2>Findings from recent reviews</h2>
            {(data?.recentReviews ?? []).flatMap((review) => review.findings).slice(0, 5).map((finding) => (
              <div className="issue-type" key={finding.id}>
                <span className={`finding-icon ${toSeverity(finding.severity)}`}>{finding.severity}</span>
                <span>{finding.title}</span>
              </div>
            ))}
          </article>
        </div>
      </section>
    </Shell>
  )
}

function Kpi({ label, value, trend, negative }: { label: string; value: string; trend: string; negative?: boolean }) {
  return (
    <article className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={negative ? 'negative' : ''}>{trend}</small>
    </article>
  )
}

function MiniReview({ review }: { review: ReviewRow }) {
  return (
    <div className="mini-review">
      <span className="avatar small">{review[0].toString().slice(0, 2)}</span>
      <div>
        <strong>{review[0]}</strong>
        <small>{review[1]} - {review[2]}</small>
      </div>
      <span className={Number(review[3]) < 70 ? 'warning' : 'success'}>{review[3]}/100</span>
    </div>
  )
}

function MobileReview({ active, setActive, review }: { active: View; setActive: (view: View) => void; review?: ApiReview | null }) {
  return (
    <section className="mobile-shell" aria-label="Mobile review preview">
      <header>
        <button type="button" aria-label="New review" onClick={() => setActive('new')}>+</button>
        <div><strong>{review?.project?.name ?? 'Project'}</strong><small>{review?.pullRequestNumber ? `Review #${review.pullRequestNumber}` : 'Review details'} <span className="pill success">{review?.status ?? 'No review selected'}</span></small></div>
        
      </header>
      <div className="mobile-tabs">
        <button className="selected" type="button" onClick={() => setActive(active)}>Submitted content</button>
        <button type="button" onClick={() => setActive('reviews')}>AI Review</button>
      </div>
      <div className="mobile-content">
        <CodePane review={review} />
        <ScorePanel review={review} onViewAllIssues={() => setActive('reviews')} />
      </div>
    </section>
  )
}

function AuthGate({ onAuthed, error }: { onAuthed: (user: User) => void; error?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(error ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const result = mode === 'login'
        ? await authApi.login({ email, password })
        : await authApi.register({ email, name, password })
      onAuthed(result.user)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <button className="brand auth-brand" type="button">
          <span className="brand-mark">&lt;/&gt;</span>
          <span>CodeReviewer</span>
        </button>
        <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        {mode === 'register' && <input required maxLength={120} autoComplete="name" aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />}
        <input required type="email" autoComplete="email" aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
        <input required minLength={mode === 'register' ? 8 : 1} maxLength={72} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
        {message && <p className="status-message">{message}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create an account' : 'Use existing account'}
        </button>
      </form>
    </main>
  )
}

function App() {
  const [active, setActive] = useState<View>('new')
  const [user, setUser] = useState<User>()
  const [projects, setProjects] = useState<Project[]>([])
  const [apiReviews, setApiReviews] = useState<ApiReview[]>([])
  const [selectedReview, setSelectedReview] = useState<ApiReview | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshProjects = async () => {
    const result = await projectApi.list()
    setProjects(result.items)
    return result.items
  }

  const refreshReviews = async (query: Record<string, string> = {}) => {
    const result = await reviewApi.list({ page: 1, limit: 20, ...query })
    setApiReviews(result.items)
    if (!selectedReview && result.items[0]) setSelectedReview(result.items[0])
  }

  const refreshDashboard = async () => {
    setDashboard(await dashboardApi.get())
  }

  const loadWorkspace = async () => {
    await refreshProjects()
    await refreshReviews()
    await refreshDashboard()

  }

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      try {
        const result = await authApi.me()
        if (cancelled) return
        setUser(result.user)
        const [projects, reviews, dashboard] = await Promise.all([
          projectApi.list(), reviewApi.list({ page: 1, limit: 20 }), dashboardApi.get(),
        ])
        if (cancelled) return
        setProjects(projects.items)
        setApiReviews(reviews.items)
        setSelectedReview(reviews.items[0] ?? null)
        setDashboard(dashboard)
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Unable to load workspace')
      }
    }
    if (localStorage.getItem('codereviewer.token')) void initialize()
    return () => { cancelled = true }
  }, [])

  const logout = () => {
    authApi.logout()
    setUser(undefined)
    setProjects([])
    setApiReviews([])
    setSelectedReview(null)
    setDashboard(null)
  }

  const handleAuthed = (nextUser: User) => {
    setUser(nextUser)
    void loadWorkspace().catch((error: Error) => setMessage(error.message))
  }

  const submitReview = async (input: { mode: SubmitMode; content: string; language: string; projectId?: string }) => {
    if (!input.content.trim()) {
      setMessage('Paste code or a diff before submitting.')
      return
    }
    setBusy(true)
    setMessage('Analyzing changes...')
    try {
      let projectId = input.projectId
      if (!projectId) {
        const created = await projectApi.create({ name: 'My project', defaultBranch: 'main' })
        projectId = created.project.id
        setProjects((current) => [created.project, ...current])
      }
      const result = await reviewApi.create({
        projectId,
        inputType: input.mode,
        content: input.content,
        language: input.language,
      })
      setSelectedReview(result.review)
      await refreshReviews()
      await refreshDashboard()
      setActive('review')
      setMessage(result.review.status === 'FAILED' ? result.review.errorMessage ?? 'Review failed' : 'Review completed.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setBusy(false)
    }
  }

  const openReview = (review: ApiReview) => {
    setSelectedReview(review)
    setActive('review')
  }

  const deleteReview = async (review: ApiReview) => {
    if (!window.confirm('Delete this review?')) return
    await reviewApi.delete(review.id)
    setApiReviews((current) => current.filter((item) => item.id !== review.id))
    if (selectedReview?.id === review.id) setSelectedReview(null)
    await refreshDashboard()
  }

  if (!user) return <AuthGate onAuthed={handleAuthed} error={message} />

  if (active === 'new') return <NewReview active={active} setActive={setActive} user={user} onLogout={logout} projects={projects} onSubmitReview={submitReview} busy={busy} message={message} />
  if (active === 'reviews') return <ReviewsPage active={active} setActive={setActive} user={user} onLogout={logout} apiReviews={apiReviews} onOpenReview={openReview} onDeleteReview={deleteReview} onRefreshReviews={refreshReviews} />
  if (active === 'dashboard') return <Dashboard active={active} setActive={setActive} user={user} onLogout={logout} data={dashboard} />

  return (
    <>
      {message && <p role="status">{message}</p>}
      <ReviewWorkspace active={active} setActive={setActive} user={user} onLogout={logout} review={selectedReview} />
      <MobileReview active={active} setActive={setActive} review={selectedReview} />
    </>
  )
}

export default App
