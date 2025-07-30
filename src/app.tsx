// src/app.tsx - Главный компонент приложения
import Router, { Route } from 'preact-router'
import { Suspense } from 'preact/compat'

import { ErrorBoundary } from './components/ErrorBoundary'
import Users from './pages/Users'
import './styles/shared.css'

interface AppProps {
  initialData?: any
}

export function App({ initialData = {} }: AppProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="loading-spinner">
          ⚡ Молниеносная загрузка...
        </div>
      }>
        <Router>
          <Route path="/" component={() => <Users data={initialData} />} />
          <Route path="/users" component={() => <Users data={initialData} />} />
          <Route default component={() => <Users data={initialData} />} />
        </Router>
      </Suspense>
    </ErrorBoundary>
  )
}