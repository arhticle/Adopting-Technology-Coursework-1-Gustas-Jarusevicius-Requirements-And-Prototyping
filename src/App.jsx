import { useState, useEffect, useRef } from 'react';

/**
 * Vibecoding Project Tracker (VibeTracker) - final version.
 *
 * The starter scaffold listed these milestones. They are all done now, and the
 * original "TODO M<n>" hooks are kept as "DONE M<n>" markers so you can search for them:
 *   - M4  data-model    : four columns and task cards            -> Board, TaskCard, STAGES
 *   - M5  crud-modal    : add, edit and delete in a modal         -> TaskModal
 *   - M6  tag-style     : feature vs. bug styling                 -> TaskCard + .card-bug / .badge-* in index.css
 *   - M7  task-owner    : owner badge + hand off dropdown         -> TaskCard + the Owner field in TaskModal
 *   - M8  due-tint      : due date states                         -> dueInfo() + .due-* in index.css
 *   - M9  context       : curated Context briefing field          -> "AI context" box in TaskModal
 *   - M10 copy-prompt   : "Copy context" button                   -> buildContextText() + copyContext() in App
 *   - M11 anchors       : the Anchor Board above the Kanban       -> AnchorBar
 *   - M12 secret-sauce  : landing page, colourblind mode, team strip, comments,
 *                         collapsible columns, display settings   -> Landing, SettingsPanel, App
 *
 * AI use: the first version of this file was generated with Claude (Sonnet 5.5) and then
 * tested and edited by me. Replace this line with what you changed yourself.
 *
 * Everything lives in this one file on purpose, so it matches the starter. It is split
 * into labelled sections, so search for "SECTION" to jump around.
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee          id of a team member ('' = unassigned)
 * @property {string|null} dueDate      ISO 'YYYY-MM-DD'
 * @property {string} contextTool       which AI tool was used
 * @property {string} context           prompt, conversation or error log
 * @property {string|null} contextUpdatedAt
 * @property {{id:string, author:string, text:string, time:string}[]} comments
 */

// The four columns of the board, in render order. (Starter constant, DONE M4)
export const STAGES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];


// ======================================================================
// SECTION 1: helper functions (due dates, copy text, ids)
// ======================================================================

// Small helper functions, kept in one place so components stay short (DRY).

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

