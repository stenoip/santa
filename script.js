// =====================================================
// DOMAIN PROTECTION - Only allow stenoip.github.io
// =====================================================
var allowedHost = "stenoip.github.io";

if (window.location.hostname !== allowedHost) {
    document.body.innerHTML = `
        <div style="font-family:Arial;text-align:center;padding-top:20vh;font-size:30px;color:red;">
             Unauthorized Domain<br><br>
            This Santa Tracker is protected by Stenoip Company.<br>
            Only <b>${allowedHost}</b> is allowed to host it.
        </div>
    `;
    throw new Error("Unauthorized domain: " + window.location.hostname);
}

// Additional protection against console tampering
setInterval(function() {
    if (window.location.hostname !== allowedHost) {
        throw new Error("Unauthorized domain blocked.");
    }
}, 500);

// =====================================================
// DEC 24/25 BLOCKER LOGIC
// =====================================================
function checkBlocker() {
  var now = new Date();
  var month = now.getMonth();
  var day = now.getDate();

  if (!(month === 11 && (day === 24 || day === 25))) {
    document.getElementById("blocker").style.display = "block";
    updateBigCountdown();
    setInterval(updateBigCountdown, 1000);
  }
}

function updateBigCountdown() {
  var now = new Date();
  var xmas = new Date(now.getFullYear(), 11, 24, 10, 0, 0);
  var diff = xmas - now;

  var el = document.getElementById("bigCountdown");

  if (diff <= 0) {
    el.textContent = "SANTA IS FLYING SOON!";
    return;
  }

  var d = Math.floor(diff / (1000*60*60*24));
  var h = Math.floor(diff / (1000*60*60)) % 24;
  var m = Math.floor(diff / (1000*60)) % 60;
  var s = Math.floor(diff/1000) % 60;

  el.textContent = d + "d " + h + "h " + m + "m " + s + "s";
}

checkBlocker();

// =====================================================
// MAP INITIALIZATION
// =====================================================
var map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var santaIcon = L.icon({
  iconUrl: "https://i.imgur.com/9QeQnQD.png",
  iconSize: [55, 55]
});

var santaMarker = null;
var routePolyline = null;
var routeDataGlobal = null;

// =====================================================
// FETCH LIVE SANTA DATA
// =====================================================
function updateSanta() {
  fetch("https://santa-api.appspot.com/info?client=web&language=en")
  .then(res => res.json())
  .then(function(data) {
    if (!data.location) return;

    var parts = data.location.split(",");
    var lat = parseFloat(parts[0]);
    var lon = parseFloat(parts[1]);

    if (!santaMarker) {
      santaMarker = L.marker([lat, lon], {icon: santaIcon}).addTo(map);
    } else {
      santaMarker.setLatLng([lat, lon]);
    }

    map.panTo([lat, lon]);
    document.getElementById("loc").textContent = lat.toFixed(2) + ", " + lon.toFixed(2);

    if (data.presentsDelivered) {
      document.getElementById("gifts").textContent =
        data.presentsDelivered.toLocaleString();
    }

    if (data.route && data.route.length > 0) {
      fetch(data.route[0])
      .then(r => r.json())
      .then(function(routeJSON) {
        routeDataGlobal = routeJSON.destinations;

        var coords = [];
        for (var i = 0; i < routeJSON.destinations.length; i++) {
          coords.push([
            routeJSON.destinations[i].location.lat,
            routeJSON.destinations[i].location.lng
          ]);
        }

        if (routePolyline) map.removeLayer(routePolyline);
        routePolyline = L.polyline(coords, {color:'red'}).addTo(map);

        document.getElementById("next").textContent =
          routeJSON.destinations[1] ? routeJSON.destinations[1].city : "Unknown";
      });
    }
  })
  .catch(e => console.log("Santa error", e));
}

setInterval(updateSanta, 30000);
updateSanta();

// =====================================================
// USER CITY ETA CALCULATION
// =====================================================
function calculateETA() {
  var city = document.getElementById("cityInput").value.trim();
  if (!city || !routeDataGlobal) {
    document.getElementById("eta").textContent = "Enter city or wait for route.";
    return;
  }

  fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(city))
  .then(r => r.json())
  .then(function(result) {

    if (!result[0]) {
      document.getElementById("eta").textContent = "City not found.";
      return;
    }

    var userLat = parseFloat(result[0].lat);
    var userLon = parseFloat(result[0].lon);

    var closest = null;
    var minDist = Infinity;

    for (var i = 0; i < routeDataGlobal.length; i++) {
      var stop = routeDataGlobal[i];
      var d = Math.sqrt(
        Math.pow(stop.location.lat - userLat,2) +
        Math.pow(stop.location.lng - userLon,2)
      );
      if (d < minDist) {
        minDist = d;
        closest = stop;
      }
    }

    if (!closest) {
      document.getElementById("eta").textContent = "No ETA available.";
      return;
    }

    var etaTime = new Date(closest.arrival);
    var now = new Date();

    if (etaTime < now) {
      document.getElementById("eta").textContent = "Santa already visited!";
      return;
    }

    var diff = etaTime - now;
    var h = Math.floor(diff/1000/60/60);
    var m = Math.floor(diff/1000/60)%60;

    document.getElementById("eta").textContent =
      "Arrives in " + h + "h " + m + "m (" + etaTime.toLocaleTimeString() + ")";
  });
}

// =====================================================
// LAUNCH COUNTDOWN
// =====================================================
function updateCountdown() {
  var now = new Date();
  var launch = new Date(now.getFullYear(), 11, 24, 10, 0, 0);
  var diff = launch - now;

  var el = document.getElementById("count");

  if (diff <= 0) {
    el.textContent = "Santa is flying!";
    return;
  }

  var h = Math.floor(diff/1000/60/60);
  var m = Math.floor(diff/1000/60)%60;
  var s = Math.floor(diff/1000)%60;

  el.textContent = h + "h " + m + "m " + s + "s";
}
setInterval(updateCountdown, 1000);
updateCountdown();

// =====================================================
// SNOW EFFECT
// =====================================================
var canvas = document.getElementById("snow");
var ctx = canvas.getContext("2d");
var W = canvas.width = window.innerWidth;
var H = canvas.height = window.innerHeight;

var flakes = [];
for (var i = 0; i < 150; i++) {
  flakes.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 4 + 1,
    d: Math.random() + 1
  });
}

function drawSnow() {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="white";
  ctx.beginPath();

  for (var i = 0; i < flakes.length; i++) {
    var f = flakes[i];
    ctx.moveTo(f.x,f.y);
    ctx.arc(f.x,f.y,f.r,0,Math.PI*2,true);
  }

  ctx.fill();
  updateSnow();
}

var angle = 0;
function updateSnow() {
  angle += 0.01;

  for (var i = 0; i < flakes.length; i++) {
    var f = flakes[i];
    f.y += Math.pow(f.d,2)+1;
    f.x += Math.sin(angle)*0.5;

    if (f.y > H) {
      f.y = 0;
      f.x = Math.random()*W;
    }
  }
}

setInterval(drawSnow, 33);
