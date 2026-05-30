// js/auth.js

// This listener handles showing and hiding the logout button on ANY page.
firebase.auth().onAuthStateChanged((user) => {
  const logoutMenu = document.getElementById("logout-menu");
  if (logoutMenu) {
    logoutMenu.style.display = user ? "block" : "none";
  }
});

// This listener handles events on specific pages.
window.addEventListener("DOMContentLoaded", () => {
  // Get role from URL to determine user type on signup
  const urlParams = new URLSearchParams(window.location.search);
  const roleFromUrl = urlParams.get('role'); // Can be 'user', 'recycler', or null

  // --- Tab switching for Login/Signup Form ---
  const authTabs = document.querySelector('.auth-tabs');
  if (authTabs) {
    const tabLinks = document.querySelectorAll('.auth-tab-link');
    const tabContents = document.querySelectorAll('.auth-tab-content');

    authTabs.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        const tab = e.target.dataset.tab;

        tabLinks.forEach(link => {
          link.classList.remove('active');
          if (link.dataset.tab === tab) {
            link.classList.add('active');
          }
        });

        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === tab) {
            content.classList.add('active');
          }
        });
      }
    });
  }

  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const enterAsUserBtn = document.getElementById('enter-as-user-btn');

  // SIGNUP form (on auth.html)
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = signupForm["signup-name"].value;
      const email = signupForm["signup-email"].value;
      const password = signupForm["signup-password"].value;
      
      // Determine role from URL, default to 'user'
      const userRole = roleFromUrl || 'user';

      try {
        if (userRole === 'recycler') {
          await registerRecycler(email, password, name);
        } else {
          await registerUser(email, password, name);
        }
        signupForm.reset();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Registers a standard user
  async function registerUser(email, password, name) {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const db = firebase.firestore();
    await db.collection('users').doc(cred.user.uid).set({
      name: name,
      email: email,
      role: 'user',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      points: 0,
      badges: []
    });
    alert("Signup successful! You are registered as a User.");
    // Add a small delay to ensure auth state is fully established
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 500); // 500ms delay
  }

  // Registers a recycler after verification
  async function registerRecycler(email, password, name) {
    const db = firebase.firestore();
    // 1. Match email with dummy data
    const q = db.collection("recycler_centers")
      .where("email", "==", email)
      .where("isRegistered", "==", false);

    const snapshot = await q.get();

    if (snapshot.empty) {
      throw new Error("You are not an authorized recycler or this email is already registered. Please contact support.");
    }

    const centerDoc = snapshot.docs[0];
    const centerId = centerDoc.id;

    // User is authorized, now create them in Firebase Auth
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);

    // 2. Mark dummy center as 'registered'
    await db.collection("recycler_centers").doc(centerId).update({
      isRegistered: true
    });

    // 3. Save user data with recycler role
    await db.collection("users").doc(cred.user.uid).set({
      name: name,
      email: email,
      role: "recycler",
      linkedCenter: centerId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Successfully registered as a recycler!");
    // Add a small delay to ensure auth state is fully established
    setTimeout(() => {
      window.location.href = "recycler.html";
    }, 500); // 500ms delay
  }

  // LOGIN form (on auth.html)
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = loginForm["login-email"].value;
      const password = loginForm["login-password"].value;

      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((cred) => {
          // User is signed in, now check their role to redirect them.
          const db = firebase.firestore();
          return db.collection('users').doc(cred.user.uid).get();
        })
        .then(doc => {
          if (doc.exists) {
            const userRole = doc.data().role;
            alert("Login successful!");
            loginForm.reset();
            // Add a small delay to ensure auth state is fully established
            setTimeout(() => {
              if (userRole === 'recycler') {
                window.location.href = "recycler.html";
              } else {
                window.location.href = "profile.html";
              }
            }, 500); // 500ms delay
          } else {
            // User exists in Auth but not in Firestore
            firebase.auth().signOut().then(() => {
              alert("No user found with these credentials. Please sign up.");
              window.location.href = "auth.html";
            });
          }
        })
        .catch((err) => alert(err.message));
    });
  }
  
  // LOGOUT button (on any page with the button)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Set a flag to indicate a deliberate logout is in progress.
      window.isLoggingOut = true; 
      firebase.auth().signOut().then(() => {
        alert("Logged out!");
        // After logout, always redirect to the homepage for a consistent experience.
        window.location.href = "index.html";
      });
    });
  }

  // Google Sign-in button
  const googleSignInBtn = document.getElementById('google-signin-btn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
      // Note: Full implementation requires setting up Google as an auth provider in Firebase.
      alert("Google Sign-in functionality to be added!");
      // const provider = new firebase.auth.GoogleAuthProvider();
      // firebase.auth().signInWithPopup(provider)
      //   .then((result) => {
      //     alert("Google Sign-in successful!");
      //     window.location.href = "index.html";
      //   }).catch((error) => {
      //     alert(error.message);
      //   });
    });
  }
});