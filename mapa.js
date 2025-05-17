var mapita= L.map('map').setView([-6.785683, -79.839628], 17);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapita);
L.control.scale().addTo(mapita);
var marker=L.marker([-6.785683, -79.839628],{draggable: false}).addTo(mapita);
marker.bindPopup("<b>¡VISÍTANOS!</b><br>te esperamos.").openPopup();

if(window.innerWidth<300){
    mapita.setZoom(13)
}
