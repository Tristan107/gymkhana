import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import obfuscator from 'vite-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    obfuscator({
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        identifierNamesGenerator: 'hexadecimal',
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        selfDefending: false,
        debugProtection: false,
        deadCodeInjection: false,
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
  test: {
    slowTestThreshold: 2000,
  },
  base: '/gymkhana/', // Exact github repo name for hosting
})
