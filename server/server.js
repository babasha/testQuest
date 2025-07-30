// server/server.js - Простой Brotli-only SSR сервер
import express from 'express'
import { brotliCompress, constants } from 'zlib'
import { promisify } from 'util'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { render } from 'preact-render-to-string'
import { createElement } from 'preact'

const app = express()
const port = process.env.PORT || 3000

// Промисифицированный Brotli
const brotliCompressAsync = promisify(brotliCompress)

console.log(`🚀 Запуск Brotli-only сервера...`)

// === BROTLI-ONLY MIDDLEWARE ===
const brotliMiddleware = () => {
  return async (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || ''
    
    // Если не поддерживает Brotli - редирект на обновление
    if (!acceptEncoding.includes('br')) {
      if (req.path !== '/upgrade-browser') {
        return res.redirect('/upgrade-browser')
      }
      return next()
    }
    
    // Перехватываем отправку ответов для сжатия
    const originalSend = res.send
    const originalJson = res.json
    
    res.send = function(data) {
      return compressAndSend.call(this, data, originalSend)
    }
    
    res.json = function(data) {
      return compressAndSend.call(this, JSON.stringify(data), originalSend)
    }
    
    async function compressAndSend(data, originalMethod) {
      const contentType = res.getHeader('content-type')
      
      if (!shouldCompress(contentType, data)) {
        return originalMethod.call(res, data)
      }
      
      try {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
        
        // Сжимаем файлы от 512 байт
        if (buffer.length < 512) {
          return originalMethod.call(res, data)
        }
        
        const compressed = await brotliCompressAsync(buffer, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 6,
            [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
            [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT
          }
        })
        
        res.set({
          'Content-Encoding': 'br',
          'Content-Length': compressed.length.toString(),
          'Vary': 'Accept-Encoding',
          'Cache-Control': req.url.includes('/js/') || req.url.includes('/css/') 
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=300'
        })
        
        res.end(compressed)
        
      } catch (error) {
        console.error('❌ Ошибка Brotli сжатия:', error)
        originalMethod.call(res, data)
      }
    }
    
    next()
  }
}

function shouldCompress(contentType, data) {
  if (!contentType) return false
  
  const compressibleTypes = [
    'text/',
    'application/javascript',
    'application/json',
    'application/xml',
    'image/svg+xml'
  ]
  
  return compressibleTypes.some(type => contentType.includes(type))
}

// Применяем Brotli middleware
app.use(brotliMiddleware())

// === MIDDLEWARE ДЛЯ ОТДАЧИ .BR ФАЙЛОВ ===
function serveBrotliFiles() {
  return (req, res, next) => {
    // Проверяем поддержку Brotli
    const acceptEncoding = req.headers['accept-encoding'] || ''
    if (!acceptEncoding.includes('br')) {
      return next()
    }
    
    // Для статических файлов пытаемся найти .br версию
    if (req.path.match(/\.(js|css|html|svg|json)$/)) {
      const brotliPath = resolve('dist/client', req.path.slice(1) + '.br')
      
      if (existsSync(brotliPath)) {
        res.set({
          'Content-Type': getContentType(req.path),
          'Content-Encoding': 'br',
          'Vary': 'Accept-Encoding',
          'Cache-Control': 'public, max-age=31536000, immutable'
        })
        
        return res.sendFile(brotliPath)
      }
    }
    
    next()
  }
}

// Обслуживание статических файлов
// Сначала пытаемся отдать предварительно сжатые .br файлы
app.use(serveBrotliFiles())

// Затем обычная статика
app.use(express.static(resolve('dist/client'), {
  maxAge: '1y',
  etag: true,
  dotfiles: 'deny',
  index: false
}))

// === СТРАНИЦА ОБНОВЛЕНИЯ БРАУЗЕРА ===
app.get('/upgrade-browser', (req, res) => {
  const upgradeHtml = `
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Обновите ваш браузер | Enddel Shop</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            text-align: center;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 3rem 2rem;
            border: 1px solid rgba(255,255,255,0.2);
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #fff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
            line-height: 1.6;
          }
          .browsers {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1.5rem;
            margin: 2.5rem 0;
          }
          .browser {
            background: rgba(255,255,255,0.15);
            border-radius: 16px;
            padding: 1.5rem;
            text-decoration: none;
            color: white;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .browser:hover {
            transform: translateY(-8px);
            background: rgba(255,255,255,0.25);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .browser-icon {
            font-size: 3rem;
            margin-bottom: 0.5rem;
            display: block;
          }
          .browser-name {
            font-weight: 600;
            font-size: 1.1rem;
          }
          .requirements {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🛍️</div>
          <h1>Enddel Shop</h1>
          <p class="subtitle">
            Наш интернет-магазин использует современные технологии 
            для молниеносной загрузки. Обновите браузер для доступа к сайту.
          </p>
          
          <div class="browsers">
            <a href="https://www.google.com/chrome/" class="browser" target="_blank">
              <span class="browser-icon">🌐</span>
              <div class="browser-name">Chrome</div>
            </a>
            <a href="https://www.mozilla.org/firefox/" class="browser" target="_blank">
              <span class="browser-icon">🦊</span>
              <div class="browser-name">Firefox</div>
            </a>
            <a href="https://www.microsoft.com/edge" class="browser" target="_blank">
              <span class="browser-icon">🔷</span>
              <div class="browser-name">Edge</div>
            </a>
            <a href="https://www.apple.com/safari/" class="browser" target="_blank">
              <span class="browser-icon">🧭</span>
              <div class="browser-name">Safari</div>
            </a>
          </div>
          
          <div class="requirements">
            <h3 style="margin-bottom: 1rem;">📋 Минимальные требования</h3>
            <p>
              Chrome 50+ • Firefox 44+ • Safari 11+ • Edge 15+<br>
              Любой современный браузер с поддержкой Brotli
            </p>
          </div>
        </div>
      </body>
    </html>
  `
  
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  })
  res.send(upgradeHtml)
})

