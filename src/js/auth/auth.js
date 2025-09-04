// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase init
import { app } from "./firebase_init.js";
const auth = getAuth(app);
const db = getFirestore(app);

// =======================
// Auth Listener
// =======================
onAuthStateChanged(auth, async (user) => {
  const userDisplay = document.getElementById("user-display");
  const logoutBtn = document.getElementById("logout-btn");

  if (user) {
    console.log("🔑 Logged in:", user.uid);

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        // ✅ If already submitted → boot them
        if (data.picks_submitted === true) {
          alert("⚠️ Your picks are locked for the season.");
          await signOut(auth);
          window.location.href = "index.html";
          return;
        }
      }

      // ✅ Show displayName/email
      const name = user.displayName || user.email || "User";
      if (userDisplay) userDisplay.textContent = name;
      if (logoutBtn) {
        logoutBtn.style.display = "inline-block";
        logoutBtn.onclick = () => logoutUser();
      }

      if (typeof loadProgress === "function") {
        await loadProgress(user.uid);
        if (typeof renderWeek === "function") renderWeek(currentWeek);
      }
    } catch (err) {
      console.error("❌ Error checking user lock:", err);
    }

  } else {
    console.log("👤 Not logged in");
    if (userDisplay) userDisplay.textContent = "Guest";
    if (logoutBtn) logoutBtn.style.display = "none";

    if (typeof loadProgress === "function") {
      await loadProgress(null);
      if (typeof renderWeek === "function") renderWeek(currentWeek);
    }
  }
});

// =======================
// Signup Logic
// =======================
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = document.getElementById("signup-name").value.trim();
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

      await updateProfile(user, { displayName });

      // ✅ Create user doc with picks_submitted false
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        picks_submitted: false,
        createdAt: serverTimestamp()
      }, { merge: true });

      console.log("✅ User signed up & Firestore doc created:", user.uid);
      alert("Account created successfully!");
      window.location.href = "picks.html";

    } catch (error) {
      console.error("Signup error:", error.message);

      if (error.code === "auth/email-already-in-use") {
        alert("⚠️ This email is already registered. Redirecting to login...");
        window.location.href = "login.html";
      } else {
        alert("Error: " + error.message);
      }
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
      const user = userCredential.user;

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists() && userSnap.data().picks_submitted === true) {
        alert("⚠️ Your picks are locked for the season.");
        await signOut(auth);
        window.location.href = "index.html";
      } else {
        console.log("✅ Logged in:", userCredential.user);
        alert("Login successful!");
        window.location.href = "picks.html";
      }
    } catch (error) {
      console.error("Login error:", error.message);
      alert("Error: " + error.message);
    }
  });
}

// =======================
// Final Submit Confirmation
// =======================
const finalSubmitBtn = document.getElementById("final-submit-btn");
if (finalSubmitBtn) {
  finalSubmitBtn.addEventListener("click", async () => {
    const confirmSubmit = confirm(
      "Are you sure you want to submit?\n\n⚠️ Once you submit, you will NOT be able to change your picks for the entire season."
    );

    if (!confirmSubmit) return;

    try {
      if (typeof savePicks === "function") {
        await savePicks();
      }

      const user = auth.currentUser;
      if (user) {
        // ✅ Lock for season
        await setDoc(doc(db, "users", user.uid), { picks_submitted: true }, { merge: true });

        alert("✅ Your picks have been submitted and locked for the season!");
        await signOut(auth);
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error("❌ Error submitting:", err);
      alert("Error while submitting. Try again.");
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
