import { lazy, Suspense, Component, useEffect, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { NavBar } from './components/ui/NavBar'
import { recordRecentPath } from './lib/quickAccess'

const Dashboard        = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Setup            = lazy(() => import('./pages/Setup').then(m => ({ default: m.Setup })))
const Checklists       = lazy(() => import('./pages/Checklists').then(m => ({ default: m.Checklists })))
const Library          = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })))
const Studio           = lazy(() => import('./pages/Studio').then(m => ({ default: m.Studio })))
const Insights         = lazy(() => import('./pages/Insights').then(m => ({ default: m.Insights })))
const Assessments      = lazy(() => import('./pages/Assessments').then(m => ({ default: m.Assessments })))
const NewAssessment    = lazy(() => import('./pages/NewAssessment').then(m => ({ default: m.NewAssessment })))
const AssessmentDetail = lazy(() => import('./pages/AssessmentDetail').then(m => ({ default: m.AssessmentDetail })))
const GradeScreen      = lazy(() => import('./pages/GradeScreen').then(m => ({ default: m.GradeScreen })))
const Results          = lazy(() => import('./pages/Results').then(m => ({ default: m.Results })))
const StudentProfile   = lazy(() => import('./pages/StudentProfile').then(m => ({ default: m.StudentProfile })))
const Settings         = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))

interface EBState { error: Error | null }

class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }

  static getDerivedStateFromError(error: Error): EBState {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: 480,
          margin: '4rem auto',
          fontFamily: 'sans-serif',
          color: '#0f172a',
        }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            La app ha encontrado un error
          </h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              this.setState({ error: null })
              window.location.hash = '#/'
              window.location.reload()
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Reiniciar app
          </button>
          <details style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <summary>Detalles tecnicos</summary>
            <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error.stack}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

function PageLoader() {
  return (
    <div className="loading-page">
      <div className="spinner" />
    </div>
  )
}

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    recordRecentPath(location.pathname)
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <AppErrorBoundary>
      <HashRouter>
        <RouteTracker />
        <div className="app-body">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/checklists" element={<Checklists />} />
              <Route path="/library" element={<Library />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/assessments/new" element={<NewAssessment />} />
              <Route path="/assessments/:id" element={<AssessmentDetail />} />
              <Route path="/assessments/:id/grade/:studentId" element={<GradeScreen />} />
              <Route path="/assessments/:id/results" element={<Results />} />
              <Route path="/students/:id" element={<StudentProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
        <NavBar />
      </HashRouter>
    </AppErrorBoundary>
  )
}
