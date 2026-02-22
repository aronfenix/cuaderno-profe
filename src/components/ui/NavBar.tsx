import { NavLink } from 'react-router-dom'
import './NavBar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠', exact: true },
  { to: '/assessments', label: 'Evaluar', icon: '✅', exact: false },
  { to: '/library', label: 'Rúbricas', icon: '📋', exact: false },
  { to: '/setup', label: 'Grupos', icon: '👥', exact: false },
]

export function NavBar() {
  return (
    <nav className="navbar">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={({ isActive }) => `navbar-item ${isActive ? 'active' : ''}`}
        >
          <span className="navbar-icon">{item.icon}</span>
          <span className="navbar-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
