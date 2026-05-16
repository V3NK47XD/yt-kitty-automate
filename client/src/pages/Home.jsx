import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RankingWizard from '../components/RankingWizard'
import Ranking3Wizard from '../components/Ranking3Wizard'
import DiscordSetup from '../components/DiscordSetup'
import { useAuth } from '../context/AuthContext'
import { FaYoutube, FaSave, FaGoogle } from 'react-icons/fa'

const FEATURES = [
    {
        icon: '🏆', label: 'Create 5 Clip Ranking Video',
        desc: 'Combine 5 clips with animated rankings, title overlays, and AI captions. Upload straight to YouTube.',
        iconClass: 'card-icon-red', active: true, id: 'ranking5',
    },
    {
        icon: '🎬', label: 'Create 3 Clip Ranking Video',
        desc: 'Quick 3-clip ranking with AI captions, perfect overlays, trimmed to 57s. Upload to YouTube.',
        iconClass: 'card-icon-yellow', active: true, id: 'ranking3',
    },
    {
        icon: '🤖', label: 'Activate Discord Automation',
        desc: 'Connect a Discord bot to auto-download video links and upload them to Filebin instantly.',
        iconClass: 'card-icon-green', active: true, id: 'discord',
    },
]

export default function Home() {
    const [activeWizard, setActiveWizard] = useState(null)
    const { isAuthenticated, loading, login } = useAuth()

    // ── YT Defaults (persisted in localStorage) ────────────────────────────
    const [ytDefaults, setYtDefaults] = useState(() => {
        try {
            const saved = localStorage.getItem('ytDefaults')
            return saved ? JSON.parse(saved) : null
        } catch { return null }
    })
    const [showDefaults, setShowDefaults] = useState(false)
    const [defaultsForm, setDefaultsForm] = useState(ytDefaults || {
        title: '', description: '', tags: '', privacyStatus: 'private',
        categoryId: '22', madeForKids: false, language: 'en',
        defaultAudioLanguage: 'en', license: 'youtube', embeddable: true,
        publicStatsViewable: true, notifySubscribers: true,
    })
    const [defaultsSaved, setDefaultsSaved] = useState(false)

    const updateDefault = (k, v) => setDefaultsForm(d => ({ ...d, [k]: v }))

    const saveDefaults = () => {
        localStorage.setItem('ytDefaults', JSON.stringify(defaultsForm))
        setYtDefaults(defaultsForm)
        setDefaultsSaved(true)
        setTimeout(() => setDefaultsSaved(false), 2000)
    }

    const clearDefaults = () => {
        localStorage.removeItem('ytDefaults')
        setYtDefaults(null)
        setDefaultsForm({
            title: '', description: '', tags: '', privacyStatus: 'private',
            categoryId: '22', madeForKids: false, language: 'en',
            defaultAudioLanguage: 'en', license: 'youtube', embeddable: true,
            publicStatsViewable: true, notifySubscribers: true,
        })
    }

    return (
        <div className="page">
            {/* Unskippable sign-in overlay when not authenticated */}
            <AnimatePresence>
                {!loading && !isAuthenticated && (
                    <motion.div
                        className="auth-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="auth-overlay-card"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>
                                Sign in to Continue
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28, maxWidth: 340, lineHeight: 1.6 }}>
                                Sign in with your Google account to access YouTube automation tools.
                            </p>
                            <button className="google-signin-btn" onClick={login}>
                                <FaGoogle style={{ color: '#4285F4', fontSize: 20 }} />
                                Sign in with Google
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero */}
            <section className="hero" style={{ position: 'relative' }}>
                {/* Background orbs */}
                <div className="hero-orbs">
                    <div className="orb orb-1" />
                    <div className="orb orb-2" />
                    <div className="orb orb-3" />
                    <div className="orb orb-4" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="hero-badge">
                        🚀 Powered by ffmpeg &amp; YouTube API
                    </div>

                    <h1 className="hero-title">
                        <span className="word-auto">Automate</span>{' '}
                        <span className="word-your">Your</span>
                        <br />
                        <span className="word-youtube">YouTube</span>{' '}
                        <span className="word-content">Content</span>
                    </h1>

                    <p className="hero-subtitle">
                        Download clips, combine them, add overlays, and upload directly to YouTube —
                        all from your browser in minutes.
                    </p>

                    <motion.button
                        className="btn-primary"
                        style={{ fontSize: 17, padding: '14px 36px' }}
                        onClick={() => setActiveWizard('ranking5')}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        id="get-started-btn"
                    >
                        🏆 Create a 5 Clip Ranking Video
                    </motion.button>
                </motion.div>
            </section>

            {/* Feature cards */}
            <section className="cards-section">
                <h2 className="section-title">
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 16, display: 'block', marginBottom: 6 }}>
                        WHAT WOULD YOU LIKE TO DO?
                    </span>
                    Choose an Action
                </h2>

                <div className="cards-grid">
                    {FEATURES.map((f, i) => (
                        <motion.div
                            key={f.id}
                            className={`feature-card active`}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            onClick={() => setActiveWizard(f.id)}
                            id={`card-${f.id}`}
                        >
                            <div className={`card-icon ${f.iconClass}`}>{f.icon}</div>
                            <h3 className="card-title">{f.label}</h3>
                            <p className="card-desc">{f.desc}</p>
                            <p className="card-arrow">Start now →</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── YouTube Defaults Section ── */}
            <section className="cards-section" style={{ paddingTop: 0 }}>
                <motion.button
                    className="btn-secondary"
                    style={{ margin: '0 auto 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}
                    onClick={() => setShowDefaults(s => !s)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <FaYoutube style={{ color: '#FF0000' }} />
                    {showDefaults ? 'Hide' : 'Set'} YouTube Upload Defaults
                </motion.button>

                <AnimatePresence>
                    {showDefaults && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden', width: '100%', maxWidth: 700, margin: '0 auto' }}
                        >
                            <div style={{
                                background: 'var(--card-bg, #1a1a2e)',
                                border: '1px solid var(--card-border, #ffffff12)',
                                borderRadius: 16, padding: 24, marginBottom: 24,
                            }}>
                                <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>⚙️ Default YouTube Upload Settings</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 20px' }}>
                                    These will pre-fill the YT Details step every time you create a video.
                                </p>
                                <div className="metadata-form">
                                    <div className="form-group full-width">
                                        <label className="form-label">Default Title</label>
                                        <input className="form-input" type="text" placeholder="My Ranking Video #Shorts" value={defaultsForm.title} onChange={e => updateDefault('title', e.target.value)} maxLength={100} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Default Description</label>
                                        <textarea className="form-input" placeholder="Describe your video..." value={defaultsForm.description} onChange={e => updateDefault('description', e.target.value)} maxLength={5000} rows={3} />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Default Tags</label>
                                        <input className="form-input" type="text" placeholder="viral, cats, ranking, shorts" value={defaultsForm.tags} onChange={e => updateDefault('tags', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Privacy</label>
                                        <select className="form-select" value={defaultsForm.privacyStatus} onChange={e => updateDefault('privacyStatus', e.target.value)}>
                                            <option value="public">Public</option><option value="private">Private</option><option value="unlisted">Unlisted</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select className="form-select" value={defaultsForm.categoryId} onChange={e => updateDefault('categoryId', e.target.value)}>
                                            <option value="15">Pets &amp; Animals</option><option value="23">Comedy</option><option value="24">Entertainment</option><option value="22">People &amp; Blogs</option><option value="20">Gaming</option><option value="17">Sports</option><option value="10">Music</option><option value="27">Education</option><option value="28">Science &amp; Technology</option><option value="1">Film &amp; Animation</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Made for Kids</label>
                                        <select className="form-select" value={String(defaultsForm.madeForKids)} onChange={e => updateDefault('madeForKids', e.target.value === 'true')}>
                                            <option value="false">No</option><option value="true">Yes</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Language</label>
                                        <select className="form-select" value={defaultsForm.language} onChange={e => updateDefault('language', e.target.value)}>
                                            <option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="ko">Korean</option><option value="ja">Japanese</option><option value="pt">Portuguese</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Audio Language</label>
                                        <select className="form-select" value={defaultsForm.defaultAudioLanguage} onChange={e => updateDefault('defaultAudioLanguage', e.target.value)}>
                                            <option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="ko">Korean</option><option value="ja">Japanese</option><option value="pt">Portuguese</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">License</label>
                                        <select className="form-select" value={defaultsForm.license} onChange={e => updateDefault('license', e.target.value)}>
                                            <option value="youtube">Standard YouTube</option><option value="creativeCommon">Creative Commons</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Embeddable</label>
                                        <select className="form-select" value={String(defaultsForm.embeddable)} onChange={e => updateDefault('embeddable', e.target.value === 'true')}>
                                            <option value="true">Yes</option><option value="false">No</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Public Stats</label>
                                        <select className="form-select" value={String(defaultsForm.publicStatsViewable)} onChange={e => updateDefault('publicStatsViewable', e.target.value === 'true')}>
                                            <option value="true">Visible</option><option value="false">Hidden</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Notify Subscribers</label>
                                        <select className="form-select" value={String(defaultsForm.notifySubscribers)} onChange={e => updateDefault('notifySubscribers', e.target.value === 'true')}>
                                            <option value="true">Yes</option><option value="false">No</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {defaultsSaved && <span style={{ color: '#34A853', fontSize: 13 }}>✅ Saved!</span>}
                                    {ytDefaults && (
                                        <button className="btn-secondary" onClick={clearDefaults} style={{ fontSize: 13 }}>
                                            Clear Defaults
                                        </button>
                                    )}
                                    <button className="btn-primary" onClick={saveDefaults} style={{ fontSize: 14, padding: '10px 24px' }}>
                                        <FaSave style={{ marginRight: 6 }} /> Save Defaults
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Wizard modals */}
            <AnimatePresence>
                {activeWizard === 'ranking5' && (
                    <RankingWizard onClose={() => setActiveWizard(null)} ytDefaults={ytDefaults} />
                )}
                {activeWizard === 'ranking3' && (
                    <Ranking3Wizard onClose={() => setActiveWizard(null)} ytDefaults={ytDefaults} />
                )}
                {activeWizard === 'discord' && (
                    <DiscordSetup onClose={() => setActiveWizard(null)} />
                )}
            </AnimatePresence>
        </div>
    )
}
