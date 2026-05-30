// js/firebase-config.js
var firebaseConfig = {
  apiKey: "AIzaSyBzedcAA5tkc3Rwkcn3jXHCxg3JaYqzoOY",
  authDomain: "ai-ewaste-2025.firebaseapp.com",
  databaseURL: "https://ai-ewaste-2025-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ai-ewaste-2025",
  storageBucket: "ai-ewaste-2025.appspot.com",
  messagingSenderId: "795795729831",
  appId: "1:795795729831:web:51355a162bc43d6fb91a82"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore
var db = firebase.firestore();
