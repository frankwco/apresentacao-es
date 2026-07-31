import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <NavBar />
      <main className="flex flex-col flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 bg-white py-5 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">ES</span>
            <span>IFPR – Campus Paranavaí</span>
            <span>·</span>
            <span>Engenharia de Software</span>
          </div>
          <span>Sistema de apresentação acadêmica — {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
