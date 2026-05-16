export default function LoadingAnimation({ progress = 0, message = 'Processing...', subMessage = '', isError = false }) {
    const pct = Math.min(100, Math.max(0, progress))

    return (
        <div className="loading-container">
            {/* Animated orbs */}
            <div className="loading-orbs">
                <div className="lorb lorb-1" />
                <div className="lorb lorb-2" />
                <div className="lorb lorb-3" />
            </div>

            {/* Message */}
            <p className="loading-message">{message}</p>
            {subMessage && <p className="loading-sub">{subMessage}</p>}

            {/* Progress bar */}
            <div className="progress-bar-wrap">
                <div
                    className={`progress-bar-fill ${isError ? 'error-bar' : ''}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Percentage */}
            <p className="progress-pct">{pct}% complete</p>
        </div>
    )
}
