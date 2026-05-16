import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaDiscord, FaEye, FaEyeSlash } from 'react-icons/fa'
import axios from 'axios'
import { io } from 'socket.io-client'

const API_URL = '/api'
const CONFIG_KEY = 'discordBotConfig'

export default function DiscordSetup({ onClose }) {
    const [config, setConfig] = useState(() => {
        try { const s = localStorage.getItem(CONFIG_KEY); return s ? JSON.parse(s) : {} } catch { return {} }
    })
    const [token, setToken] = useState(config.token || '')
    const [channelId, setChannelId] = useState(config.channelId || '')
    const [filebinKey, setFilebinKey] = useState(config.filebinKey || '')
    const [showToken, setShowToken] = useState(false)

    const [active, setActive] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [logs, setLogs] = useState([])

    const socketRef = useRef(null)
    const pollRef = useRef(null)

    // Save config to localStorage on every change
    useEffect(() => {
        localStorage.setItem(CONFIG_KEY, JSON.stringify({ token, channelId, filebinKey }))
    }, [token, channelId, filebinKey])

    // Poll status + socket
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const r = await axios.get(`${API_URL}/discord/status`)
                setActive(r.data.running)
                if (r.data.logs) setLogs(r.data.logs)
            } catch { /* ignore */ }
        }

        fetchStatus()
        pollRef.current = setInterval(fetchStatus, 5000)

        try {
            const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] })
            socketRef.current = socket
            socket.on('discord:status', data => {
                setActive(data.running)
                if (data.logs) setLogs(data.logs)
            })
        } catch { /* ignore */ }

        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
            if (socketRef.current) socketRef.current.disconnect()
        }
    }, [])

    const handleToggle = async () => {
        setError('')
        setLoading(true)
        try {
            if (active) {
                await axios.post(`${API_URL}/discord/stop`)
                setActive(false)
            } else {
                if (!token.trim() || !channelId.trim()) {
                    setError('Bot Token and Channel ID are required.')
                    setLoading(false)
                    return
                }
                await axios.post(`${API_URL}/discord/start`, { token: token.trim(), channelId: channelId.trim(), filebinKey: filebinKey.trim() || undefined })
                setActive(true)
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message)
        }
        setLoading(false)
    }

    return (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div className="modal-content" initial={{ opacity: 0, scale: 0.88, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <button className="modal-close" onClick={onClose}><FaTimes /></button>

                <h2 className="modal-title" style={{ marginBottom: 0 }}>
                    <span style={{ background: 'linear-gradient(90deg,#5865F2,#57F287)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Discord Automation
                    </span>
                </h2>
                <p className="modal-subtitle">🤖 Auto-download links from Discord → Filebin</p>

                {/* Config Form */}
                <div style={{ marginBottom: 24 }}>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">🔑 Bot Token</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className="form-input" type={showToken ? 'text' : 'password'} placeholder="Your Discord bot token" value={token} onChange={e => setToken(e.target.value)} disabled={active} style={{ flex: 1 }} />
                            <button className="btn-secondary" onClick={() => setShowToken(s => !s)} style={{ padding: '8px 12px', flexShrink: 0 }} type="button">
                                {showToken ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <span className="form-hint">From Discord Developer Portal → Bot → Token</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">📺 Channel ID</label>
                        <input className="form-input" type="text" placeholder="e.g., 1475151176159985744" value={channelId} onChange={e => setChannelId(e.target.value)} disabled={active} />
                        <span className="form-hint">Right-click channel → Copy Channel ID (enable Developer Mode)</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">🔗 Filebin Key (optional)</label>
                        <input className="form-input" type="text" placeholder="Your Filebin key prefix" value={filebinKey} onChange={e => setFilebinKey(e.target.value)} disabled={active} />
                        <span className="form-hint">Used as prefix for Filebin upload URLs. Falls back to server .env value.</span>
                    </div>
                </div>

                {/* Activation Toggle */}
                <div className="discord-toggle-section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'var(--surface)', border: `2px solid ${active ? '#57F28744' : '#EA433544'}`, borderRadius: 16, marginBottom: 20, transition: 'border-color 0.3s ease' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <div className={`discord-status-dot ${active ? 'online' : 'offline'}`} />
                                <span style={{ fontWeight: 700, fontSize: 16 }}>{active ? 'Bot Active' : 'Bot Inactive'}</span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                                {active ? 'Monitoring channel for links...' : 'Toggle to activate the bot'}
                            </p>
                        </div>
                        <button
                            className={`discord-toggle ${active ? 'active' : ''}`}
                            onClick={handleToggle}
                            disabled={loading}
                            type="button"
                        >
                            <div className="discord-toggle-knob" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#EA4335' }}>
                        ❌ {error}
                    </div>
                )}

                {/* Activity Log */}
                {logs.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>📋 Activity Log</label>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < logs.length - 1 ? '1px solid var(--border2)' : 'none', display: 'flex', gap: 8 }}>
                                    <span style={{ color: 'var(--text-hint)', flexShrink: 0, fontSize: 10, marginTop: 2 }}>{new Date(log.time).toLocaleTimeString()}</span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </motion.div>
        </motion.div>
    )
}
