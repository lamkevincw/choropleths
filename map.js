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
var selectedColourScheme = "mNDVI";

const recWidth = 0.003;
const recHeight = 0.002;
const gridItemCount = 10000; // Square root must be whole number

const medianColours = ['#FFFFFF', '#CE7E45', '#DF923D', '#F1B555', '#FCD163', '#99B718', '#74A901',
    '#66A000', '#529400', '#3E8601', '#207401', '#056201', '#004C00', '#023B01',
    '#012E01', '#011D01', '#011301'];
const covColours = ["#1d44ff", "#fbff1d", "#c4eb2a", "#4bed49", "#58c82a", "#087a07"]

fetch('https://raw.githubusercontent.com/lamkevincw/choropleths/main/static/gridObject.json')
    .then((response) => response.json())
    .then((data) => {
        console.log(data)

        gridData = data.data;
        defaultView = data.defaultView;
        defaultView.zoom = 12;
        // mNDVIRange = data.mNDVIRange;
        // cNDVIRange = data.cNDVIRange;
        mNDVIRange = [0.35, 0.65]; // Values from EE code
        cNDVIRange = [25, 75]; // Values from EE code
        latRange = data.latRange;
        lngRange = data.lngRange;

        initialize();
    });

function initialize() {
    // Event listeners
    document.getElementById("colourForm").addEventListener("submit", changeColourScheme);

    // processData();
    initializeMap();

    plotNDVI(toggleButtonValue);
    drawLegend();
}

function initializeMap() {
    // Create leaflet map
    map = L.map('map').setView(defaultView.latlng, defaultView.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
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

function plotNDVI(ndvi, colour) {
    if (ndvi === "mNDVI") {
        mNDVIPoints = gridData.map((point, index) => {
            return L.rectangle(
                point.bounds,
                {
                    // color: colorGradient((point.mNDVIavg - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]),
                    //     { red: 217, green: 83, blue: 79 },
                    //     { red: 240, green: 173, blue: 78 },
                    //     { red: 92, green: 184, blue: 91 })
                    color: getColours((point.mNDVIavg - mNDVIRange[0]) / (mNDVIRange[1] - mNDVIRange[0]))
                }
            ).addTo(map);
        });
    }
    else if (ndvi === "cNDVI") {
        cNDVIPoints = gridData.map((point, index) => {
            return L.rectangle(
                point.bounds,
                {
                    // color: colorGradient((point.cNDVIavg - cNDVIRange[0]) / (cNDVIRange[1] - cNDVIRange[0]),
                    //     { red: 217, green: 83, blue: 79 },
                    //     { red: 240, green: 173, blue: 78 },
                    //     { red: 92, green: 184, blue: 91 })
                    color: getColours((point.cNDVIavg - cNDVIRange[0]) / (cNDVIRange[1] - cNDVIRange[0]))
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

    // Clear legend
    d3.select("#colourLegend").html("");
}

function toggleNDVI() {
    clearMap();
    if (toggleButtonValue === "mNDVI") {
        // plotNDVI("cNDVI");
        document.getElementById("toggleNDVI").innerHTML = "cNDVI";
        toggleButtonValue = "cNDVI";
    } else if (toggleButtonValue === "cNDVI") {
        // plotNDVI("mNDVI");
        document.getElementById("toggleNDVI").innerHTML = "mNDVI";
        toggleButtonValue = "mNDVI";
    }
    plotNDVI(toggleButtonValue);
    drawLegend()
}

function changeColourScheme(e) {
    e.preventDefault();
    // console.log(e)

    let formData = new FormData(e.target);
    let formProps = Object.fromEntries(formData);
    console.log(formProps)

    selectedColourScheme = formProps.colourScheme;
    clearMap();
    plotNDVI(toggleButtonValue);
    drawLegend();
}

function getColours(fraction) {
    switch (selectedColourScheme) {
        case "turbo":
            return d3.interpolateTurbo(fraction);
            break;
        case "viridis":
            return d3.interpolateViridis(fraction);
            break;
        case "inferno":
            return d3.interpolateInferno(fraction);
            break;
        case "mNDVI":
            // console.log(medianColours.map((e, i) => {return i/(medianColours.length - 1)}))
            return d3.scaleLinear()
                .domain(medianColours.map((e, i) => { return i / (medianColours.length - 1) }))
                .range(medianColours)(fraction);
            break;
        case "cNDVI":
            return d3.scaleLinear()
                .domain(covColours.map((e, i) => { return i / (covColours.length - 1) }))
                .range(covColours)(fraction);
            break;
    }
}
function drawLegend() {
    let svg = d3.select("#colourLegend");

    let xScale, xAxis, colorScale;
    switch (toggleButtonValue) {
        case "mNDVI":
            /*** Draw X-Axis ***/
            xScale = d3.scaleLinear()
                .domain([0, 1])
                .range([0, 470]);

            xAxis = d3.axisBottom(d3.scaleLinear()
                .domain(mNDVIRange)
                .range([30, 470]));

            svg.append("g")
                .attr("transform", "translate(0,80)")
                .call(xAxis);

            /*** Create color scale ***/
            colorScale = d3.scaleLinear()
                .domain(medianColours.map((e, i) => { return i / (medianColours.length - 1) }))
                .range(medianColours);

            /*** Draw data points using color scale ***/
            svg.selectAll("circle")
                .data(medianColours.map((e, i) => { return i / (medianColours.length - 1) }))
                .enter()
                .append("circle")
                .attr("cx", (d, i) => xScale(d))
                .attr("cy", 60)
                .attr("r", 13)
                .attr("fill", (d) => colorScale(d));
            break;
        case "cNDVI":
            /*** Draw X-Axis ***/
            xScale = d3.scaleLinear()
                .domain([0, 1])
                .range([30, 470]);

            xAxis = d3.axisBottom(d3.scaleLinear()
                .domain(cNDVIRange)
                .range([30, 470]));

            svg.append("g")
                .attr("transform", "translate(0,80)")
                .call(xAxis);

            /*** Create color scale ***/
            colorScale = d3.scaleLinear()
                .domain(covColours.map((e, i) => { return i / (covColours.length - 1) }))
                .range(covColours);

            /*** Draw data points using color scale ***/

            svg.selectAll("circle")
                .data(covColours.map((e, i) => { return i / (covColours.length - 1) }))
                .enter()
                .append("circle")
                .attr("cx", (d, i) => xScale(d))
                .attr("cy", 60)
                .attr("r", 13)
                .attr("fill", (d) => colorScale(d));
            break;
    }

}