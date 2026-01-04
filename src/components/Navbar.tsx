import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const linkClass = (path: string, exact = false) => {
    const active = exact ? location.pathname === path : isActive(path)
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? 'bg-red-800' : 'hover:bg-red-600'}`
  }

  return (
    <nav className="bg-red-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-xl">FireTools</span>
          </Link>

          <div className="flex space-x-4">
            <Link to="/" className={linkClass('/', true)}>
              Inicio
            </Link>
            <Link to="/calculadoras" className={linkClass('/calculadoras')}>
              Calculadoras
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