// Works out the due-date state. The label is always words, so colour is never the only signal (FR8, NFR2).
function dueInfo(task) {
  if (task.status === 'done') return { state: 'done', label: 'Done', symbol: 'check' }
  if (!task.dueDate) return { state: 'none', label: 'No due date', symbol: 'dash' }
  const n = daysUntil(task.dueDate)
  if (n < 0) return { state: 'overdue', label: `Overdue by ${-n} day${n === -1 ? '' : 's'}`, symbol: 'alert' }
  if (n === 0) return { state: 'soon', label: 'Due today', symbol: 'clock' }
  if (n === 1) return { state: 'soon', label: 'Due tomorrow', symbol: 'clock' }
  if (n === 2) return { state: 'soon', label: 'Due in 2 days', symbol: 'clock' }
  return { state: 'calm', label: `Due in ${n} days`, symbol: 'dot' }
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

function formatDateTime(iso) {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Builds the text that "Copy context" puts on the clipboard (FR6).
function buildContextText(task, memberName, statusLabel) {
  return [
    `Task: ${task.title}`,
    `Type: ${task.type === 'bug' ? 'Bug' : 'Feature'}`,
    `Status: ${statusLabel}`,
    `Owner: ${memberName}`,
    task.description ? `Description: ${task.description}` : '',
    `AI tool used: ${task.contextTool}`,
    '',
    'Context:',
    task.context || '(no context saved yet)',
  ]
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n')
}

function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// ======================================================================
// SECTION 2: sample data (DONE M4: seed tasks so the board is not empty on first load)
// ======================================================================


const TASK_TYPES = [
  { id: 'feature', label: 'Feature' },
  { id: 'bug', label: 'Bug' },
]

const AI_TOOLS = ['Claude', 'ChatGPT', 'Gemini', 'Cursor', 'GitHub Copilot', 'Other', 'None']

// Sample team. The starter had three placeholder names, here they are objects with the
// details the client asked for (name, email, GitHub). Task.assignee stores the member id.
export const TEAM = [
  { id: 'm1', name: 'Amira Khan', role: 'Senior developer', email: 'amira@example.com', github: 'amira-k' },
  { id: 'm2', name: 'Ben Ortiz', role: 'Junior frontend developer', email: 'ben@example.com', github: 'ben-o' },
  { id: 'm3', name: 'Chloe Evans', role: 'Backend developer', email: 'chloe@example.com', github: 'chloe-e' },
]

const SEED_ANCHORS = [
  { id: 'presentation', label: 'Presentation', url: '' },
  { id: 'demo', label: 'Demo', url: '' },
  { id: 'report', label: 'Report', url: '' },
  { id: 'documentation', label: 'Documentation', url: '' },
]

// Sample tasks so the board is not empty on first load. Due dates are relative to today.
function makeSeedTasks() {
  const now = new Date().toISOString()
  return [
    {
      id: 't1',
      title: 'Set up login form',
      description: 'Simple email and password form for the team page.',
      type: 'feature',
      status: 'todo',
      assignee: 'm2',
      dueDate: addDays(6),
      contextTool: 'Claude',
      context: 'Prompt: Build an accessible React login form with labels, inline errors and keyboard support. Keep it under 80 lines.',
      contextUpdatedAt: now,
      comments: [],
    },
    {
      id: 't2',
      title: 'Cards overlap on small screens',
      description: 'Columns squash together under 600px wide.',
      type: 'bug',
      status: 'in-progress',
      assignee: 'm2',
      dueDate: addDays(1),
      contextTool: 'Cursor',
      context: 'Error log: grid-template-columns repeat(4, 1fr) does not wrap. Tried minmax(240px, 1fr) with auto-fit, still overflows in Safari.',
      contextUpdatedAt: now,
      comments: [
        { id: 'c1', author: 'Amira Khan', text: 'Try a single column below 800px.', time: now },
      ],
    },
    {
      id: 't3',
      title: 'Database schema for tasks',
      description: 'Tables for tasks, members and comments.',
      type: 'feature',
      status: 'review',
      assignee: 'm3',
      dueDate: addDays(-2),
      contextTool: 'ChatGPT',
      context: 'Prompt: Suggest a Postgres schema for a Kanban app with tasks, members and comments. Explain the foreign keys.',
      contextUpdatedAt: now,
      comments: [],
    },
    {
      id: 't4',
      title: 'Write project README',
      description: 'Explain setup and how to run the app.',
      type: 'feature',
      status: 'done',
      assignee: 'm1',
      dueDate: addDays(-5),
      contextTool: 'None',
      context: '',
      contextUpdatedAt: now,
      comments: [],
    },
  ]
}


// ======================================================================
// SECTION 3: localStorage hook (from the starter)
// ======================================================================

/**
 * A tiny localStorage hook - survives reloads, no library needed. (Starter helper, kept)
 * One change from the starter: initialValue can also be a function, so seed tasks
 * with today's date are only built the first time.
 *
 * Usage:
 *   const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', makeSeedTasks);
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch {
      /* fall through to the default */
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error - silently ignore, the app still works for this visit */
    }
  }, [key, value]);

  return [value, setValue];
}

// ======================================================================
// SECTION 4: shared dialog
// Native <dialog>: the browser handles focus trapping, Escape and the backdrop (keyboard and screen reader users).
// ======================================================================

