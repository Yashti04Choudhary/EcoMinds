// Recycler Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication and role
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // Check if user is a recycler
      const db = firebase.firestore();
      db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && doc.data().role === 'recycler') {
          // User is authenticated as recycler, load dashboard
          loadDashboard();
          loadUnassignedPickups();
          setupNavigation();
        } else {
          // User is not a recycler
          alert("Access Denied: You are not registered as a Recycler.");
          window.location.href = 'index.html';
        }
      });
    } else {
      // User is not logged in
      window.location.href = 'auth.html?role=recycler';
    }
  });
});

// Navigation setup
function setupNavigation() {
  const statisticsLink = document.getElementById('statistics-link');
  const dashboardSection = document.getElementById('dashboard-section');
  const statisticsSection = document.getElementById('statistics-section');
  const unassignedSection = document.getElementById('unassigned-pickups-section');
  
  // Statistics link click handler
  statisticsLink.addEventListener('click', function(e) {
    e.preventDefault();
    dashboardSection.style.display = 'none';
    statisticsSection.style.display = 'block';
    if (unassignedSection) unassignedSection.style.display = 'none';
    statisticsLink.classList.add('active');
    document.querySelector('a[href="recycler.html"]').classList.remove('active');
    loadStatistics('week'); // Default to week view
  });
  
  // Dashboard link click handler
  document.querySelector('a[href="recycler.html"]').addEventListener('click', function(e) {
    e.preventDefault();
    dashboardSection.style.display = 'block';
    statisticsSection.style.display = 'none';
    if (unassignedSection) unassignedSection.style.display = 'block';
    this.classList.add('active');
    statisticsLink.classList.remove('active');
  });
  
  // Statistics filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadStatistics(this.dataset.period);
    });
  });
}

// Load dashboard data
function loadDashboard() {
  const db = firebase.firestore();
  const tbody = document.getElementById('pickups-tbody');
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('You must be logged in as a recycler to view your dashboard.');
    return;
  }
  // Listen for real-time updates to pickups assigned to this recycler
  db.collection('pickups')
    .where('recyclerId', '==', user.uid)
    .where('status', 'in', ['Scheduled', 'in-progress', 'completed'])
    .orderBy('pickupDate', 'desc')
    .onSnapshot(snapshot => {
      tbody.innerHTML = '';
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No pickups found</td></tr>';
        return;
      }
      snapshot.forEach(doc => {
        const pickup = doc.data();
        const row = createPickupRow(doc.id, pickup);
        tbody.appendChild(row);
      });
    });
}

// Create pickup table row
function createPickupRow(pickupId, pickup) {
  const row = document.createElement('tr');
  
  const statusClass = pickup.status === 'completed' ? 'status-completed' : 
                     pickup.status === 'in-progress' ? 'status-progress' : 'status-pending';
  
  row.innerHTML = `
    <td>${pickup.userEmail || 'N/A'}</td>
    <td>${pickup.address || 'N/A'}</td>
    <td>${formatDate(pickup.pickupDate)}</td>
    <td>${pickup.items ? pickup.items.length : 0} items</td>
    <td><span class="status-badge ${statusClass}">${pickup.status}</span></td>
    <td>
      ${pickup.status === 'Scheduled' ? 
        `<button class="btn-action" onclick="startPickup('${pickupId}')">Start</button>` :
        pickup.status === 'in-progress' ? 
        `<button class="btn-action" onclick="completePickup('${pickupId}')">Complete</button>` :
        '<span class="completed-text">Completed</span>'
      }
    </td>
  `;
  
  return row;
}

// Load statistics
function loadStatistics(period) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    showStatisticsError();
    alert('You must be logged in as a recycler to view your statistics.');
    return;
  }
  // Calculate date range
  const now = new Date();
  let startDate;
  switch(period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case 'year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  // Fetch completed pickups in the date range assigned to this recycler
  db.collection('pickups')
    .where('recyclerId', '==', user.uid)
    .where('status', '==', 'completed')
    .where('completedDate', '>=', startDate)
    .get()
    .then(snapshot => {
      calculateStatistics(snapshot.docs);
    })
    .catch(error => {
      console.error('Error loading statistics:', error);
      showStatisticsError();
    });
}

