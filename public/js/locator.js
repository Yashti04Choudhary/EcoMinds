// js/locator.js

// Initialize map
var map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Show user's location
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function(position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    map.setView([lat, lng], 13);
    // Custom red icon for current location
    var redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.marker([lat, lng], {icon: redIcon}).addTo(map)
      .bindPopup('📍 You are here!')
      .openPopup();
  });
}

// Fetch dummy recyclers from Firestore
db.collection("recycler_centers").get().then(function(querySnapshot) {
  querySnapshot.forEach(function(doc) {
    var data = doc.data();
    if (data.location && data.location.latitude && data.location.longitude) {
      var marker = L.marker([data.location.latitude, data.location.longitude]).addTo(map);
      marker.bindPopup(`<strong>${data.name}</strong><br>${data.address}`);
    }
  });
}).catch(function(error) {
  console.error("Error fetching recycler locations:", error);
});
