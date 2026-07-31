import { NavLink } from "react-router-dom"

const links = [
  { to: "/",       label: "Disputa", icon: "⚡" },
  { to: "/curso",  label: "Curso",   icon: "🎓" },
  { to: "/codigo", label: "Código",  icon: "💻" },
  { to: "/admin",  label: "Admin",   icon: "⚙️" },
]

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5 select-none">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-600 shadow-sm">
            <span className="text-white font-black text-sm leading-none">ES</span>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-gray-900 font-semibold text-sm">Engenharia</span>
            <span className="text-gray-400 text-xs">de Software · IFPR</span>
          </div>
        </div>
        <ul className="flex items-center gap-0.5">
          {links.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "text-green-700 bg-green-50"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="text-base leading-none">{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-green-600" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
