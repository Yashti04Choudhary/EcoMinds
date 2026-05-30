// public/js/profile.js
// This file will be used for profile page specific logic,
// such as updating user details, viewing rewards, etc.

document.addEventListener('DOMContentLoaded', () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    // Show loading state
    function showLoading() {
        document.getElementById('user-email-display').textContent = 'Loading...';
        document.getElementById('user-role-display').textContent = 'Loading...';
        document.getElementById('user-points-display').textContent = '...';
    }
    
    function loadUserProfile(user) {
        const db = firebase.firestore();
        const userDocRef = db.collection('users').doc(user.uid);

        userDocRef.get().then(doc => {
            if (doc.exists) {
                retryCount = 0; // Reset retry count on success!
                const userData = doc.data();
                // Populate the profile card with user data
                document.getElementById('user-email-display').textContent = userData.email;
                document.getElementById('user-role-display').textContent = userData.role;
                document.getElementById('user-points-display').textContent = userData.points || 0;

                // Badges
                const badgesGrid = document.getElementById('badges-grid');
                badgesGrid.innerHTML = '';
                // Example badge icon mapping
                const badgeIcons = {
                    "First Recycle": "fa-recycle",
                    "Eco-Warrior": "fa-award",
                    "Point Collector": "fa-star",
                    "Green Thumb": "fa-seedling"
                };
                if (userData.badges && userData.badges.length > 0) {
                    userData.badges.forEach(badge => {
                        const badgeDiv = document.createElement('div');
                        badgeDiv.className = 'badge earned';
                        badgeDiv.innerHTML = `
                            <i class="fas ${badgeIcons[badge] || 'fa-certificate'}"></i>
                            <span>${badge}</span>
                        `;
                        badgesGrid.appendChild(badgeDiv);
                    });
                } else {
                    badgesGrid.innerHTML = '<p>No badges earned yet.</p>';
                }
                return; // Return early so no error logic runs
            } else {
                // doc.data() will be undefined in this case
                console.error("No such user document!");
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retrying to fetch user details... Attempt ${retryCount}`);
                    setTimeout(() => loadUserProfile(user), 1000); // Retry after 1 second
                } else {
                    alert("Could not find your user details. Please try logging in again.");
                    window.location.href = 'auth.html';
                }
            }
        }).catch(error => {
            console.error("Error getting user document:", error);
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying to fetch user details... Attempt ${retryCount}`);
                setTimeout(() => loadUserProfile(user), 1000); // Retry after 1 second
            } else {
                alert("An error occurred while fetching your details. Please try refreshing the page.");
            }
        });
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            console.log("User authenticated, loading profile...");
            showLoading();
            loadUserProfile(user);
        } else {
            // No user is signed in. 
            // Redirect them to the login page ONLY if they didn't just click the logout button.
            if (!window.isLoggingOut) {
                alert("You must be logged in to view this page.");
                window.location.href = 'auth.html';
            }
        }
    });

    // === Editable Display Name Logic ===
    const userNameDisplay = document.getElementById('user-name-display');
    const editNameBtn = document.getElementById('edit-name-btn');
    const editNameForm = document.getElementById('edit-name-form');
    const userNameInput = document.getElementById('user-name-input');
    const saveNameBtn = document.getElementById('save-name-btn');
    const cancelNameBtn = document.getElementById('cancel-name-btn');
    const userEmailDisplay = document.getElementById('user-email-display');

    let currentName = '';
    let userDocRef = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            userDocRef = firebase.firestore().collection('users').doc(user.uid);
            const doc = await userDocRef.get();
            let displayName = doc.exists && doc.data().displayName ? doc.data().displayName : user.email;
            currentName = displayName;
            userNameDisplay.textContent = displayName;
            userNameInput.value = displayName;
            userEmailDisplay.textContent = user.email;
            // ... load other profile info ...
        }
    });

    editNameBtn.addEventListener('click', () => {
        userNameDisplay.style.display = 'none';
        editNameBtn.style.display = 'none';
        editNameForm.style.display = 'flex';
        userNameInput.value = currentName;
        userNameInput.focus();
    });

    saveNameBtn.addEventListener('click', async () => {
        const newName = userNameInput.value.trim();
        if (newName && userDocRef) {
            await userDocRef.set({ displayName: newName }, { merge: true });
            currentName = newName;
            userNameDisplay.textContent = newName;
        }
        userNameDisplay.style.display = '';
        editNameBtn.style.display = '';
        editNameForm.style.display = 'none';
    });

    cancelNameBtn.addEventListener('click', () => {
        userNameInput.value = currentName;
        userNameDisplay.style.display = '';
        editNameBtn.style.display = '';
        editNameForm.style.display = 'none';
    });
}); 