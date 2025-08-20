import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js'

const firebaseConfig = {
    apiKey: "AIzaSyCEbIqqm4R3SvVwC0_IWJ-JN1aZDsHyfwk",
    authDomain: "lambo-fd927.firebaseapp.com",
    projectId: "lambo-fd927",
    storageBucket: "lambo-fd927.firebasestorage.app",
    messagingSenderId: "1075784720205",
    appId: "1:1075784720205:web:fbe7605d6713615ee9e104",
    measurementId: "G-XFNGRDBXVF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);