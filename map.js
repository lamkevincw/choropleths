var ndviValues;

var map;

fetch('https://raw.githubusercontent.com/lamkevincw/choropleths/main/static/ndviValues.json')
    .then((response) => response.json())
    .then((data) => {
        var prop = data.map(function (item) { return JSON.parse(item["prop"]) });
        ndviValues = prop.map(function (value) { return { "latlng": value[0].reverse(), "mNDVI": value[1][0], "cNDVI": value[1][1] } });
        console.log(ndviValues)

        initialize();
    });

function initialize() {
    initializeMap();
}

function initializeMap() {
    map = L.map('map').setView(ndviValues[0].latlng, 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}