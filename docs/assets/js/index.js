/**
    * @author  EliasDH Team
    * @see https://eliasdh.com
    * @since 01/01/2025
**/

// Load external content
document.addEventListener('DOMContentLoaded', function() {
    loadExternalContent("context-menu", "https://raw.githubusercontent.com/EliasDeHondt/EuroMap/refs/heads/main/docs/assets/includes/context-menu.html");
});

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

// List of EU countries (ISO 3166-1 alpha-2 codes)
const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// List of EU candidate countries
const euCandidateCountries = [
    'AL', 'BA', 'GE', 'MD', 'ME', 'MK', 'RS', 'TR', 'UA'
];

// List of EU potential candidates
const euPotentialCandidates = ['XK'];

// List of NATO countries
const natoCountries = [
    'AL', 'BE', 'BG', 'CA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LT', 'LU', 'ME', 'NL',
    'MK', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'TR', 'GB',
    'US', 'SE'
];

// List of NATO aspirant countries
const natoAspirantCountries = ['UA', 'GE'];

let geoJsonLayer;

function updateLegend(view) {
    const legend = document.getElementById('legend');
    let legendContent = '<b>Color Legend:</b><br>';
    if (view === 'eu') {
        legendContent += '<span style="color: #003399;">■</span> Dark Blue: EU Countries<br>';
        legendContent += '<span style="color: #ffeb07;">■</span> Yellow: EU Candidate Countries<br>';
        legendContent += '<span style="color: #88a5df;">■</span> Light Blue: EU Potential Candidates<br>';
        legendContent += '<span style="color: #f7f9fc;">■</span> Light Gray: Non-members';
    } else if (view === 'nato') {
        legendContent += '<span style="color: #800080;">■</span> Purple: NATO Countries<br>';
        legendContent += '<span style="color: #B266B2;">■</span> Light Purple: NATO Aspirant Countries<br>';
        legendContent += '<span style="color: #f7f9fc;">■</span> Light Gray: Non-members';
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
                let fillColor = '#f7f9fc'; // Light Gray for non-members
                if (view === 'eu') {
                    if (euCountries.includes(isoCode)) fillColor = '#003399'; // Dark Blue
                    else if (euCandidateCountries.includes(isoCode)) fillColor = '#ffeb07'; // Yellow
                    else if (euPotentialCandidates.includes(isoCode)) fillColor = '#88a5df'; // Light Blue
                } else if (view === 'nato') {
                    if (natoCountries.includes(isoCode)) fillColor = '#800080'; // Purple
                    else if (natoAspirantCountries.includes(isoCode)) fillColor = '#B266B2'; // Light Purple
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
                if (euCountries.includes(isoCode)) status.push('EU Member');
                if (euCandidateCountries.includes(isoCode)) status.push('EU Candidate');
                if (euPotentialCandidates.includes(isoCode)) status.push('EU Potential Candidate');
                if (natoCountries.includes(isoCode)) status.push('NATO Member');
                if (natoAspirantCountries.includes(isoCode)) status.push('NATO Aspirant');
                if (status.length === 0) status.push('Non-member');
                layer.bindPopup(`<b>${countryName}</b><br>Status: ${status.join(', ')}`);
            }
        }).addTo(map);
    });
}

showView('eu');