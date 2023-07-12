// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

var ndviValues;
var dataSubset;
var gridData = [];

var dataSummary = { "cMean": 0, "cStdDev": 0 };

var defaultView = { "latlng": [], "zoom": 10 };
var mNDVIRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
var cNDVIRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
var latRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
var lngRange = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

var map;
var mNDVIPoints = [];
var cNDVIPoints = [];

var toggleButtonValue = "mNDVI";

const recWidth = 0.003;
const recHeight = 0.002;
const gridItemCount = 10000; // Square root must be whole number

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

    plotNDVI(toggleButtonValue);
}

function initializeMap() {
    // Create leaflet map
    map = L.map('map').setView(defaultView.latlng, defaultView.zoom);
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
    dataSubset = ndviValues.filter((element, index) => { return index % 10 === 0 })

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
        dataSummary.cMean += dataSubset[len].cNDVI;

        // Calculate ranges of NDVI values
        if (dataSubset[len].mNDVI > mNDVIRange[1]) {
            mNDVIRange[1] = dataSubset[len].mNDVI;
        } else if (dataSubset[len].mNDVI < mNDVIRange[0]) {
            mNDVIRange[0] = dataSubset[len].mNDVI;
        }
        if (dataSubset[len].cNDVI > cNDVIRange[1]) {
            cNDVIRange[1] = dataSubset[len].cNDVI;
            // console.log(len)
        } else if (dataSubset[len].cNDVI < cNDVIRange[0]) {
            cNDVIRange[0] = dataSubset[len].cNDVI;
            // console.log(len)
        }

        // Calculate min and max for latitude and longitude
        if (dataSubset[len].latlng[0] > latRange[1]) {
            latRange[1] = dataSubset[len].latlng[0];
        } else if (dataSubset[len].latlng[0] < latRange[0]) {
            latRange[0] = dataSubset[len].latlng[0];
        }
        if (dataSubset[len].latlng[1] > lngRange[1]) {
            lngRange[1] = dataSubset[len].latlng[1];
        } else if (dataSubset[len].latlng[1] < lngRange[0]) {
            lngRange[0] = dataSubset[len].latlng[1];
        }
    }
    dataSummary.cMean /= n;
    len = dataSubset.length;
    while (len--) {
        dataSummary.cStdDev += Math.pow((dataSubset[len].cNDVI - dataSummary.cMean), 2)
    }
    dataSummary.cStdDev /= n;
    dataSummary.cStdDev = Math.sqrt(dataSummary.cStdDev);
    console.log(dataSummary)

    // Reverse longitude due to negative values
    // lngRange = lngRange.reverse();

    // Set default view
    defaultView.latlng = [(latRange[0] + latRange[1]) / 2, (lngRange[0] + lngRange[1]) / 2];
    defaultView.zoom = 10;

    // Create grid
    let rectangleLat = (latRange[1] - latRange[0]) / Math.sqrt(gridItemCount);
    let rectangleLng = (lngRange[1] - lngRange[0]) / Math.sqrt(gridItemCount);
    let startPoint = [latRange[0] - rectangleLat / 100, lngRange[0] - rectangleLat / 100]; // Can be used to adjust starting point
    let endPoint = [latRange[1] + rectangleLat / 100, lngRange[1] + rectangleLat / 100];
    rectangleLat = (endPoint[0] - startPoint[0]) / Math.sqrt(gridItemCount);
    rectangleLng = (endPoint[1] - startPoint[1]) / Math.sqrt(gridItemCount);
    let latMargin = rectangleLat / 50;
    let lngMargin = rectangleLng / 50;
    for (let i = 0; i < Math.sqrt(gridItemCount); i++) {
        for (let j = 0; j < Math.sqrt(gridItemCount); j++) {
            let gridRectangle = {
                "bounds": [[startPoint[0] + rectangleLat * i, startPoint[1] + rectangleLng * j],
                [startPoint[0] + (rectangleLat * (i + 1) - latMargin), startPoint[1] + (rectangleLng * (j + 1) - lngMargin)]],
                "mNDVIavg": 0,
                "cNDVIavg": 0,
                "numOfPoints": 0
            };
            gridData.push(gridRectangle);
        }
    }

    for (let i = 0; i < gridData.length; i++) {
        for (let j = 0; j < dataSubset.length; j++) {
            if (dataSubset[j].latlng[0] > gridData[i].bounds[0][0] && dataSubset[j].latlng[0] < gridData[i].bounds[1][0] &&
                dataSubset[j].latlng[1] > gridData[i].bounds[0][1] && dataSubset[j].latlng[1] < gridData[i].bounds[1][1]) {
                gridData[i].numOfPoints++;
                gridData[i].mNDVIavg += dataSubset[j].mNDVI;
                gridData[i].cNDVIavg += dataSubset[j].cNDVI;
            }
        }
        gridData[i].mNDVIavg /= gridData[i].numOfPoints;
        gridData[i].cNDVIavg /= gridData[i].numOfPoints;
    }
    console.log(gridData);

    console.log(d3.interpolateTurbo(0.5))
}

