import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import viteCompression from 'vite-plugin-compression'
import { constants } from 'zlib'

export default defineConfig(({ mode, command }) => {
  const isProduction = mode === 'production'
  const isSSRBuild = process.argv.includes('--ssr')
  
  console.log(`🚀 Сборка: ${mode} режим, SSR: ${isSSRBuild}, Brotli-only: true`)
  
  return {
    plugins: [
      preact({
        devToolsEnabled: !isProduction,
        devtoolsInProd: false
      }),
      // Добавляем Brotli сжатие только для production client сборки
      isProduction && !isSSRBuild && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 512,
        deleteOriginFile: false,
        verbose: true,
        disable: false,
        compressionOptions: {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: 11,
          }
        }
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    
    define: {
      __DEV__: JSON.stringify(!isProduction),
      __BROTLI_ONLY__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify(mode),
      __SSR__: JSON.stringify(isSSRBuild)
    },
    
    // SSR конфигурация
    ssr: {
      external: ['express'],
      noExternal: ['preact', '@preact/signals', 'goober', 'preact-router']
    },
    
    build: isSSRBuild ? {
      // Конфигурация для серверной сборки
      ssr: true,
      outDir: 'dist/server',
      rollupOptions: {
        input: 'src/server-entry.tsx',
        output: {
          format: 'es',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js'
        }
      },
      minify: false,
      sourcemap: true
    } : {
      // Конфигурация для клиентской сборки с агрессивной оптимизацией
      target: 'es2020',
      outDir: 'dist/client',
      minify: 'terser',
      sourcemap: false,
      cssCodeSplit: false,
      reportCompressedSize: false,
      
      
      rollupOptions: {
        output: {
          entryFileNames: 'js/[hash:8].js',
          chunkFileNames: 'js/[hash:8].js',
          assetFileNames: 'assets/[hash:8].[ext]'
        }
      }
    },
    
    server: {
      host: true,
      port: 5173,
      middlewareMode: command === 'serve' ? false : true
    },
    
    optimizeDeps: {
      include: ['preact', 'preact/hooks', '@preact/signals'],
      exclude: isSSRBuild ? ['express'] : []
    }
  }
})