function getContentType(filename) {
  if (filename.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (filename.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filename.endsWith('.svg')) return 'image/svg+xml'
  if (filename.endsWith('.json')) return 'application/json; charset=utf-8'
  if (filename.endsWith('.woff2')) return 'font/woff2'
  if (filename.endsWith('.woff')) return 'font/woff'
  return 'text/plain; charset=utf-8'
}

async function importServerModules() {
  try {
    const appPath = resolve('dist/server/app.js')
    const storePath = resolve('dist/server/store/index.js')
    
    const appModule = await import(appPath)
    const storeModule = await import(storePath)
    
    if (!appModule.App) {
      throw new Error('Не найден экспорт App в серверном модуле')
    }
    
    if (!storeModule.loadProducts || !storeModule.products) {
      throw new Error('Не найдены экспорты store в серверном модуле')
    }
    
    return {
      App: appModule.App,
      loadProducts: storeModule.loadProducts,
      products: storeModule.products
    }
  } catch (error) {
    console.error('❌ Ошибка импорта серверных модулей:', error.message)
    console.log('💡 Убедитесь, что выполнили: npm run build')
    throw error
  }
}

const getHtmlTemplate = () => {
  try {
    const templatePath = resolve('dist/client/index.html')
    return readFileSync(templatePath, 'utf-8')
  } catch (error) {
    console.error('❌ Не найден файл dist/client/index.html')
    console.log('💡 Выполните: npm run build')
    throw new Error(`HTML шаблон не найден: ${error.message}`)
  }
}

async function loadInitialData(serverModules) {
  try {
    await serverModules.loadProducts()
    
    return {
      products: serverModules.products.value || [],
      timestamp: new Date().toISOString(),
      compression: 'brotli-only'
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки данных:', error.message)
    return {
      products: [],
      timestamp: new Date().toISOString(),
      error: 'Failed to load data'
    }
  }
}

async function startServer() {
  try {
    const serverModules = await importServerModules()

    // SSR роут
    app.get('*', async (req, res) => {
      try {
        const initialData = await loadInitialData(serverModules)
        const appHtml = render(createElement(serverModules.App, { initialData }))
        const template = getHtmlTemplate()
        
        const html = template
          .replace('<!--preact-ssr-outlet-->', appHtml)
          .replace('<!--preact-ssr-data-->', `
            <script>
              window.__INITIAL_DATA__ = ${JSON.stringify(initialData).replace(
                /</g,
                '\\u003c'
              )};
            </script>
          `)
        
        res.set({
          'Content-Type': 'text/html; charset=utf-8',
          'Vary': 'Accept-Encoding'
        })
        
        res.status(200).end(html)
        
      } catch (error) {
        console.error('❌ SSR ошибка:', error.message)
        res.status(500).send(`
          <h1>Ошибка сервера</h1>
          <p>Произошла ошибка при рендеринге страницы</p>
          <a href="/">← Вернуться на главную</a>
        `)
      }
    })

    app.listen(port, () => {
      console.log(`🚀 Brotli-only сервер запущен: http://localhost:${port}`)
      console.log(`🗜️ Только Brotli сжатие`)
      console.log(`⚡ Готов к обслуживанию современных браузеров`)
      
      // Проверяем наличие .br файлов
      if (existsSync('dist/client')) {
        function findBrotliFiles(dir) {
          let results = []
          const list = readdirSync(dir)
          
          list.forEach((file) => {
            const filePath = join(dir, file)
            const stat = statSync(filePath)
            
            if (stat && stat.isDirectory()) {
              results = results.concat(findBrotliFiles(filePath))
            } else if (file.endsWith('.br')) {
              results.push(filePath)
            }
          })
          
          return results
        }
        
        const brFiles = findBrotliFiles('dist/client')
        
        if (brFiles.length > 0) {
          console.log(`📦 Найдено ${brFiles.length} предварительно сжатых .br файлов`)
        } else {
          console.log(`⚠️  Предварительно сжатые .br файлы не найдены`)
          console.log(`💡 Убедитесь, что vite-plugin-compression установлен`)
        }
      }
    })

  } catch (error) {
    console.error('❌ Не удалось запустить сервер:', error.message)
    process.exit(1)
  }
}

startServer()