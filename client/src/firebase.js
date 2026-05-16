import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
    apiKey: "AIzaSyCLozCEbETcLOorY3I8YZawD5vNs4gZEaU",
    authDomain: "yt-automate-1aa6e.firebaseapp.com",
    projectId: "yt-automate-1aa6e",
    storageBucket: "yt-automate-1aa6e.firebasestorage.app",
    messagingSenderId: "1006228573032",
    appId: "1:1006228573032:web:ca96935df8389ab5a9e4dd",
    measurementId: "G-6J3K2QRVKR",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Request YouTube + profile scopes so the access token works for YouTube API
googleProvider.addScope('https://www.googleapis.com/auth/youtube.upload')
googleProvider.addScope('https://www.googleapis.com/auth/youtube')
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile')
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email')