// Calculate and display statistics
function calculateStatistics(pickups) {
  let totalItems = 0;
  let totalWeight = 0;
  let uniqueUsers = new Set();
  let itemBreakdown = {};
  
  pickups.forEach(doc => {
    const pickup = doc.data();
    
    // Count items
    if (pickup.items && Array.isArray(pickup.items)) {
      pickup.items.forEach(item => {
        totalItems++;
        totalWeight += item.weight || 0;
        
        // Count by item type
        const itemType = item.type || 'Unknown';
        itemBreakdown[itemType] = (itemBreakdown[itemType] || 0) + 1;
      });
    }
    
    // Count unique users
    if (pickup.userEmail) {
      uniqueUsers.add(pickup.userEmail);
    }
  });
  
  // Calculate CO2 saved (rough estimate: 1kg e-waste = 2kg CO2 saved)
  const co2Saved = totalWeight * 2;
  
  // Update statistics display
  document.getElementById('total-items').textContent = totalItems.toLocaleString();
  document.getElementById('total-weight').textContent = `${totalWeight.toFixed(1)} kg`;
  document.getElementById('total-users').textContent = uniqueUsers.size.toLocaleString();
  document.getElementById('co2-saved').textContent = `${co2Saved.toFixed(1)} kg`;
  
  // Update item breakdown
  displayItemBreakdown(itemBreakdown);
}

