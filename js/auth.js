// js/auth.js

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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

    // ✅ Check password match
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ User signed up:", userCredential.user);
      alert("Account created successfully!");
      window.location.href = "picks.html"; // redirect after signup
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
      window.location.href = "picks.html"; // redirect after login
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
