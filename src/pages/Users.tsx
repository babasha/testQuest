// src/pages/Users.tsx - Страница отчета пользователей
import { useState, useEffect } from 'preact/hooks'
import { signal } from '@preact/signals'
import './Users.css'
import '../styles/shared.css'
import PhoneIcon from '../icon/phone.svg?url'
import MailIcon from '../icon/mail.svg?url'
import LoupeIcon from '../icon/loupe.svg?url'

export interface User {
  id: number
  name: string
  phone: string
  email: string
  position_name: string
  department: string
  hire_date: string
}

// Signals для управления состоянием
const users = signal<User[]>([])
const usersLoading = signal<boolean>(true)
const searchQuery = signal<string>('')
const selectedUser = signal<User | null>(null)

const loadUsers = async (term?: string) => {
  usersLoading.value = true
  try {
    const url = term 
      ? `http://localhost:3000?term=${encodeURIComponent(term)}`
      : 'http://localhost:3000'
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.success) {
      users.value = data.data
    } else {
      console.error('Ошибка загрузки пользователей:', data.message)
      users.value = []
    }
  } catch (error) {
    console.error('Ошибка сети:', error)
    users.value = []
  } finally {
    usersLoading.value = false
  }
}

const UserModal = ({ user, onClose }: { user: User; onClose: () => void }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    // Блокируем скролл страницы
    document.body.style.overflow = 'hidden'
    
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      // Восстанавливаем скролл при закрытии модалки
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="user-details-list">
            <div className="detail-row">
              <span className="detail-label">Телефон:</span>
              <span className="detail-value">{user.phone}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Почта:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Дата приема:</span>
              <span className="detail-value">{user.hire_date}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Должность:</span>
              <span className="detail-value">{user.position_name}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Подразделение:</span>
              <span className="detail-value">{user.department}</span>
            </div>
            
            <div className="detail-section">
              <h3 className="section-title">Дополнительная информация:</h3>
              <p className="section-content">
                Разработчики используют текст в качестве заполнителя макта страницы. 
                Разработчики используют текст в качестве заполнителя макта страницы.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


const Users = () => {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSearch = (e: Event) => {
    const target = e.target as HTMLInputElement
    const value = target.value
    searchQuery.value = value

    // Очищаем предыдущий таймаут
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Устанавливаем новый таймаут для debounce
    const timeout = setTimeout(() => {
      loadUsers(value || undefined)
    }, 300)

    setSearchTimeout(timeout)
  }

  const openUserModal = (user: User) => selectedUser.value = user
  const closeUserModal = () => selectedUser.value = null
  if (usersLoading.value) {
    return (
      <div className="container">
        <div className="loading-spinner">
          ⚡ Загрузка сотрудников...
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="search-header" style={{ margin: '30px 0' }}>
        <div className="search-container search-full-width">
          <input
            type="text"
            className="input input-search"
placeholder=""
            value={searchQuery.value}
            onInput={handleSearch}
          />
          <img src={LoupeIcon} alt="Поиск" className="search-icon" />
        </div>
      </div>

      <div className="grid">
        {users.value.map(user => (
          <div key={user.id} className="card user-card" onClick={() => openUserModal(user)}>
            <h3 className="product-name user-name">{user.name}</h3>
            <div className="user-phone"><img src={PhoneIcon} alt="Телефон" style={{width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle'}} /> {user.phone}</div>
            <div className="user-email"><img src={MailIcon} alt="Email" style={{width: '24px', height: '24px', marginRight: '8px', verticalAlign: 'middle'}} /> {user.email}</div>
          </div>
        ))}
      </div>

      {users.value.length === 0 && searchQuery.value && (
        <div className="empty-state">
          🔍 По запросу "{searchQuery.value}" ничего не найдено
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={() => {
              searchQuery.value = ''
              loadUsers()
            }}>
              🔄 Показать всех сотрудников
            </button>
          </div>
        </div>
      )}

      {users.value.length === 0 && !searchQuery.value && (
        <div className="empty-state">
          😔 Сотрудники не найдены
          <div style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={() => loadUsers()}>
              🔄 Обновить
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно */}
      {selectedUser.value && (
        <UserModal user={selectedUser.value} onClose={closeUserModal} />
      )}
    </div>
  )
}

export default Users