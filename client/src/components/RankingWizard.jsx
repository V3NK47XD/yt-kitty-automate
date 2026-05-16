import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FaInstagram, FaYoutube, FaTimes, FaArrowRight, FaArrowLeft,
    FaCheckCircle, FaUpload, FaExclamationCircle, FaExternalLinkAlt, FaCheck, FaUndo
} from 'react-icons/fa'
import { io } from 'socket.io-client'
import axios from 'axios'
import LoadingAnimation from './LoadingAnimation'
import { useAuth } from '../context/AuthContext'

const API_URL = '/api'
const POLL_INTERVAL = 2000   // poll every 2 seconds as fallback
const WIZARD_STATE_KEY = 'rankingWizardState'

const STEPS = [
    { label: 'Platform', icon: '🎯' },
    { label: 'Video Info', icon: '📝' },
    { label: 'Processing', icon: '⚙️' },
    { label: 'Preview', icon: '🎬' },
    { label: 'YT Details', icon: '📋' },
    { label: 'Upload', icon: '🚀' },
]

const stepVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.2 } }),
}

// Save indicator — shows green checkmark briefly on blur
function SavedIndicator({ show }) {
    if (!show) return null
    return (
        <span className="save-indicator" key={Date.now()}>
            <FaCheck /> Saved
        </span>
    )
}

