var ndviValues;
var dataSubset;

var dataSummary = { "mean": 0, "stdDev": 0 }

var mNDVIRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
var cNDVIRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

var map;
var mNDVIPoints;

const recWidth = 0.003;
const recHeight = 0.002;

fetch('https://raw.githubusercontent.com/lamkevincw/choropleths/main/static/ndviValues.json')
    .then((response) => response.json())
    .then((data) => {
        var prop = data.map(function (item) { return JSON.parse(item["prop"]) });
        ndviValues = prop.map(function (value) { return { "latlng": value[0].reverse(), "mNDVI": value[1][0], "cNDVI": value[1][1] } });
        console.log(ndviValues)

        initialize();
    });

function initialize() {
    processData();
    initializeMap();

    plotNDVI();
}

function initializeMap() {
    // Create leaflet map
    map = L.map('map').setView(ndviValues[0].latlng, 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Add temp polygon
    let test2 = L.polygon(dataSubset.map(function (x) { return x.latlng }))
    console.log(dataSubset)
    // test2.addTo(map)
}

function processData() {
    // Select data
    // 1 in 10 data points
    dataSubset = ndviValues.filter((element, index) => { return index % 100 === 0 })

    // Remove outliers
    let len = dataSubset.length;
    let n = dataSubset.length;
    let cAvg = 0;
    while (len--) {
        cAvg += dataSubset[len].cNDVI;
    }
    cAvg /= n;
    console.log(cAvg)
    let cStd = 0;
    len = dataSubset.length;
    while (len--) {
        cStd += Math.pow((dataSubset[len].cNDVI - cAvg), 2)
    }
    cStd /= n;
    cStd = Math.sqrt(cStd);
    console.log(cStd)

    // Get NDVI ranges and statistics
    console.log(cAvg - (3 * cStd))
    dataSubset = dataSubset.filter((element, index) => { return element.cNDVI > cAvg - (3 * cStd) && element.cNDVI < cAvg + (3 * cStd) })
    console.log("2 length: " + dataSubset.length)
    len = dataSubset.length;
    while (len--) {
        dataSummary.mean += dataSubset[len].cNDVI;

        if (dataSubset[len].mNDVI > mNDVIRange[1]) {
            mNDVIRange[1] = dataSubset[len].mNDVI;
        } else if (dataSubset[len].mNDVI < mNDVIRange[0]) {
            mNDVIRange[0] = dataSubset[len].mNDVI;
        }
        if (dataSubset[len].cNDVI > -500 && dataSubset[len].cNDVI < 500) {
            if (dataSubset[len].cNDVI > cNDVIRange[1]) {
                cNDVIRange[1] = dataSubset[len].cNDVI;
                // console.log(len)
            } else if (dataSubset[len].cNDVI < cNDVIRange[0]) {
                cNDVIRange[0] = dataSubset[len].cNDVI;
                // console.log(len)
            }
        }
    }
    dataSummary.mean /= n;
    len = dataSubset.length;
    while (len--) {
        dataSummary.stdDev += Math.pow((dataSubset[len].cNDVI - dataSummary.mean), 2)
    }
    dataSummary.stdDev /= n;
    dataSummary.stdDev = Math.sqrt(dataSummary.stdDev);
    console.log(dataSummary)

}

function plotNDVI() {
    mNDVIPoints = dataSubset.map((point, index) => {
        return L.rectangle([
            [point.latlng[0] - recHeight, point.latlng[1] - recWidth],
            [point.latlng[0] + recHeight, point.latlng[1] + recWidth]
        ], {
            color: colorGradient((point.mNDVI - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]),
                { red: 217, green: 83, blue: 79 },
                { red: 240, green: 173, blue: 78 },
                { red: 92, green: 184, blue: 91 })
        }).addTo(map);
        // return L.circle(point.latlng, {
        //     color: colorGradient((point.mNDVI - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]),
        //         { red: 217, green: 83, blue: 79 },
        //         { red: 240, green: 173, blue: 78 },
        //         { red: 92, green: 184, blue: 91 }),
        //     radius: 150
        // }).addTo(map);
    });
}

function colorGradient(fadeFraction, rgbColor1, rgbColor2, rgbColor3) {
    let color1 = rgbColor1;
    let color2 = rgbColor2;
    let fade = fadeFraction;

    // Do we have 3 colors for the gradient? Need to adjust the params.
    if (rgbColor3) {
        fade = fade * 2;

        // Find which interval to use and adjust the fade percentage
        if (fade >= 1) {
            fade -= 1;
            color1 = rgbColor2;
            color2 = rgbColor3;
        }
    }

    let diffRed = color2.red - color1.red;
    let diffGreen = color2.green - color1.green;
    let diffBlue = color2.blue - color1.blue;

    let gradient = {
        red: parseInt(Math.floor(color1.red + (diffRed * fade)), 10),
        green: parseInt(Math.floor(color1.green + (diffGreen * fade)), 10),
        blue: parseInt(Math.floor(color1.blue + (diffBlue * fade)), 10),
    };

    return 'rgb(' + gradient.red + ',' + gradient.green + ',' + gradient.blue + ')';
}