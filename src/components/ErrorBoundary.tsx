// src/components/ErrorBoundary.tsx
import { Component } from 'preact'
import './ErrorBoundary.css'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<any, ErrorBoundaryState> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary поймал ошибку:', error)
    console.error('📋 Error info:', errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-icon">🚨</div>
          <h1 className="error-title">Что-то пошло не так</h1>
          <p className="error-message">
            Произошла неожиданная ошибка в приложении.<br/>
            Попробуйте перезагрузить страницу или обратитесь к разработчику.
          </p>
          <button className="error-button" onClick={this.handleReload}>
            🔄 Перезагрузить приложение
          </button>
          
          {typeof window !== 'undefined' && window.location.hostname === 'localhost' && this.state.error && (
            <details className="error-details">
              <summary>🐛 Детали ошибки (только в dev режиме)</summary>
              <pre>{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}