// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const body = document.body;

  // Only run sidebar logic if all elements are present on the page
  if (sidebar && sidebarOpen && sidebarClose && body) {
    // Function to open the sidebar
    const openSidebar = () => {
      body.classList.add('sidebar-is-open');
    };

    // Function to close the sidebar
    const closeSidebar = () => {
      body.classList.remove('sidebar-is-open');
    };

    // Event listeners
    sidebarOpen.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
  }
  
  // "Enter as User" button logic
  const enterAsUserBtn = document.getElementById('enter-as-user-btn');
  if (enterAsUserBtn) {
    enterAsUserBtn.addEventListener('click', function() {
      const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        unsubscribe(); // Perform check only once
        if (user) {
          // User is logged in, check their role
          const db = firebase.firestore();
          db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().role === 'user') {
              // Role is correct, proceed
              window.location.href = 'profile.html';
            } else {
              // Role is incorrect or doc doesn't exist
              alert("Access Denied: You are not registered as a User.");
            }
          });
        } else {
          // User is not logged in
          if (confirm("You need an account to proceed. Click OK to go to the Login/Signup page.")) {
            window.location.href = 'auth.html?role=user';
          }
        }
      });
    });
  }

  // "Enter as Recycler" button logic
  const enterAsRecyclerBtn = document.getElementById('enter-as-recycler-btn');
  if (enterAsRecyclerBtn) {
    enterAsRecyclerBtn.addEventListener('click', function() {
      const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        unsubscribe(); // Perform check only once
        if (user) {
          // User is logged in, check their role
          const db = firebase.firestore();
          db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().role === 'recycler') {
              // Role is correct, proceed to the new recycler dashboard
              window.location.href = 'recycler.html';
            } else {
              // Role is incorrect or doc doesn't exist
              alert("Access Denied: You are not registered as a Recycler.");
            }
          });
        } else {
          // User is not logged in
          if (confirm("You need an account to proceed. Click OK to go to the Login/Signup page.")) {
            window.location.href = 'auth.html?role=recycler';
          }
        }
      });
    });
  }
});
