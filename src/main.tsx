// src/main.tsx - Клиентская точка входа с поддержкой SSR
import { render, hydrate } from 'preact'
import { App } from './app'
import './style.css'

console.log('👥 Запуск системы управления сотрудниками')

// Получаем начальные данные от сервера
const initialData = (window as any).__INITIAL_DATA__ || {}

// Определяем среду
const isTelegram = !!(window as any).Telegram?.WebApp
const isPWA = window.matchMedia('(display-mode: standalone)').matches

// Инициализируем данные ДО рендера
async function initializeApp() {
  // Логируем начальные данные от сервера (если есть)
  if (initialData && Object.keys(initialData).length > 0) {
    console.log('🚀 Получены данные от SSR:', initialData)
  }

  // Инициализируем Telegram WebApp если нужно
  if (isTelegram) {
    console.log('📱 Запуск в Telegram WebApp')
    try {
      const tg = (window as any).Telegram.WebApp
      tg.ready()
      tg.expand()
      console.log('✅ Telegram WebApp инициализирован')
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации Telegram:', error)
    }
  }

  // Функция для рендера (только клиентский для упрощения)
  const renderApp = () => {
    const container = document.getElementById('app')!
    
    // Очищаем контейнер от SSR контента если он есть
    container.innerHTML = ''
    
    // Всегда используем обычный клиентский рендер
    console.log('🎨 Клиентский рендер...')
    render(<App initialData={initialData} />, container)
    console.log('✅ Рендер завершен')
  }

  // Рендерим приложение
  renderApp()

  // Очистка начальных данных
  delete (window as any).__INITIAL_DATA__
  
  console.log('✅ Клиентское приложение полностью готово')
}

// Запускаем инициализацию
initializeApp().catch(error => {
  console.error('❌ Ошибка инициализации:', error)
  
  // Fallback - просто рендерим без инициализации
  const container = document.getElementById('app')!
  render(<App initialData={{}} />, container)
})

// Service Worker для PWA
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ Service Worker зарегистрирован'))
      .catch((error) => console.log('❌ Ошибка Service Worker:', error))
  })
}

// Обработка ошибок загрузки
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('Loading chunk')) {
    console.warn('🔄 Ошибка загрузки чанка, перезагружаем...')
    window.location.reload()
  }
})