export default function RankingWizard({ onClose, ytDefaults }) {
    const { tokens, isAuthenticated } = useAuth()
    // ── Load saved state from localStorage on mount ────────────────────────────
    const savedRef = useRef(null)
    try {
        const raw = localStorage.getItem(WIZARD_STATE_KEY)
        if (raw) savedRef.current = JSON.parse(raw)
    } catch { /* ignore corrupt data */ }
    const saved = savedRef.current

    const [step, setStep] = useState(() => {
        if (!saved) return 0
        // Can't resume server-side processing (step 2) — go back to step 1
        if (saved.step === 2) return 1
        // Steps 3-5 require a valid job on the server — validated later in useEffect
        return saved.step ?? 0
    })
    const [direction, setDirection] = useState(1)
    const [platform, setPlatform] = useState(saved?.platform ?? null)

    // Step 1 inputs
    const [videoTitle, setVideoTitle] = useState(saved?.videoTitle ?? '')
    const [links, setLinks] = useState(saved?.links ?? ['', '', '', '', ''])
    const [captions, setCaptions] = useState(saved?.captions ?? ['', '', '', '', ''])
    const [captionMode, setCaptionMode] = useState(saved?.captionMode ?? 'manual')

    // Step 2 — job/processing
    const [jobId, setJobId] = useState(saved?.jobId ?? null)
    const [jobStatus, setJobStatus] = useState(() => {
        if (saved?.step >= 3 && saved?.jobId) return { status: 'ready', progress: 100, message: '🎉 Video ready!' }
        return { status: 'idle', progress: 0, message: 'Starting...' }
    })
    const pollRef = useRef(null)
    const socketRef = useRef(null)

    // Step 4 — YT metadata (initialized from saved → ytDefaults → base)
    const [meta, setMeta] = useState(() => {
        const base = {
            title: '',
            description: '',
            tags: '',
            privacyStatus: 'private',
            categoryId: '22',
            madeForKids: false,
            language: 'en',
            defaultAudioLanguage: 'en',
            recordingDate: new Date().toISOString().split('T')[0],
            license: 'youtube',
            embeddable: true,
            publicStatsViewable: true,
            notifySubscribers: true,
        }
        if (saved?.meta) return { ...base, ...saved.meta, recordingDate: base.recordingDate }
        if (ytDefaults) return { ...base, ...ytDefaults, recordingDate: base.recordingDate }
        return base
    })

    // Step 5 — upload
    const [uploadStatus, setUploadStatus] = useState(null)
    const [uploadError, setUploadError] = useState('')
    const [youtubeVideoId, setYoutubeVideoId] = useState(null)
    const [shareStatus, setShareStatus] = useState(null)
    const [shareUrl, setShareUrl] = useState('')
    const [shareError, setShareError] = useState('')

    // Track which fields have been "saved" (show green indicator on blur)
    const [savedFields, setSavedFields] = useState({})

    const showSaved = useCallback((fieldId) => {
        setSavedFields(prev => ({ ...prev, [fieldId]: true }))
        setTimeout(() => setSavedFields(prev => ({ ...prev, [fieldId]: false })), 1800)
    }, [])

    // Track whether state persistence is active (disabled after upload success)
    const persistRef = useRef(true)

    // ── Validate saved job on mount ──────────────────────────────────────────
    useEffect(() => {
        // Validate saved job still exists on server (for steps 3-5)
        if (saved?.step >= 3 && saved?.jobId) {
            axios.get(`${API_URL}/video/status/${saved.jobId}`)
                .then(r => {
                    if (r.data.status === 'ready') {
                        setJobStatus({ status: 'ready', progress: 100, message: '🎉 Video ready!' })
                    } else {
                        setStep(1)
                    }
                })
                .catch(() => {
                    setStep(1)
                    setJobId(null)
                })
        }
    }, [])

    // ── Auto-save wizard state to localStorage on every change ─────────────────
    const saveTimerRef = useRef(null)
    useEffect(() => {
        if (!persistRef.current) return
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            localStorage.setItem(WIZARD_STATE_KEY, JSON.stringify({
                step, platform, videoTitle, links, captions, captionMode, meta, jobId,
            }))
        }, 300)
        return () => clearTimeout(saveTimerRef.current)
    }, [step, platform, videoTitle, links, captions, captionMode, meta, jobId])

    // ── Polling + Socket.IO for job status ─────────────────────────────────────
    // Primary: HTTP polling every 2s (reliable)
    // Secondary: Socket.IO (instant updates)
    useEffect(() => {
        if (!jobId) return

        // One shared status updater
        const applyUpdate = (data) => {
            setJobStatus(prev => {
                // Ignore stale or lower-progress updates
                if (data.progress < prev.progress && data.status === prev.status) return prev
                return data
            })

            if (data.status === 'ready') {
                stopPolling()
                setTimeout(() => { setDirection(1); setStep(3) }, 900)
            }
            if (data.status === 'error') {
                stopPolling()
            }
        }

        // HTTP polling
        const startPolling = () => {
            pollRef.current = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_URL}/video/status/${jobId}`)
                    applyUpdate(res.data)
                } catch { /* ignore network errors */ }
            }, POLL_INTERVAL)
        }

        const stopPolling = () => {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
            if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
        }

        // Socket.IO (bonus — gives instant updates)
        try {
            const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] })
            socketRef.current = socket
            socket.on(`job:${jobId}`, applyUpdate)
            socket.on('connect_error', () => { /* fallback to polling is fine */ })
        } catch { /* ignore */ }

        startPolling()

        // Immediate first poll (don't wait 2 s)
        axios.get(`${API_URL}/video/status/${jobId}`)
            .then(r => applyUpdate(r.data))
            .catch(() => { })

        return stopPolling
    }, [jobId])

    // ── Navigation helpers ─────────────────────────────────────────────────────
    const go = useCallback((dir) => {
        setDirection(dir)
        setStep(s => s + dir)
    }, [])

    // ── Step 0 — platform selection ───────────────────────────────────────────
    const selectPlatform = (p) => { setPlatform(p); go(1) }

    // ── Step 1 — start processing ─────────────────────────────────────────────
    const startProcessing = async () => {
        go(1) // Switch to step 2 immediately (loading screen)
        setJobStatus({ status: 'processing', progress: 0, message: 'Submitting job...' })
        setShareStatus(null)
        setShareUrl('')
        setShareError('')
        try {
            const res = await axios.post(`${API_URL}/video/process`, {
                videoTitle: videoTitle.trim(),
                captions: captions.map(c => c.trim()),
                links: links.map(l => l.trim()),
                captionMode,
            })
            setJobId(res.data.jobId)
        } catch (err) {
            setJobStatus({
                status: 'error',
                progress: 0,
                message: err.response?.data?.error || err.message || 'Failed to start processing',
            })
        }
    }

    const handleShare = async () => {
        setShareStatus('uploading')
        setShareError('')
        setShareUrl('')
        try {
            const res = await axios.post(`${API_URL}/video/share`, {
                jobId,
                deleteAfter: false,
            })
            setShareUrl(res.data.url)
            setShareStatus('success')
        } catch (err) {
            setShareStatus('error')
            setShareError(err.response?.data?.error || err.message)
        }
    }

    // ── YouTube upload ────────────────────────────────────────────────────────
    const handleUpload = async () => {
        setUploadStatus('uploading')
        setUploadError('')
        try {
            const res = await axios.post(`${API_URL}/video/upload`, {
                jobId,
                metadata: {
                    ...meta,
                    tags: meta.tags.split(',').map(t => t.trim()).filter(Boolean),
                },
                tokens,
            })
            setYoutubeVideoId(res.data.videoId)
            setUploadStatus('success')
            // Upload succeeded — stop persisting and clear saved state
            persistRef.current = false
            localStorage.removeItem(WIZARD_STATE_KEY)
        } catch (err) {
            setUploadStatus('error')
            setUploadError(err.response?.data?.error || err.message)
        }
    }

    // ── Close wizard — always preserves state ───────────────────────────────
    const handleClose = useCallback(() => {
        if (uploadStatus === 'success') {
            persistRef.current = false
            localStorage.removeItem(WIZARD_STATE_KEY)
        }
        onClose()
    }, [uploadStatus, onClose])

    // ── Start Over — explicit state clear ─────────────────────────────────────
    const handleStartOver = useCallback(() => {
        persistRef.current = false
        localStorage.removeItem(WIZARD_STATE_KEY)
        if (jobId) {
            axios.post(`${API_URL}/video/cleanup`).catch(() => {})
        }
        setStep(0)
        setDirection(-1)
        setPlatform(null)
        setVideoTitle('')
        setLinks(['', '', '', '', ''])
        setCaptions(['', '', '', '', ''])
        setCaptionMode('manual')
        setJobId(null)
        setJobStatus({ status: 'idle', progress: 0, message: 'Starting...' })
        setMeta({
            title: '', description: '', tags: '', privacyStatus: 'private',
            categoryId: '22', madeForKids: false, language: 'en',
            defaultAudioLanguage: 'en', recordingDate: new Date().toISOString().split('T')[0],
            license: 'youtube', embeddable: true, publicStatsViewable: true, notifySubscribers: true,
        })
        setUploadStatus(null)
        setUploadError('')
        setYoutubeVideoId(null)
        setShareStatus(null)
        setShareUrl('')
        setShareError('')
        // Re-enable persistence for the fresh session
        setTimeout(() => { persistRef.current = true }, 100)
    }, [jobId])

    // ── Validation ────────────────────────────────────────────────────────────
    const valid1 = videoTitle.trim() &&
        links.every(l => l.trim()) &&
        (captionMode !== 'manual' || captions.every(c => c.trim()))

    // ── Helpers ───────────────────────────────────────────────────────────────
    const updateLink = (i, v) => setLinks(ls => ls.map((l, j) => j === i ? v : l))
    const updateCaption = (i, v) => setCaptions(cs => cs.map((c, j) => j === i ? v : c))
    const updateMeta = (k, v) => setMeta(m => ({ ...m, [k]: v }))

    const handleBlur = useCallback((fieldId, value) => {
        if (value && String(value).trim()) showSaved(fieldId)
    }, [showSaved])

    const linkColors = ['#EA4335', '#FBBC04', '#A142F4', '#34A853', '#4285F4']

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && handleClose()}
        >
            <motion.div
                className="modal-content"
                initial={{ opacity: 0, scale: 0.88, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 40 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* Close */}
                <button className="modal-close" onClick={handleClose}><FaTimes /></button>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h2 className="modal-title" style={{ marginBottom: 0 }}>
                        <span style={{ background: 'linear-gradient(90deg,#EA4335,#FBBC04,#A142F4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Create Ranking Video
                        </span>
                    </h2>
                    {step > 0 && uploadStatus !== 'success' && (
                        <button className="start-over-btn" onClick={handleStartOver}>
                            <FaUndo style={{ fontSize: 10, marginRight: 4 }} /> Start Over
                        </button>
                    )}
                </div>
                <p className="modal-subtitle">{STEPS[step]?.icon} {STEPS[step]?.label} — Step {step + 1} of {STEPS.length}</p>

                {/* Step indicator */}
                <div className="steps-indicator">
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                            <div className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} />
                            {i < STEPS.length - 1 && <div className="step-line" />}
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait" custom={direction}>

                    {/* ── Step 0: Platform ── */}
                    {step === 0 && (
                        <motion.div key="s0" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Where are your 5 video clips hosted?</p>
                            <div className="platform-options">
                                <button className="platform-btn platform-ig" onClick={() => selectPlatform('instagram')}>
                                    <FaInstagram style={{ fontSize: 44, color: '#E1306C' }} />
                                    <span>Instagram</span>
                                    <small>Reels / Videos</small>
                                </button>
                                <button className="platform-btn platform-yt" onClick={() => selectPlatform('youtube')}>
                                    <FaYoutube style={{ fontSize: 44, color: '#FF0000' }} />
                                    <span>YouTube</span>
                                    <small>Videos / Shorts</small>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 1: Video Info ── */}
                    {step === 1 && (
                        <motion.div key="s1" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
                            {/* Title overlay */}
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label">📌 Video Title Overlay <SavedIndicator show={savedFields['videoTitle']} /></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g., RANKING CUTEST KITTY MOMENTS"
                                    value={videoTitle}
                                    onChange={e => setVideoTitle(e.target.value)}
                                    onBlur={() => handleBlur('videoTitle', videoTitle)}
                                    maxLength={100}
                                    id="video-title-input"
                                    autoFocus
                                />
                                <span className="form-hint">Overlaid on screen throughout the video</span>
                            </div>

                            {/* 5 links */}
                            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                                {platform === 'instagram' ? '📸 Instagram Reel Links' : '▶️ YouTube Links'} (all 5 required)
                            </label>
                            <div className="links-form" style={{ marginBottom: 20 }}>
                                {links.map((link, i) => (
                                    <div className="link-input-group" key={i}>
                                        <div className="link-number" style={{ background: `${linkColors[i]}22`, color: linkColors[i], border: `1px solid ${linkColors[i]}44` }}>{i + 1}</div>
                                        <input
                                            className="form-input"
                                            type="url"
                                            placeholder={`Clip ${i + 1} link`}
                                            value={link}
                                            onChange={e => updateLink(i, e.target.value)}
                                            onBlur={() => handleBlur(`link-${i}`, link)}
                                            id={`link-${i}`}
                                        />
                                        <SavedIndicator show={savedFields[`link-${i}`]} />
                                    </div>
                                ))}
                            </div>

                            {/* Caption mode */}
                            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                                🧩 Caption Mode
                            </label>
                            <div className="caption-mode">
                                {[
                                    { id: 'manual', label: 'Manual' },
                                    { id: 'random', label: 'Auto (Random)' },
                                    { id: 'ai', label: 'Auto (Gemini)' },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        className={`caption-mode-btn ${captionMode === opt.id ? 'active' : ''}`}
                                        onClick={() => setCaptionMode(opt.id)}
                                        type="button"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <span className="form-hint" style={{ display: 'block', marginBottom: 14 }}>
                                Auto (Gemini) requires `GEMINI_API_KEY` in server/.env. Auto modes use best-effort captions.
                            </span>

                            {/* 5 captions */}
                            <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                                💬 Ranking Captions (shown as overlay text)
                            </label>
                            <div className="links-form">
                                {captions.map((cap, i) => (
                                    <div className="link-input-group" key={i}>
                                        <div className="link-number" style={{ background: `${linkColors[i]}22`, color: linkColors[i], border: `1px solid ${linkColors[i]}44` }}>{i + 1}</div>
                                        <input
                                            className="form-input"
                                            type="text"
                                            placeholder={captionMode === 'manual' ? `Caption for clip ${i + 1}` : 'Auto-generated'}
                                            value={cap}
                                            onChange={e => updateCaption(i, e.target.value)}
                                            onBlur={() => handleBlur(`cap-${i}`, cap)}
                                            id={`cap-${i}`}
                                            disabled={captionMode !== 'manual'}
                                        />
                                        <SavedIndicator show={savedFields[`cap-${i}`]} />
                                    </div>
                                ))}
                            </div>

                            <div className="actions-row" style={{ marginTop: 24 }}>
                                <button className="btn-secondary" onClick={() => go(-1)}><FaArrowLeft /> Back</button>
                                <button
                                    className="btn-primary"
                                    onClick={startProcessing}
                                    disabled={!valid1}
                                    id="process-btn"
                                >
                                    Start Processing <FaArrowRight />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 2: Processing ── */}
                    {step === 2 && (
                        <motion.div key="s2" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
                            <LoadingAnimation
                                progress={jobStatus.progress}
                                message={jobStatus.message || 'Starting pipeline...'}
                                isError={jobStatus.status === 'error'}
                            />
                            {jobStatus.status === 'error' && (
                                <div style={{ marginTop: 16, textAlign: 'center' }}>
                                    <div style={{
                                        background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.3)',
                                        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                                        fontSize: 13, color: '#EA4335', textAlign: 'left', lineHeight: 1.6,
                                        maxHeight: 120, overflow: 'auto',
                                    }}>
                                        {jobStatus.message}
                                    </div>
                                    <button className="btn-secondary" onClick={() => { setStep(1); setDirection(-1); setJobId(null); }}>
                                        <FaArrowLeft /> Go Back & Retry
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Step 3: Preview ── */}
                    {step === 3 && (
                        <motion.div key="s3" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
                                🎬 Your video is ready! Watch it below, download it if you like, then click <strong>Next</strong> to set up the YouTube upload.
                            </p>
                            <video
                                key={jobId}
                                src={`/api/video/download/${jobId}`}
                                controls
                                style={{ width: '100%', borderRadius: 12, background: '#000', marginBottom: 14, maxHeight: 380 }}
                            />
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                                <a
                                    href={`/api/video/download/${jobId}`}
                                    download={`${videoTitle.trim().replace(/[^a-z0-9]/gi, '_') || 'ranking_video'}.mp4`}
                                    className="btn-secondary"
                                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}
                                >
                                    ⬇️ Download Video
                                </a>
                                <button
                                    className="btn-secondary"
                                    onClick={handleShare}
                                    disabled={shareStatus === 'uploading'}
                                    type="button"
                                >
                                    🔗 Share via Filebin
                                </button>
                            </div>
                            {shareStatus === 'uploading' && (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13, marginBottom: 12 }}>
                                    Uploading to Filebin...
                                </p>
                            )}
                            {shareStatus === 'error' && (
                                <p style={{ color: '#EA4335', textAlign: 'center', fontSize: 13, marginBottom: 12 }}>
                                    {shareError || 'Filebin upload failed'}
                                </p>
                            )}
                            {shareStatus === 'success' && shareUrl && (
                                <div className="share-link">
                                    <span className="share-label">Filebin URL</span>
                                    <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
                                </div>
                            )}
                            <div className="actions-row">
                                <button className="btn-secondary" onClick={() => go(-1)}><FaArrowLeft /> Back</button>
                                <button className="btn-primary" onClick={() => go(1)}>Next: YT Details <FaArrowRight /></button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 4: YouTube Metadata ── */}
                    {step === 4 && (
                        <motion.div key="s4" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                                ✅ Video processed! Now fill in the YouTube upload details.
                            </p>
                            <div className="metadata-form">
                                <div className="form-group full-width">
                                    <label className="form-label">Video Title <SavedIndicator show={savedFields['yt-title']} /></label>
                                    <input className="form-input" type="text" placeholder="My Ranking Video #Shorts" value={meta.title} onChange={e => updateMeta('title', e.target.value)} onBlur={() => handleBlur('yt-title', meta.title)} maxLength={100} id="yt-title" />
                                    <span className="form-hint">Max 100 chars. Add #Shorts for short-form content.</span>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Description <SavedIndicator show={savedFields['yt-desc']} /></label>
                                    <textarea className="form-input" placeholder="Describe your video... use keywords for SEO" value={meta.description} onChange={e => updateMeta('description', e.target.value)} onBlur={() => handleBlur('yt-desc', meta.description)} maxLength={5000} rows={3} id="yt-desc" />
                                    <span className="form-hint">Max 5,000 characters.</span>
                                </div>
                                <div className="form-group full-width">
                                    <label className="form-label">Tags <SavedIndicator show={savedFields['yt-tags']} /></label>
                                    <input className="form-input" type="text" placeholder="viral, cats, ranking, shorts" value={meta.tags} onChange={e => updateMeta('tags', e.target.value)} onBlur={() => handleBlur('yt-tags', meta.tags)} id="yt-tags" />
                                    <span className="form-hint">Comma-separated. e.g., "comedy, viral, tutorial"</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Privacy</label>
                                    <select className="form-select" value={meta.privacyStatus} onChange={e => updateMeta('privacyStatus', e.target.value)} id="yt-privacy">
                                        <option value="public">Public</option>
                                        <option value="private">Private</option>
                                        <option value="unlisted">Unlisted</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" value={meta.categoryId} onChange={e => updateMeta('categoryId', e.target.value)} id="yt-category">
                                        <option value="15">Pets &amp; Animals</option>
                                        <option value="23">Comedy</option>
                                        <option value="24">Entertainment</option>
                                        <option value="22">People &amp; Blogs</option>
                                        <option value="20">Gaming</option>
                                        <option value="17">Sports</option>
                                        <option value="10">Music</option>
                                        <option value="27">Education</option>
                                        <option value="28">Science &amp; Technology</option>
                                        <option value="1">Film &amp; Animation</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Made for Kids</label>
                                    <select className="form-select" value={String(meta.madeForKids)} onChange={e => updateMeta('madeForKids', e.target.value === 'true')} id="yt-kids">
                                        <option value="false">No</option>
                                        <option value="true">Yes</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Language</label>
                                    <select className="form-select" value={meta.language} onChange={e => updateMeta('language', e.target.value)} id="yt-lang">
                                        <option value="en">English</option>
                                        <option value="hi">Hindi</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="ta">Tamil</option>
                                        <option value="te">Telugu</option>
                                        <option value="ko">Korean</option>
                                        <option value="ja">Japanese</option>
                                        <option value="pt">Portuguese</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Audio Language</label>
                                    <select className="form-select" value={meta.defaultAudioLanguage} onChange={e => updateMeta('defaultAudioLanguage', e.target.value)} id="yt-audiolang">
                                        <option value="en">English</option>
                                        <option value="hi">Hindi</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="ta">Tamil</option>
                                        <option value="te">Telugu</option>
                                        <option value="ko">Korean</option>
                                        <option value="ja">Japanese</option>
                                        <option value="pt">Portuguese</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Recording Date</label>
                                    <input className="form-input" type="date" value={meta.recordingDate} onChange={e => updateMeta('recordingDate', e.target.value)} id="yt-date" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">License</label>
                                    <select className="form-select" value={meta.license} onChange={e => updateMeta('license', e.target.value)} id="yt-license">
                                        <option value="youtube">Standard YouTube</option>
                                        <option value="creativeCommon">Creative Commons</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Embeddable</label>
                                    <select className="form-select" value={String(meta.embeddable)} onChange={e => updateMeta('embeddable', e.target.value === 'true')} id="yt-embed">
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Public Stats</label>
                                    <select className="form-select" value={String(meta.publicStatsViewable)} onChange={e => updateMeta('publicStatsViewable', e.target.value === 'true')} id="yt-stats">
                                        <option value="true">Visible</option>
                                        <option value="false">Hidden</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notify Subscribers</label>
                                    <select className="form-select" value={String(meta.notifySubscribers)} onChange={e => updateMeta('notifySubscribers', e.target.value === 'true')} id="yt-notify">
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                            </div>
                            <div className="actions-row" style={{ marginTop: 24 }}>
                                <button className="btn-secondary" onClick={() => go(-1)}><FaArrowLeft /> Back</button>
                                <button className="btn-primary" onClick={() => go(1)} id="to-upload-btn">
                                    Continue to Upload <FaArrowRight />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 5: Upload ── */}
                    {step === 5 && (
                        <motion.div key="s5" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">

                            {uploadStatus === 'success' ? (
                                <div className="success-container">
                                    <motion.div
                                        className="success-icon"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                    >🎉</motion.div>
                                    <h3 className="success-title">Upload Successful!</h3>
                                    <p className="success-subtitle">Your video is now on YouTube.</p>
                                    {youtubeVideoId && (
                                        <a
                                            href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary"
                                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
                                        >
                                            <FaExternalLinkAlt /> Watch on YouTube
                                        </a>
                                    )}
                                    <br />
                                    <button className="btn-secondary" onClick={handleClose} style={{ marginTop: 8 }}>Done</button>
                                </div>
                            ) : uploadStatus === 'uploading' ? (
                                <LoadingAnimation progress={50} message="📤 Uploading to YouTube..." subMessage="This can take a few minutes." />
                            ) : (
                                <>
                                    <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
                                        {isAuthenticated ? (
                                            <>
                                                <FaCheckCircle style={{ color: '#34A853', fontSize: 52, marginBottom: 12 }} />
                                                <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Google Account Connected!</p>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                                                    Click Upload to publish your video now.
                                                </p>
                                                <button className="btn-primary" onClick={handleUpload} id="upload-btn">
                                                    <FaUpload /> Upload to YouTube
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                                                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 15 }}>
                                                    Please sign in from the top navigation bar to upload.
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {uploadStatus === 'error' && (
                                        <div style={{
                                            background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.3)',
                                            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                                            fontSize: 13, color: '#EA4335', lineHeight: 1.6,
                                        }}>
                                            <FaExclamationCircle style={{ marginRight: 8 }} />
                                            {uploadError || 'Upload failed. Please try again.'}
                                        </div>
                                    )}

                                    <div className="actions-row">
                                        <button className="btn-secondary" onClick={() => go(-1)} disabled={!!uploadStatus}>
                                            <FaArrowLeft /> Back
                                        </button>
                                        {uploadStatus === 'error' && (
                                            <button className="btn-secondary" onClick={() => { setUploadStatus(null); setUploadError('') }}>
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}
