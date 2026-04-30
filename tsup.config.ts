import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: false,
    clean: true,
    minify: false,
    treeshake: true,
    target: 'es2020',
    platform: 'browser',
    external: ['react', 'react-dom', '@cloudsignal/mqtt-client'],
    outExtension({ format }) {
      return format === 'esm' ? { js: '.js' } : { js: '.cjs' }
    },
    banner: {
      js: `/**
 * @cloudsignal/notifications v0.1.0
 * Realtime in-app notifications for React
 * https://cloudsignal.io
 * MIT License
 */`,
    },
  },
])
