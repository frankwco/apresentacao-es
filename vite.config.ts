import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serve o projeto em usuario.github.io/apresentacao-es/, não
  // na raiz — sem isso os assets buildados (JS/CSS) apontariam para "/" e
  // dariam 404. Ajuste o nome abaixo se o repositório no GitHub tiver outro
  // nome. Em dev (`npm run dev`) o base continua "/" normalmente.
  base: command === 'build' ? '/apresentacao-es/' : '/',
  plugins: [react(), tailwindcss()],
}))
