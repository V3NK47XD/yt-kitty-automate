import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth()

    return (
        <nav className="navbar">
            <a className="navbar-logo" href="/">
                <div className="navbar-logo-icon">▶</div>
                <span>YT <span style={{ color: 'var(--red)' }}>Studio</span></span>
            </a>

            {isAuthenticated && user && (
                <div className="navbar-profile">
                    <img
                        className="navbar-avatar"
                        src={user.picture}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                    />
                    <span className="navbar-username">{user.name}</span>
                    <motion.button
                        className="btn-secondary navbar-logout"
                        onClick={logout}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                    >
                        Logout
                    </motion.button>
                </div>
            )}

            <div className="navbar-accent" />
        </nav>
    )
}
