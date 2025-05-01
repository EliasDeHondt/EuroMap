/**
    * @author  EliasDH Team
    * @see https://eliasdh.com
    * @since 01/01/2025
**/

var gk_isXlsx = false;
var gk_xlsxFileLookup = {};
var gk_fileData = {};

function filledCell(cell) {
    return cell !== '' && cell != null;
}

function loadFileData(filename) {
    if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
        try {
            var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];

            var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
            var filteredData = jsonData.filter(row => row.some(filledCell));

            var headerRowIndex = filteredData.findIndex((row, index) =>
                row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
            );
            if (headerRowIndex === -1 || headerRowIndex > 25) headerRowIndex = 0;

            var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
            csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
            return csv;
        } catch (e) {
            console.error(e);
            return "";
        }
    }
    return gk_fileData[filename] || "";
}

const map = L.map('map', {
    maxBounds: [
        [85, -180],
        [-85, 180]
    ],
    maxBoundsViscosity: 1.0,
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
}).setView([50, 10], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Lijst van EU-landen (ISO 3166-1 alpha-2 codes)
const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Lijst van EU-kandidaat-lidstaten
const euCandidateCountries = [
    'AL', 'BA', 'GE', 'MD', 'ME', 'MK', 'RS', 'TR', 'UA'
];

// Lijst van EU-potentiele kandidaten
const euPotentialCandidates = ['XK'];

// Lijst van NATO-landen
const natoCountries = [
    'AL', 'BE', 'BG', 'CA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LT', 'LU', 'ME', 'NL',
    'MK', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'TR', 'GB',
    'US', 'SE'
];

// Lijst van NATO-aspirant-landen
const natoAspirantCountries = ['UA', 'GE'];

let geoJsonLayer;

function updateLegend(view) {
    const legend = document.getElementById('legend');
    let legendContent = '<b>Kleurenlegenda:</b><br>';
    if (view === 'eu') {
        legendContent += 'Blauw: EU-landen<br>';
        legendContent += 'Groen: EU-kandidaat-lidstaten<br>';
        legendContent += 'Lichtblauw: EU-potentiele kandidaten<br>';
        legendContent += 'Grijs: Geen lid';
    } else if (view === 'nato') {
        legendContent += 'Paars: NATO-landen<br>';
        legendContent += 'Lichtpaars: NATO-aspirant-landen<br>';
        legendContent += 'Grijs: Geen lid';
    }
    legend.innerHTML = legendContent;
}

function showView(view) {
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);

    updateLegend(view);

    fetch('https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson')
        .then(response => response.json())
        .then(data => {
            geoJsonLayer = L.geoJSON(data, {
                style: function(feature) {
                    const isoCode = feature.properties.iso_a2;
                    let fillColor = '#f7f9fc';
                    if (view === 'eu') {
                        if (euCountries.includes(isoCode)) fillColor = '#003399';
                        else if (euCandidateCountries.includes(isoCode)) fillColor = '#ffeb07';
                        else if (euPotentialCandidates.includes(isoCode)) fillColor = '#88a5df';
                    } else if (view === 'nato') {
                        if (natoCountries.includes(isoCode)) fillColor = '#800080';
                        else if (natoAspirantCountries.includes(isoCode)) fillColor = '#B266B2';
                    }
                    return {
                        fillColor: fillColor,
                        weight: 1,
                        opacity: 1,
                        color: 'white',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: function(feature, layer) {
                    const countryName = feature.properties.name;
                    const isoCode = feature.properties.iso_a2;
                    let status = [];
                    if (euCountries.includes(isoCode)) status.push('EU-lid');
                    if (euCandidateCountries.includes(isoCode)) status.push('EU-kandidaat');
                    if (euPotentialCandidates.includes(isoCode)) status.push('EU-potentiele kandidaat');
                    if (natoCountries.includes(isoCode)) status.push('NATO-lid');
                    if (natoAspirantCountries.includes(isoCode)) status.push('NATO-aspirant');
                    if (status.length === 0) status.push('Geen lid');
                    layer.bindPopup(`<b>${countryName}</b><br>Status: ${status.join(', ')}`);
                }
            }).addTo(map);
        });
}

showView('eu');