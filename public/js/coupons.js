// coupons.js
// Assumes Firebase is already initialized and user is logged in

document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'auth.html?redirect=coupons.html';
      return;
    }
    const userId = user.uid;
    const userRef = firebase.firestore().collection('users').doc(userId);
    const couponGallery = document.getElementById('coupon-gallery');
    const myCouponsDiv = document.getElementById('my-coupons');
    let userPoints = 0;

    // Fetch user points and load coupons
    userRef.get().then(doc => {
      userPoints = doc.data().points || 0;
      loadCoupons();
      loadMyCoupons();
    });

    // Load available coupons
    function loadCoupons() {
      // First, get all claimed coupon IDs for this user
      userRef.collection('claimedCoupons').get().then(claimedSnap => {
        const claimedIds = new Set();
        claimedSnap.forEach(doc => claimedIds.add(doc.id));
        firebase.firestore().collection('coupons').get().then(snapshot => {
          couponGallery.innerHTML = '';
          const today = new Date();
          snapshot.forEach(doc => {
            const coupon = doc.data();
            const couponId = doc.id;
            // Check expiry
            const expiryDate = coupon.expiry ? new Date(coupon.expiry) : null;
            if (expiryDate && expiryDate < today) {
              // Coupon expired, do not show in gallery
              return;
            }
            const canClaim = userPoints >= coupon.pointsRequired && !claimedIds.has(couponId);
            const alreadyClaimed = claimedIds.has(couponId);

            const couponDiv = document.createElement('div');
            couponDiv.className = 'coupon-card';
            couponDiv.innerHTML = `
              <img src="${coupon.imageUrl ? coupon.imageUrl : (coupon.brand === '5% Off' ? 'assets/coupon_5.png' : coupon.brand === '10% Off' ? 'assets/Coupon_10.png' : 'assets/coupon_placeholder.png')}" alt="${coupon.brand}">
              <h3>${coupon.brand}</h3>
              <p><strong>${coupon.discount}</strong> - ${coupon.description}</p>
              <p>Requires: ${coupon.pointsRequired} points</p>
              <button ${canClaim ? '' : 'disabled'} data-coupon-id="${couponId}">
                ${alreadyClaimed ? 'Already Claimed' : (canClaim ? 'Claim' : 'Not enough points')}
              </button>
            `;
            if (canClaim) {
              couponDiv.querySelector('button').addEventListener('click', function() {
                claimCoupon(couponId);
              });
            }
            couponGallery.appendChild(couponDiv);
          });
        });
      });
    }

    // Claim coupon logic
    function claimCoupon(couponId) {
      const couponRef = firebase.firestore().collection('coupons').doc(couponId);
      Promise.all([couponRef.get(), userRef.get()]).then(([couponDoc, userDoc]) => {
        const coupon = couponDoc.data();
        const user = userDoc.data();
        if (user.points < coupon.pointsRequired) {
          alert('Not enough points!');
          return;
        }
        // Deduct points and add claimed coupon
        userRef.update({
          points: firebase.firestore.FieldValue.increment(-coupon.pointsRequired)
        });
        userRef.collection('claimedCoupons').doc(couponId).set({
          claimedAt: firebase.firestore.FieldValue.serverTimestamp(),
          couponRef: couponRef,
          code: coupon.code,
          used: false
        }).then(() => {
          alert('Coupon claimed! Check your My Coupons section.');
          loadCoupons();
          loadMyCoupons();
        });
      });
    }

    // Load user's claimed coupons
    function loadMyCoupons() {
      myCouponsDiv.innerHTML = '';
      const today = new Date();
      userRef.collection('claimedCoupons').get().then(snapshot => {
        if (snapshot.empty) {
          myCouponsDiv.innerHTML = '<p>No coupons claimed yet.</p>';
          return;
        }
        snapshot.forEach(doc => {
          const coupon = doc.data();
          const claimedAt = coupon.claimedAt && coupon.claimedAt.toDate ? coupon.claimedAt.toDate().toLocaleString() : '';
          const couponId = doc.id;
          // Try to get expiry from couponRef (if available)
          if (coupon.couponRef && coupon.couponRef.get) {
            coupon.couponRef.get().then(couponDoc => {
              const couponData = couponDoc.data();
              const expiryDate = couponData && couponData.expiry ? new Date(couponData.expiry) : null;
              const isExpired = expiryDate && expiryDate < today;
              let markUsedBtn = (!isExpired && !coupon.used) ? `<button class='btn-action' data-coupon-id='${couponId}'>Mark as Used</button>` : '';
              const couponCard = document.createElement('div');
              couponCard.className = 'coupon-card';
              couponCard.innerHTML = `
                <img src="${couponData && couponData.imageUrl ? couponData.imageUrl : 'assets/coupon_placeholder.png'}" alt="${couponData && couponData.brand ? couponData.brand : 'Coupon'}">
                <p><strong>Code:</strong> ${coupon.code}</p>
                <p><strong>Claimed:</strong> ${claimedAt}</p>
                <p><strong>Used:</strong> ${coupon.used ? 'Yes' : 'No'}</p>
                ${isExpired ? '<p style=\'color:red;\'><strong>Expired</strong></p>' : ''}
                ${markUsedBtn}
              `;
              if (markUsedBtn) {
                couponCard.querySelector('button').addEventListener('click', function() {
                  markCouponAsUsed(couponId);
                });
              }
              myCouponsDiv.appendChild(couponCard);
            });
          } else {
            // fallback if couponRef is not available
            const couponCard = document.createElement('div');
            couponCard.className = 'coupon-card';
            couponCard.innerHTML = `
              <img src="${couponData && couponData.imageUrl ? couponData.imageUrl : 'assets/coupon_placeholder.png'}" alt="${couponData && couponData.brand ? couponData.brand : 'Coupon'}">
              <p><strong>Code:</strong> ${coupon.code}</p>
              <p><strong>Claimed:</strong> ${claimedAt}</p>
              <p><strong>Used:</strong> ${coupon.used ? 'Yes' : 'No'}</p>
            `;
            myCouponsDiv.appendChild(couponCard);
          }
        });
      });
    }

    function markCouponAsUsed(couponId) {
      userRef.collection('claimedCoupons').doc(couponId).update({ used: true })
        .then(() => {
          showToast('Coupon marked as used!');
          loadMyCoupons();
        });
    }

    // Toast feedback (for next step)
    function showToast(msg) {
      let toast = document.getElementById('toast-msg');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#222C36';
        toast.style.color = '#fff';
        toast.style.padding = '1em 2em';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '9999';
        toast.style.fontWeight = '600';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }
  });
}); 