// Uses the native <dialog> element. The browser gives us the focus trap, the Escape key
// and the dimmed backdrop for free, which is better for keyboard and screen reader users (NFR4).
function Modal({ open, onClose, title, labelId, children, wide }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={wide ? 'modal modal-wide' : 'modal'}
      aria-labelledby={labelId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="modal-inner">
          <div className="modal-head">
            <h2 id={labelId}>{title}</h2>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

// ======================================================================
// SECTION 5: landing page (DONE M12)
// Forest video background with a working pause / play button.
// Login and team code are simulated, nothing is stored.
// ======================================================================

// Background video for the landing page. The file lives in the public folder:
//   public/forest.mp4          (compressed, no audio, plays on every browser)
//   public/forest-poster.jpg   (a still frame, shown before the video loads)
// It is decorative, so it is hidden from screen readers (WCAG 1.1.1). It can be paused with a button
// (WCAG 2.2.2), and it does not start by itself when the device asks for reduced motion.
// The pause button works by calling video.pause() / video.play() on the element below.
function ForestVideo({ paused, onBlocked }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true; // browsers only allow autoplay when the video is muted
    if (paused) {
      video.pause();
    } else {
      const attempt = video.play();
      // if the browser refuses to autoplay, flip the setting so the button label stays truthful
      if (attempt && attempt.catch) attempt.catch(() => onBlocked && onBlocked());
    }
  }, [paused]);

  return (
    <div className="forest" aria-hidden="true">
      <video
        ref={ref}
        className="forest-video"
        src="/forest.mp4"
        poster="/forest-poster.jpg"
        muted
        loop
        playsInline
        autoPlay={!paused}
        preload="auto"
        tabIndex={-1}
      />
      <div className="forest-shade" />
    </div>
  );
}

