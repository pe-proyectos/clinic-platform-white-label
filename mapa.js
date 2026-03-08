var mapita = L.map('map').setView([-6.785683, -79.839628], 17);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapita);

L.control.scale().addTo(mapita);

var customIcon = L.divIcon({
    className: 'custom-pin',
    html: '<div class="map-pin-pulse" style="width: 40px; height: 40px; background-color: #dd4d4d; border: 4px solid white; border-radius: 50%; box-shadow: 0 10px 20px rgba(221,77,77,0.5); position: relative; z-index: 10;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div></div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

var marker = L.marker([-6.785683, -79.839628], { icon: customIcon, draggable: false }).addTo(mapita);

marker.bindPopup(
    '<div style="padding: 8px 10px; text-align: center; min-width: 156px; font-family: Inter, ui-sans-serif, system-ui, sans-serif;">' +
    '<p style="font-weight: 800; color: #0f172a; font-size: 18px; line-height: 1.15; margin: 0 0 4px; letter-spacing: -0.01em;">Dr. Chapo\u00f1an</p>' +
    '<p style="font-size: 10px; color: #dd4d4d; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; margin: 0;">Cardiolog\u00eda</p>' +
    '</div>'
).openPopup();

if (window.innerWidth < 300) {
    mapita.setZoom(13);
}
