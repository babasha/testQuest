// ssr-dev.js - Простой Brotli-only SSR dev сервер
import express from 'express'
import { brotliCompress } from 'zlib'
import { promisify } from 'util'
import { createServer as createViteServer } from 'vite'
import { readFileSync } from 'fs'

const app = express()
const port = 3000

const brotliCompressAsync = promisify(brotliCompress)

console.log('🚀 Запуск Brotli-only dev сервера...')

// Простой Brotli middleware для dev
const devBrotliMiddleware = () => {
  return async (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || ''
    
    // Если не поддерживает Brotli - редирект
    if (!acceptEncoding.includes('br')) {
      if (req.path !== '/upgrade-browser') {
        return res.redirect('/upgrade-browser')
      }
      return next()
    }
    
    // Легкое сжатие для dev режима
    const originalSend = res.send
    res.send = function(data) {
      if (shouldCompressInDev(res.getHeader('content-type'), data)) {
        return compressDevResponse.call(this, data, originalSend)
      }
      return originalSend.call(this, data)
    }
    
    next()
  }
}

async function compressDevResponse(data, originalSend) {
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    
    // В dev режиме сжимаем только большие файлы
    if (buffer.length < 2048) {
      return originalSend.call(this, data)
    }
    
    const compressed = await brotliCompressAsync(buffer, {
      params: {
        [require('zlib').constants.BROTLI_PARAM_QUALITY]: 1, // Быстрое сжатие
        [require('zlib').constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
      }
    })
    
    this.set({
      'Content-Encoding': 'br',
      'Content-Length': compressed.length.toString(),
      'Vary': 'Accept-Encoding'
    })
    
    this.end(compressed)
    
  } catch (error) {
    console.warn('⚠️ Dev Brotli ошибка:', error.message)
    originalSend.call(this, data)
  }
}

function shouldCompressInDev(contentType, data) {
  if (!contentType) return false
  return /text|javascript|json|css|xml|svg/.test(contentType.toString())
}

async function createServer() {
  try {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'info'
    })

    // Применяем Brotli middleware
    app.use(devBrotliMiddleware())

    // Используем Vite middleware
    app.use(vite.middlewares)

    // Страница обновления браузера для dev
    app.get('/upgrade-browser', (req, res) => {
      const devUpgradeHtml = `
        <!DOCTYPE html>
        <html lang="ru">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🔧 Dev: Обновите браузер</title>
            <style>
              body {
                font-family: system-ui, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                max-width: 600px;
                text-align: center;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 2rem;
                border: 2px solid #ff6b6b;
              }
              .dev-badge {
                background: #ff6b6b;
                color: white;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.8rem;
                font-weight: bold;
                display: inline-block;
                margin-bottom: 1rem;
              }
              h1 { margin: 1rem 0; }
              .browsers {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 1rem;
                margin: 2rem 0;
              }
              .browser {
                background: rgba(255,255,255,0.15);
                border-radius: 12px;
                padding: 1rem;
                text-decoration: none;
                color: white;
                transition: transform 0.3s ease;
              }
              .browser:hover {
                transform: translateY(-5px);
              }
              .dev-info {
                background: rgba(255,107,107,0.2);
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1rem;
                font-size: 0.9rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="dev-badge">DEV MODE</div>
              <h1>🔧 Brotli-only Dev Server</h1>
              <p>
                Ваш браузер не поддерживает Brotli сжатие. 
                Используйте современный браузер для разработки.
              </p>
              
              <div class="browsers">
                <a href="https://www.google.com/chrome/" class="browser">
                  <div style="font-size: 2rem;">🌐</div>
                  Chrome
                </a>
                <a href="https://www.mozilla.org/firefox/" class="browser">
                  <div style="font-size: 2rem;">🦊</div>
                  Firefox
                </a>
                <a href="https://www.microsoft.com/edge" class="browser">
                  <div style="font-size: 2rem;">🔷</div>
                  Edge
                </a>
              </div>
              
              <div class="dev-info">
                <strong>Dev режим:</strong> Страница будет работать, но без сжатия.<br>
                <strong>Production:</strong> Старые браузеры будут заблокированы.
              </div>
              
              <p style="margin-top: 1.5rem;">
                <button onclick="history.back()" style="
                  background: rgba(255,255,255,0.2);
                  border: 1px solid rgba(255,255,255,0.3);
                  color: white;
                  padding: 8px 16px;
                  border-radius: 6px;
                  cursor: pointer;
                ">← Назад к сайту</button>
              </p>
            </div>
          </body>
        </html>
      `
      res.send(devUpgradeHtml)
    })

    // SSR middleware
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl
      
      try {
        let template = readFileSync('index.html', 'utf-8')
        template = await vite.transformIndexHtml(url, template)

        try {
          const serverModule = await vite.ssrLoadModule('/src/server-entry.tsx')
          
          if (!serverModule.renderToString) {
            throw new Error('Функция renderToString не найдена')
          }
          
          const rendered = await serverModule.renderToString({ 
            url, 
            userAgent: req.headers['user-agent'] || 'dev-browser'
          })
          
          if (!rendered || !rendered.html) {
            throw new Error('SSR рендер вернул пустой результат')
          }
          
          const devInitialData = {
            ...rendered.initialData,
            devMode: true,
            compression: 'brotli-dev'
          }
          
          const html = template
            .replace('<!--preact-ssr-outlet-->', rendered.html)
            .replace('<!--preact-ssr-data-->', `
              <script>
                window.__INITIAL_DATA__ = ${JSON.stringify(devInitialData).replace(
                  /</g,
                  '\\u003c'
                )};
                console.log('🔧 Brotli-only dev режим');
              </script>
            `)
          
          res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Vary': 'Accept-Encoding'
          })
          
          res.status(200).end(html)
          
        } catch (ssrError) {
          console.warn('⚠️ SSR ошибка, клиентский рендер:', ssrError.message)
          
          const clientTemplate = template.replace('<!--preact-ssr-data-->', `
            <script>
              window.__INITIAL_DATA__ = { devMode: true };
              console.log('🎨 Dev клиентский рендер');
            </script>
          `)
          
          res.set('Content-Type', 'text/html; charset=utf-8')
          res.status(200).end(clientTemplate)
        }
        
      } catch (error) {
        if (vite && vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(error)
        }
        console.error('❌ Dev ошибка:', error.message)
        next(error)
      }
    })

    app.listen(port, () => {
      console.log(`✅ Brotli-only dev сервер: http://localhost:${port}`)
      console.log('🔄 Hot reload включен')
      console.log('🗜️ Только Brotli сжатие')
      console.log('')
      console.log('🎯 Используйте СОВРЕМЕННЫЙ браузер!')
    })

  } catch (error) {
    console.error('❌ Не удалось запустить dev сервер:', error)
    process.exit(1)
  }
}

createServer()