function plotNDVI(ndvi) {
    if (ndvi === "mNDVI") {
        // mNDVIPoints = dataSubset.map((point, index) => {
        //     // return L.rectangle([
        //     //     [point.latlng[0] - recHeight, point.latlng[1] - recWidth],
        //     //     [point.latlng[0] + recHeight, point.latlng[1] + recWidth]
        //     // ], {
        //     //     color: colorGradient((point.mNDVI - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]),
        //     //         { red: 217, green: 83, blue: 79 },
        //     //         { red: 240, green: 173, blue: 78 },
        //     //         { red: 92, green: 184, blue: 91 })
        //     // }).addTo(map);
        //     return L.circle(point.latlng, {
        //         color: colorGradient((point.mNDVI - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]),
        //             { red: 217, green: 83, blue: 79 },
        //             { red: 240, green: 173, blue: 78 },
        //             { red: 92, green: 184, blue: 91 }),
        //         radius: 15
        //     }).addTo(map);
        // });
        mNDVIPoints = gridData.map((point, index) => {
            return L.rectangle(
                point.bounds,
                {
                    // color: colorGradient((point.mNDVIavg - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]),
                    //     { red: 217, green: 83, blue: 79 },
                    //     { red: 240, green: 173, blue: 78 },
                    //     { red: 92, green: 184, blue: 91 })
                    color: d3.interpolateTurbo((point.mNDVIavg - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]))
                }
            ).addTo(map);
        });
    }
    else if (ndvi === "cNDVI") {
        // cNDVIPoints = dataSubset.map((point, index) => {
        //     return L.rectangle([
        //         [point.latlng[0] - recHeight, point.latlng[1] - recWidth],
        //         [point.latlng[0] + recHeight, point.latlng[1] + recWidth]
        //     ], {
        //         color: colorGradient((point.cNDVI - cNDVIRange[0]) / (cNDVIRange[1] - cNDVIRange[0]),
        //             { red: 217, green: 83, blue: 79 },
        //             { red: 240, green: 173, blue: 78 },
        //             { red: 92, green: 184, blue: 91 })
        //     }).addTo(map);
        // });
        cNDVIPoints = gridData.map((point, index) => {
            return L.rectangle(
                point.bounds,
                {
                    // color: colorGradient((point.cNDVIavg - cNDVIRange[0]) / (cNDVIRange[1] - cNDVIRange[0]),
                    //     { red: 217, green: 83, blue: 79 },
                    //     { red: 240, green: 173, blue: 78 },
                    //     { red: 92, green: 184, blue: 91 })
                    color: d3.interpolateTurbo((point.cNDVIavg - cNDVIRange[0]) / (cNDVIRange[1] - cNDVIRange[0]))
                }
            ).addTo(map);
        });
    }
}

function clearMap() {
    for (let i = 0; i < mNDVIPoints.length; i++) {
        map.removeLayer(mNDVIPoints[i]);
    }
    for (let i = 0; i < cNDVIPoints.length; i++) {
        map.removeLayer(cNDVIPoints[i]);
    }

    map.setView(defaultView.latlng, defaultView.zoom);
}

function toggleNDVI() {
    clearMap();
    if (toggleButtonValue === "mNDVI") {
        plotNDVI("cNDVI");
        document.getElementById("toggleNDVI").innerHTML = "cNDVI";
        toggleButtonValue = "cNDVI";
    } else if (toggleButtonValue === "cNDVI") {
        plotNDVI("mNDVI");
        document.getElementById("toggleNDVI").innerHTML = "mNDVI";
        toggleButtonValue = "mNDVI";
    }
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