// Display item breakdown
function displayItemBreakdown(breakdown) {
  const container = document.getElementById('item-breakdown');
  
  if (Object.keys(breakdown).length === 0) {
    container.innerHTML = '<div class="no-data">No items found in this period</div>';
    return;
  }
  
  const sortedItems = Object.entries(breakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10); // Show top 10 items
  
  let html = '<div class="breakdown-list">';
  sortedItems.forEach(([itemType, count]) => {
    const percentage = ((count / Object.values(breakdown).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
    html += `
      <div class="breakdown-item">
        <div class="item-info">
          <span class="item-name">${itemType}</span>
          <span class="item-count">${count} items</span>
        </div>
        <div class="item-bar">
          <div class="item-progress" style="width: ${percentage}%"></div>
        </div>
        <span class="item-percentage">${percentage}%</span>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

// Show statistics error
function showStatisticsError() {
  document.getElementById('total-items').textContent = 'Error';
  document.getElementById('total-weight').textContent = 'Error';
  document.getElementById('total-users').textContent = 'Error';
  document.getElementById('co2-saved').textContent = 'Error';
  document.getElementById('item-breakdown').innerHTML = '<div class="error">Failed to load statistics</div>';
}

// Pickup action functions
function startPickup(pickupId) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('You must be logged in as a recycler to start a pickup.');
    return;
  }
  db.collection('pickups').doc(pickupId).update({
    status: 'in-progress',
    startedDate: firebase.firestore.FieldValue.serverTimestamp(),
    recyclerId: user.uid,
    recyclerEmail: user.email
  }).then(() => {
    console.log('Pickup started and assigned to recycler');
  }).catch(error => {
    console.error('Error starting pickup:', error);
    alert('Failed to start pickup');
  });
}

function completePickup(pickupId) {
  const db = firebase.firestore();
  // First, fetch the pickup document to get userId and items
  db.collection('pickups').doc(pickupId).get().then(doc => {
    if (!doc.exists) {
      alert('Pickup not found!');
      return;
    }
    const pickup = doc.data();
    const userId = pickup.userId;
    const items = pickup.items || [];

    // Points scheme (should match schedule.js)
    const ITEM_POINTS = {
      phones: 10,
      laptops: 20,
      batteries: 5,
      chargers: 3,
      wires: 2,
      'circuit boards': 8,
      mouse: 4,
      keyboard: 4
    };
    // Calculate total points for this pickup
    let totalPoints = 0;
    items.forEach(item => {
      const pointsPerItem = ITEM_POINTS[item.name] || 1;
      totalPoints += pointsPerItem * (item.quantity || 1);
    });

    // Update the pickup status to completed
    db.collection('pickups').doc(pickupId).update({
      status: 'completed',
      completedDate: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      // Now update the user's points
      const userRef = db.collection('users').doc(userId);
      userRef.get().then(userDoc => {
        if (userDoc.exists) {
          const currentPoints = userDoc.data().points || 0;
          userRef.update({ points: currentPoints + totalPoints })
            .then(() => {
              console.log('Pickup completed and user points updated!');
              alert('Pickup completed and user awarded points!');
            })
            .catch(error => {
              console.error('Error updating user points:', error);
              alert('Pickup completed, but failed to update user points.');
            });
        } else {
          alert('Pickup completed, but user not found!');
        }
      });
    }).catch(error => {
      console.error('Error completing pickup:', error);
      alert('Failed to complete pickup');
    });
  });
}

// Fetch and display unassigned scheduled pickups
function loadUnassignedPickups() {
  const db = firebase.firestore();
  const tbody = document.getElementById('unassigned-pickups-tbody');
  // Listen for real-time updates to unassigned scheduled pickups
  db.collection('pickups')
    .where('status', '==', 'Scheduled')
    .where('recyclerId', '==', 'unassigned')
    .orderBy('pickupDate', 'desc')
    .onSnapshot(snapshot => {
      tbody.innerHTML = '';
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No unassigned pickups found</td></tr>';
        return;
      }
      snapshot.forEach(doc => {
        const pickup = doc.data();
        const row = createUnassignedPickupRow(doc.id, pickup);
        tbody.appendChild(row);
      });
    });
}

// Create row for unassigned scheduled pickup
function createUnassignedPickupRow(pickupId, pickup) {
  const row = document.createElement('tr');
  // Use JSON.stringify to pass items array safely
  const itemsData = pickup.items ? encodeURIComponent(JSON.stringify(pickup.items)) : '';
  row.innerHTML = `
    <td>${pickup.userEmail || 'N/A'}</td>
    <td>${pickup.address || 'N/A'}</td>
    <td>${formatDate(pickup.pickupDate)}</td>
    <td><a href="#" onclick="showPickupItems(JSON.parse(decodeURIComponent('${itemsData}')), event); return false;">${pickup.items ? pickup.items.length : 0} items</a></td>
    <td><span class="status-badge status-pending">${pickup.status}</span></td>
    <td><button class="btn-action" onclick="startPickup('${pickupId}')">Start</button></td>
  `;
  return row;
}

// Add this at the top-level (after all functions or at the end of the file)
if (!document.getElementById('pickup-items-card')) {
  const card = document.createElement('div');
  card.id = 'pickup-items-card';
  card.style.display = 'none';
  card.style.position = 'absolute';
  card.style.zIndex = '9999';
  card.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #e2f6ca 100%)';
  card.style.border = '2px solid #78C1F3';
  card.style.borderRadius = '18px';
  card.style.boxShadow = '0 8px 32px rgba(120,193,243,0.18), 0 2px 8px rgba(60,60,60,0.08)';
  card.style.padding = '1.5rem 1.5rem 1.2rem 1.5rem';
  card.style.minWidth = '250px';
  card.style.maxWidth = '340px';
  card.style.transition = 'opacity 0.25s cubic-bezier(.4,2,.6,1), top 0.2s';
  card.style.opacity = '0';
  card.style.pointerEvents = 'auto';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
      <span style="font-size:1.5rem;color:#78C1F3;"><i class='fas fa-box-open'></i></span>
      <span style="font-weight:700;font-size:1.1rem;color:#2c3e50;letter-spacing:0.5px;">Pickup Items</span>
      <button id="close-items-card" style="margin-left:auto;background:#fff;border:none;font-size:1.3rem;line-height:1;width:2rem;height:2rem;border-radius:50%;box-shadow:0 2px 8px rgba(120,193,243,0.10);color:#78C1F3;cursor:pointer;transition:background 0.2s;">&times;</button>
    </div>
    <div id="pickup-items-card-content"></div>
  `;
  document.body.appendChild(card);
  document.getElementById('close-items-card').onclick = function() {
    card.style.opacity = '0';
    setTimeout(() => { card.style.display = 'none'; }, 250);
  };
  // Hide card when clicking outside
  document.addEventListener('mousedown', function(e) {
    if (card.style.display === 'none') return;
    if (!card.contains(e.target)) {
      card.style.opacity = '0';
      setTimeout(() => { card.style.display = 'none'; }, 250);
    }
  });
}

window.showPickupItems = function(items, event) {
  const card = document.getElementById('pickup-items-card');
  const content = document.getElementById('pickup-items-card-content');
  if (!items || items.length === 0) {
    content.innerHTML = '<em style="color:#adb5bd;">No items listed</em>';
  } else {
    let html = '<table style="width:100%;border-collapse:collapse;font-size:0.97rem;background:transparent;">';
    html += '<tr style="background:transparent;"><th style="text-align:left;color:#78C1F3;font-weight:600;">Item</th><th style="color:#78C1F3;font-weight:600;">Qty</th><th style="color:#78C1F3;font-weight:600;">Avg. Wt (kg)</th></tr>';
    items.forEach(item => {
      html += `<tr style="background:transparent;"><td>${item.name || item.type || 'Unknown'}</td><td style="text-align:center;">${item.quantity || 1}</td><td style="text-align:center;">${item.weight ? (item.weight / (item.quantity || 1)).toFixed(2) : '-'}</td></tr>`;
    });
    html += '</table>';
    content.innerHTML = html;
  }
  // Position card near the clicked element
  const rect = event.target.getBoundingClientRect();
  card.style.top = (window.scrollY + rect.bottom + 8) + 'px';
  card.style.left = (window.scrollX + rect.left) + 'px';
  card.style.display = 'block';
  setTimeout(() => { card.style.opacity = '1'; }, 10);
};

// Utility function to format dates
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 