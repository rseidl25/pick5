// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);