import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

const AuthContext = createContext(null)

const AUTH_TOKENS_KEY = 'authTokens'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [tokens, setTokens] = useState(() => {
        try {
            const raw = localStorage.getItem(AUTH_TOKENS_KEY)
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    })
    const [loading, setLoading] = useState(true)

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    name: firebaseUser.displayName,
                    email: firebaseUser.email,
                    picture: firebaseUser.photoURL,
                })
            } else {
                setUser(null)
                setTokens(null)
                localStorage.removeItem(AUTH_TOKENS_KEY)
            }
            setLoading(false)
        })
        return unsub
    }, [])

    const login = useCallback(async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider)
            // Extract the Google OAuth access token from the popup result
            const credential = GoogleAuthProvider.credentialFromResult(result)
            const accessToken = credential?.accessToken
            if (accessToken) {
                const newTokens = { access_token: accessToken }
                setTokens(newTokens)
                localStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(newTokens))
            }
        } catch (err) {
            console.error('Firebase sign-in error:', err)
        }
    }, [])

    const logout = useCallback(async () => {
        await signOut(auth)
        setUser(null)
        setTokens(null)
        localStorage.removeItem(AUTH_TOKENS_KEY)
    }, [])

    return (
        <AuthContext.Provider value={{
            user,
            tokens,
            isAuthenticated: !!user && !!tokens,
            loading,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
