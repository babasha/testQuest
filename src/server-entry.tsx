// src/server-entry.tsx - Серверная точка входа
import { render } from 'preact-render-to-string'
import { createElement } from 'preact'

import { App } from './app'

export interface SSRContext {
  url: string
  userAgent?: string
  headers?: Record<string, string>
}

export async function renderToString(context: SSRContext) {
  try {
    console.log(`🔍 SSR рендер: ${context.url}`)
    
    const initialData = {
      url: context.url,
      timestamp: new Date().toISOString(),
      userAgent: context.userAgent || 'server'
    }
    
    // Рендерим приложение
    const html = render(createElement(App, { initialData }))
    
    return {
      html,
      initialData
    }
  } catch (error) {
    console.error('❌ Ошибка SSR рендера:', error)
    throw error
  }
}

// Экспорт для dev режима с Vite
export default renderToString