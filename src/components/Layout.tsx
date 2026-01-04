import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-gray-300 py-4 text-center text-sm">
        <p>FireTools - Herramientas para Ingenieros de Proteccion contra Incendios</p>
      </footer>
    </div>
  )
}