// Landing page (FR9). Log in, sign up and the team code are simulated: nothing is sent or stored.
// "Get started" works as a guest route so nobody is blocked behind a login wall.
function Landing({ onEnter }) {
  const [dialog, setDialog] = useState(null) // 'login' | 'join' | null
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setDialog(null)
    setError('')
  }

  const submitLogin = (e) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setError('Please enter an email address with an @ in it.')
      return
    }
    onEnter(email.split('@')[0])
  }

  const submitJoin = (e) => {
    e.preventDefault()
    if (code.trim().length < 4) {
      setError('Team codes have at least 4 characters.')
      return
    }
    onEnter('Team member')
  }

  return (
    <section className="landing" aria-labelledby="landing-title">
      <div className="landing-card">
        <h1 id="landing-title">Keep every task and the AI prompt behind it in one place</h1>
        <p className="lead">
          A simple Kanban board for small software teams. Each task stores the prompt, the AI tool and the
          context, so nothing gets lost between chat tabs.
        </p>
        <div className="landing-actions">
          <button type="button" className="btn btn-primary btn-large" onClick={() => onEnter('Guest')}>
            Get started
          </button>
          <button
            type="button"
            className="btn btn-large"
            onClick={() => {
              setMode('login')
              setDialog('login')
            }}
          >
            Log in / Sign up
          </button>
          <button type="button" className="btn btn-large" onClick={() => setDialog('join')}>
            Join your team
          </button>
        </div>
        <p className="small-note">
          This is a prototype. Logging in and team codes are simulated and nothing is stored, so you can use
          Get started without an account.
        </p>
      </div>

      <Modal open={dialog === 'login'} onClose={close} title={mode === 'login' ? 'Log in' : 'Sign up'} labelId="login-title">
        <form onSubmit={submitLogin} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <p className="hint">Demo only. Any password works and it is never saved.</p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="submit" className="btn btn-primary">
              {mode === 'login' ? 'Log in' : 'Create account'}
            </button>
            <button type="button" className="btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'I need an account' : 'I already have an account'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === 'join'} onClose={close} title="Join your team" labelId="join-title">
        <form onSubmit={submitJoin} noValidate>
          <div className="field">
            <label htmlFor="team-code">Team code</label>
            <input id="team-code" type="text" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
            <p className="hint">Demo only. Type any code with 4 or more characters.</p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="submit" className="btn btn-primary">
              Join team
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

// ======================================================================
// SECTION 6: display settings (DONE M12)
// Theme, text size, colourblind mode, pause animation, finish effect.
// ======================================================================

// One panel for every accessibility choice (FR13). Each one is saved so it is remembered next visit.
function SettingsPanel({ open, onClose, settings, setSettings, paused, setPaused }) {
  const update = (key, value) => setSettings({ ...settings, [key]: value })

  return (
    <Modal open={open} onClose={onClose} title="Display settings" labelId="settings-title">
      <fieldset>
        <legend>Theme</legend>
        {[
          ['system', 'Match my device'],
          ['light', 'Light'],
          ['dark', 'Dark'],
        ].map(([value, label]) => (
          <label key={value} className="choice">
            <input type="radio" name="theme" checked={settings.theme === value} onChange={() => update('theme', value)} />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Text size</legend>
        {[
          ['normal', 'Standard'],
          ['large', 'Large'],
          ['xlarge', 'Extra large'],
          ['xxlarge', 'Largest'],
        ].map(([value, label]) => (
          <label key={value} className="choice">
            <input type="radio" name="textSize" checked={settings.textSize === value} onChange={() => update('textSize', value)} />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Other options</legend>
        <label className="choice">
          <input type="checkbox" checked={settings.colourblind} onChange={(e) => update('colourblind', e.target.checked)} />
          Colourblind-friendly, high-visibility mode (black and yellow, solid boxes, thick outlines, blue and orange badges, bigger buttons)
        </label>
        <label className="choice">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          Pause the moving background video (it plays again next time you open the site)
        </label>
        <label className="choice">
          <input type="checkbox" checked={settings.effects} onChange={(e) => update('effects', e.target.checked)} />
          Show a small effect when a task is finished
        </label>
      </fieldset>

      <p className="hint">Standard text is a little smaller on the board so more tasks fit on screen. Use Large, Extra large or Largest if you want it bigger, or zoom the browser.</p>
      <p className="hint">High-visibility mode keeps your Light or Dark choice: Dark is yellow on black, Light is black on white with yellow buttons. Bugs, features and due dates always have an icon and a word as well as a colour.</p>
    </Modal>
  )
}

// ======================================================================
// SECTION 7: team members (DONE M12)
// ======================================================================

// Basic member details the client asked for: name, email and GitHub account (DR3).
function TeamDialog({ open, onClose, team, setTeam }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [github, setGithub] = useState('')
  const [error, setError] = useState('')

  const addMember = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a name.')
      return
    }
    setTeam([...team, { id: newId('m'), name: name.trim(), role: role.trim() || 'Developer', email: email.trim(), github: github.trim() }])
    setName('')
    setRole('')
    setEmail('')
    setGithub('')
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Team members" labelId="team-title" wide>
      <ul className="member-list">
        {team.map((m) => (
          <li key={m.id}>
            <strong>{m.name}</strong>, {m.role}
            <span className="muted">
              {m.email ? ` · ${m.email}` : ''}
              {m.github ? ` · GitHub: ${m.github}` : ''}
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={addMember} noValidate>
        <h3>Add a member</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="member-name">Name</label>
            <input id="member-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="member-role">Role (optional)</label>
            <input id="member-role" value={role} onChange={(e) => setRole(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="member-email">Email (optional)</label>
            <input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="member-github">GitHub account (optional)</label>
            <input id="member-github" value={github} onChange={(e) => setGithub(e.target.value)} autoComplete="off" />
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary">
            Add member
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ======================================================================
// SECTION 8: Anchor Board (DONE M11)
// Presentation / Demo / Report / Documentation links above the board.
// ======================================================================

// The four deliverables pinned at the top (FR7): Presentation, Demo, Report, Documentation.
function AnchorBar({ anchors, setAnchors }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  const startEdit = (a) => {
    setEditingId(a.id)
    setDraft(a.url)
  }

  const [error, setError] = useState('')

  const save = (e) => {
    e.preventDefault()
    let url = draft.trim()
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
    // very simple check: a link needs a dot in it, or it can be left empty to clear it
    if (url && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
      setError('That does not look like a web address. Try something like github.com/your-repo')
      return
    }
    setAnchors(anchors.map((a) => (a.id === editingId ? { ...a, url } : a)))
    setError('')
    setEditingId(null)
  }

  return (
    <section className="anchor-bar" aria-labelledby="anchor-title">
      <h2 id="anchor-title" className="section-title">
        Project deliverables
      </h2>
      <ul className="anchor-list">
        {anchors.map((a) => (
          <li key={a.id} className="anchor">
            {editingId === a.id ? (
              <form onSubmit={save} className="anchor-form" noValidate>
                <label htmlFor={`anchor-${a.id}`}>{a.label} link</label>
                <input id={`anchor-${a.id}`} type="text" inputMode="url" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://" aria-describedby={error ? 'anchor-error' : undefined} />
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditingId(null)
                    setError('')
                  }}
                >
                  Cancel
                </button>
                {error && (
                  <p id="anchor-error" className="error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="anchor-name">{a.label}</span>
                  <span className={a.url ? 'anchor-status linked' : 'anchor-status'}>{a.url ? 'Linked' : 'Not added yet'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.url && (
                    <a className="btn" href={a.url} target="_blank" rel="noreferrer noopener">
                      Open {a.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                  <button type="button" className="btn" onClick={() => startEdit(a)}>
                    {a.url ? 'Edit link' : 'Add link'}
                    <span className="sr-only"> for {a.label}</span>
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Small inline icons (SVG) so they look the same on every device (emoji change from phone to phone and are read out
// loud by screen readers). They always come AFTER the word and are hidden from screen readers, because the word says it all.
function Icon({ name }) {
  const props = {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    className: 'icon',
  };
  switch (name) {
    case 'feature': // four point sparkle
      return (
        <svg {...props}>
          <path d="M8 1.5l1.7 4.8 4.8 1.7-4.8 1.7L8 14.5l-1.7-4.8L1.5 8l4.8-1.7z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'bug':
      return (
        <svg {...props}>
          <ellipse cx="8" cy="9.5" rx="3.2" ry="4" />
          <circle cx="8" cy="4.2" r="1.6" />
          <path d="M4.8 8H2M11.2 8H14M5 11.5L2.8 13M11 11.5l2.2 1.5M5.2 6L3.2 4.5M10.8 6l2-1.5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="M8 2l6.5 11.5h-13z" />
          <path d="M8 6.5v3.2M8 11.6v.1" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2.4 1.6" />
        </svg>
      );
    case 'dot':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    default: // dash
      return (
        <svg {...props}>
          <path d="M4 8h8" />
        </svg>
      );
  }
}

// ======================================================================
// SECTION 9: task card (DONE M6, M7, M8, M10)
// Type and due state use colour AND a symbol AND words.
// Status changes with a dropdown, no drag and drop.
// ======================================================================

// One card on the board. Type and due state are shown with colour, a symbol AND words (FR3, FR8, NFR2).
// Moving a card uses a dropdown, not drag and drop, so keyboard and screen reader users can do it (FR4).
function TaskCard({ task, member, onStatus, onEdit, onCopy, justDone }) {
  const due = dueInfo(task)
  const isBug = task.type === 'bug'
  const ownerName = member ? member.name : 'Unassigned'

  return (
    <article className={`card ${isBug ? 'card-bug' : 'card-feature'} ${justDone ? 'card-pop' : ''}`} aria-labelledby={`title-${task.id}`}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className={`badge badge-${isBug ? 'bug' : 'feature'}`}>
          {isBug ? 'Bug' : 'Feature'}
          <Icon name={isBug ? 'bug' : 'feature'} />
        </span>
        <span className={`badge badge-due due-${due.state}`}>
          {due.label}
          <Icon name={due.symbol} />
        </span>
      </div>

      <h3 id={`title-${task.id}`} className="card-title">
        {task.title}
      </h3>

      <p className="card-owner">
        <span className="avatar" aria-hidden="true">
          {member ? initials(member.name) : '?'}
        </span>
        <span>
          <span className="sr-only">Owner: </span>
          {ownerName}
        </span>
      </p>

      {task.contextTool && task.contextTool !== 'None' && (
        <p className="card-tool">
          AI tool: {task.contextTool}
          {task.context ? '' : ' (no context saved)'}
        </p>
      )}

      <div className="card-controls">
        <label htmlFor={`status-${task.id}`} className="control-label">
          Move to
        </label>
        <select id={`status-${task.id}`} value={task.status} onChange={(e) => onStatus(task, e.target.value)}>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => onEdit(task)}>
          Open
          <span className="sr-only"> task: {task.title}</span>
        </button>
        <button type="button" className="btn" onClick={() => onCopy(task)}>
          Copy context
          <span className="sr-only"> for {task.title}</span>
        </button>
      </div>
      {task.comments.length > 0 && (
        <p className="card-comments">
          {task.comments.length} comment{task.comments.length === 1 ? '' : 's'}
        </p>
      )}
    </article>
  )
}

// ======================================================================
// SECTION 10: task modal (DONE M5, M9)
// Create, edit, delete, AI context box, comments.
// ======================================================================

const EMPTY = {
  title: '',
  description: '',
  type: 'feature',
  status: 'todo',
  assignee: '',
  dueDate: '',
  contextTool: 'Claude',
  context: '',
  contextUpdatedAt: null,
  comments: [],
}

// Create, view, edit and delete a task (FR2). The context box is kept separate from the
// description so the AI prompt is easy to find and copy (FR5, FR6).
function TaskModal({ open, task, team, userName, onSave, onDelete, onClose, onCopy }) {
  return (
    <Modal open={open} onClose={onClose} title={task && task.id ? 'Task details' : 'New task'} labelId="task-title" wide>
      {open && <TaskForm task={task} team={team} userName={userName} onSave={onSave} onDelete={onDelete} onClose={onClose} onCopy={onCopy} />}
    </Modal>
  )
}

function TaskForm({ task, team, userName, onSave, onDelete, onClose, onCopy }) {
  const isNew = !task || !task.id
  const [form, setForm] = useState(() => ({ ...EMPTY, assignee: team[0] ? team[0].id : '', ...(task || {}) }))
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Please give the task a title.')
      return
    }
    const old = task || {}
    const contextChanged = old.context !== form.context || old.contextTool !== form.contextTool
    onSave({
      ...form,
      id: form.id || newId('t'),
      title: form.title.trim(),
      contextUpdatedAt: contextChanged ? new Date().toISOString() : form.contextUpdatedAt,
    })
  }

  const addComment = () => {
    if (!commentText.trim()) return
    setForm({
      ...form,
      comments: [...form.comments, { id: newId('c'), author: userName, text: commentText.trim(), time: new Date().toISOString() }],
    })
    setCommentText('')
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="f-title">Title</label>
        <input id="f-title" value={form.title} onChange={set('title')} aria-describedby={error ? 'f-error' : undefined} aria-invalid={error ? 'true' : undefined} />
      </div>

      <div className="field">
        <label htmlFor="f-desc">Description</label>
        <textarea id="f-desc" rows={2} value={form.description} onChange={set('description')} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" value={form.type} onChange={set('type')}>
            {TASK_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={form.status} onChange={set('status')}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="f-owner">Owner</label>
          <select id="f-owner" value={form.assignee} onChange={set('assignee')}>
            <option value="">Unassigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-due">Due date</label>
          <input id="f-due" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </div>
      </div>

      <div className="context-box">
        <h3>AI context</h3>
        <div className="field">
          <label htmlFor="f-tool">AI tool used</label>
          <select id="f-tool" value={form.contextTool} onChange={set('contextTool')}>
            {AI_TOOLS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-context">Prompt, conversation or error log</label>
          <textarea id="f-context" rows={6} value={form.context} onChange={set('context')} />
          <p className="hint">Last updated: {formatDateTime(form.contextUpdatedAt)}</p>
        </div>
        <button type="button" className="btn" onClick={() => onCopy(form)}>
          Copy context
        </button>
      </div>

      <div className="comments">
        <h3>Comments ({form.comments.length})</h3>
        {form.comments.length === 0 && <p className="muted">No comments yet.</p>}
        <ul className="comment-list">
          {form.comments.map((c) => (
            <li key={c.id}>
              <strong>{c.author}</strong> <span className="muted">{formatDateTime(c.time)}</span>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
        <div className="field">
          <label htmlFor="f-comment">Add a comment</label>
          <textarea
            id="f-comment"
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </div>
        <button type="button" className="btn" onClick={addComment}>
          Post comment
        </button>
        <p className="hint">Comments are saved when you press Save task.</p>
      </div>

      {error && (
        <p id="f-error" className="error" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary">
          Save task
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        {!isNew &&
          (confirmDelete ? (
            <>
              <span role="alert" className="confirm-text">
                Delete this task for good?
              </span>
              <button type="button" className="btn btn-danger" onClick={() => onDelete(form.id)}>
                Yes, delete
              </button>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete task
            </button>
          ))}
      </div>
    </form>
  )
}

// ======================================================================
// SECTION 11: the board (DONE M4)
// Four columns, each one collapsible.
// ======================================================================

// The four-column board (FR1). Every column is a labelled region and can be collapsed (FR11).
function Board({ tasks, team, hideDone, collapsed, setCollapsed, justDone, onStatus, onEdit, onCopy }) {
  const toggle = (id) => setCollapsed(collapsed.includes(id) ? collapsed.filter((c) => c !== id) : [...collapsed, id])
  const columns = hideDone ? STAGES.filter((s) => s.id !== 'done') : STAGES

  return (
    <div className="board">
      {columns.map((col) => {
        const list = tasks.filter((t) => t.status === col.id)
        const isCollapsed = collapsed.includes(col.id)
        return (
          <section key={col.id} className={`column ${isCollapsed ? 'column-collapsed' : ''}`} aria-labelledby={`col-${col.id}`}>
            <h2 id={`col-${col.id}`} className="column-head">
              <button type="button" className="column-toggle" aria-expanded={!isCollapsed} aria-controls={`list-${col.id}`} onClick={() => toggle(col.id)}>
                <span>
                  {col.label} <span className="count">({list.length})</span>
                </span>
                <span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                <span className="sr-only">{isCollapsed ? ' Expand column' : ' Collapse column'}</span>
              </button>
            </h2>
            <div id={`list-${col.id}`} className="column-list" hidden={isCollapsed}>
              {list.length === 0 && <p className="muted empty">Nothing here.</p>}
              {list.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  member={team.find((m) => m.id === t.assignee)}
                  justDone={justDone === t.id}
                  onStatus={onStatus}
                  onEdit={onEdit}
                  onCopy={onCopy}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ======================================================================
// SECTION 12: App (state, settings, copy, toast messages)
// DONE M4 tasks | DONE M5 editing | DONE M11 anchors (these were the starter TODOs).
// ======================================================================

// Text size for each setting. The board is denser, so "Standard" is a bit smaller there (14px instead of 16px).
const BOARD_SIZES = { normal: '87.5%', large: '100%', xlarge: '125%', xxlarge: '150%' }
const LANDING_SIZES = { normal: '100%', large: '115%', xlarge: '130%', xxlarge: '150%' }

// The video plays automatically on every visit. The only exception is a device that asks for reduced motion.
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function defaultSettings() {
  return { theme: 'system', textSize: 'normal', colourblind: false, effects: true }
}

export default function App() {
  const [view, setView] = useState('landing')
  const [userName, setUserName] = useState('Guest')

  const [settings, setSettings] = useLocalStorage('vt.settings', defaultSettings)
  const [paused, setPaused] = useState(prefersReducedMotion) // not saved, so the video autoplays on every visit
  const [tasks, setTasks] = useLocalStorage('vt.tasks', makeSeedTasks)
  const [team, setTeam] = useLocalStorage('vt.team', TEAM)
  const [anchors, setAnchors] = useLocalStorage('vt.anchors', SEED_ANCHORS)
  const [hideDone, setHideDone] = useLocalStorage('vt.hideDone', false)
  const [collapsed, setCollapsed] = useLocalStorage('vt.collapsed', [])

  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null) // null = closed, {} = new task, task = edit
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [justDone, setJustDone] = useState(null)
  const toastTimer = useRef(null)

  // Apply the display settings to the page (FR13)
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      root.dataset.theme = settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : settings.theme
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.cb = settings.colourblind ? 'on' : 'off'
    const sizes = view === 'landing' ? LANDING_SIZES : BOARD_SIZES
    root.style.fontSize = sizes[settings.textSize] || sizes.normal
  }, [settings.colourblind, settings.textSize, view])

  // One polite live region announces every message, for screen readers too (WCAG 4.1.3)
  const say = (message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }

  const copyContext = async (task) => {
    const member = team.find((m) => m.id === task.assignee)
    const status = STAGES.find((s) => s.id === task.status)
    const text = buildContextText(task, member ? member.name : 'Unassigned', status ? status.label : task.status)
    try {
      await navigator.clipboard.writeText(text)
      say('Context copied to the clipboard.')
    } catch (e) {
      // fallback for browsers that block the clipboard API
      const box = document.createElement('textarea')
      box.value = text
      document.body.appendChild(box)
      box.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(box)
      say(ok ? 'Context copied to the clipboard.' : 'Could not copy. Please select the text and copy it by hand.')
    }
  }

  const changeStatus = (task, status) => {
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status } : t)))
    const label = STAGES.find((s) => s.id === status).label
    if (status === 'done' && settings.effects) {
      setJustDone(task.id)
      setTimeout(() => setJustDone(null), 1200)
      say(`"${task.title}" is done. Nice work!`)
    } else {
      say(`"${task.title}" moved to ${label}.`)
    }
  }

  const saveTask = (task) => {
    const exists = tasks.some((t) => t.id === task.id)
    setTasks(exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task])
    setEditing(null)
    say(exists ? 'Task saved.' : 'Task added.')
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id))
    setEditing(null)
    say('Task deleted.')
  }

  const enter = (name) => {
    setUserName(name)
    setView('board')
  }

  const shown = filter === 'all' ? tasks : tasks.filter((t) => t.assignee === filter)
  const doneCount = shown.filter((t) => t.status === 'done').length
  const filterName = filter === 'all' ? null : (team.find((m) => m.id === filter) || {}).name

  return (
    <div className={view === 'landing' ? 'app app-landing' : 'app'}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      {view === 'landing' && <ForestVideo paused={paused} onBlocked={() => setPaused(true)} />}

      <header className="topbar">
        <button type="button" className="brand" onClick={() => setView('landing')} aria-label="VibeTracker, go to the start page">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect width="32" height="32" rx="7" fill="currentColor" opacity="0.18" />
            <path d="M16 5l8 12h-5l6 9H7l6-9H8z" fill="currentColor" />
          </svg>
          VibeTracker
        </button>
        <nav aria-label="Main">
          {view === 'board' && (
            <button type="button" className="btn" onClick={() => setTeamOpen(true)}>
              Team
            </button>
          )}
          <button type="button" className="btn" onClick={() => setSettingsOpen(true)}>
            Display settings
          </button>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        {view === 'landing' ? (
          <>
            <Landing onEnter={enter} />
            {/* In the normal page flow (not fixed), so it can never sit on top of other content when zoomed in */}
            <div className="landing-footer">
              <button type="button" className="btn pause-btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>
                {paused ? 'Play background animation' : 'Pause background animation'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="page-title">Team board</h1>
            <p className="muted greeting">Signed in as {userName}. Demo data is saved only in this browser.</p>

            <AnchorBar anchors={anchors} setAnchors={setAnchors} />

            <section className="toolbar" aria-label="Board controls">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks by team member">
                <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                  Everyone
                </button>
                {team.map((m) => {
                  const count = tasks.filter((t) => t.assignee === m.id).length
                  return (
                    <button key={m.id} type="button" className="chip" aria-pressed={filter === m.id} onClick={() => setFilter(m.id)}>
                      <span className="avatar" aria-hidden="true">
                        {initials(m.name)}
                      </span>
                      {m.name}
                      <span className="count"> ({count})</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="choice">
                  <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
                  Hide finished tasks{hideDone && doneCount > 0 ? ` (${doneCount} hidden)` : ''}
                </label>
                <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
                  New task
                </button>
              </div>
            </section>

            {filterName && (
              <p className="filter-note" role="status">
                Showing only tasks owned by {filterName}.
              </p>
            )}

            <Board
              tasks={shown}
              team={team}
              hideDone={hideDone}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              justDone={justDone}
              onStatus={changeStatus}
              onEdit={(t) => setEditing(t)}
              onCopy={copyContext}
            />
          </>
        )}
      </main>

      <TaskModal open={editing !== null} task={editing} team={team} userName={userName} onSave={saveTask} onDelete={deleteTask} onClose={() => setEditing(null)} onCopy={copyContext} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} setSettings={setSettings} paused={paused} setPaused={setPaused} />
      <TeamDialog open={teamOpen} onClose={() => setTeamOpen(false)} team={team} setTeam={setTeam} />

      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}