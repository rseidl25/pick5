// js/auth.js

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config (from console)
const firebaseConfig = {
  apiKey: "AIzaSyDx00AGnpN53UYrS9ipF6fT7g5EnfhoJm8",
  authDomain: "nflpick5.firebaseapp.com",
  projectId: "nflpick5",
  storageBucket: "nflpick5.firebasestorage.app",
  messagingSenderId: "541402485416",
  appId: "1:541402485416:web:77cee7a9766fbd7db5a89d",
  measurementId: "G-YY2240591L"
};

// Initialize Firebase
import { app } from "./firebase_init.js";
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadProgress(user.uid);   // your existing function
    renderWeek(currentWeek);        // re-render UI with loaded data
  } else {
    await loadProgress(null);       // guest mode
    renderWeek(currentWeek);
  }
});

// =======================
// Signup Logic
// =======================
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || null,
        createdAt: serverTimestamp()
      }, { merge: true });

      console.log("✅ User signed up & Firestore doc created:", user.uid);
      alert("Account created successfully!");
      window.location.href = "picks.html";
    } catch (error) {
      console.error("Signup error:", error.message);
      alert(error.message);
    }
  });
}

// =======================
// Login Logic
// =======================
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in:", userCredential.user);
      alert("Login successful!");
      window.location.href = "picks.html";
    } catch (error) {
      console.error("Login error:", error.message);
      alert("Error: " + error.message);
    }
  });
}

// =======================
// Logout
// =======================
export async function logoutUser() {
  try {
    await signOut(auth);
    alert("You’ve been logged out.");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message);
  }
}
