// Map init
const map = L.map('map', { preferCanvas: true, zoomControl: true }).setView([35.5, -79], 7);

// Base maps
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
});
const satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 19, attribution: "Tiles © Esri, Maxar, Earthstar Geographics" }
);
osm.addTo(map);

// Basemap control
L.control.layers({ "OpenStreetMap": osm, "Satellite": satellite }, null, { collapsed: false }).addTo(map);

// Data URLs (raw GitHub)
const URLs = {
  counties:  "https://raw.githubusercontent.com/hayatkhan20/Election-NC/main/counties_min.geojson",
  precincts: "https://raw.githubusercontent.com/hayatkhan20/Election-NC/main/precincts_min.geojson",
  house:     "https://raw.githubusercontent.com/hayatkhan20/Election-NC/main/state_house_min.geojson",
  senate:    "https://raw.githubusercontent.com/hayatkhan20/Election-NC/main/state_senate_min.geojson",
  congress:  "https://raw.githubusercontent.com/hayatkhan20/Election-NC/main/us_congress_min.geojson",
};

// Styles
const styles = {
  counties:  { color:"#ef4444", weight:1, fillOpacity:0.05 },
  precincts: { color:"#0284c7", weight:0.6, fillOpacity:0.04 },
  house:     { color:"#65a30d", weight:1, dashArray:"4 3", fillOpacity:0.03 },
  senate:    { color:"#ca8a04", weight:1, dashArray:"4 3", fillOpacity:0.03 },
  congress:  { color:"#7c3aed", weight:1, dashArray:"4 3", fillOpacity:0.03 },
  hover:     { weight:2, fillOpacity:0.10 }
};

const featurePanel = document.getElementById('feature-panel');
const loadingEl = document.getElementById('loading');

function htmlEscape(s){ return String(s ?? '').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m] )); }

function featureHTML(kind, props) {
  if (kind === 'counties') {
    return `<b>County:</b> ${htmlEscape(props.name)}<br/><b>ID:</b> ${htmlEscape(props.county_id)}`;
  }
  if (kind === 'precincts') {
    return `<b>Precinct:</b> ${htmlEscape(props.name || props.enr_desc)}<br/>
            <b>ID:</b> ${htmlEscape(props.prec_id)}<br/>
            <b>County:</b> ${htmlEscape(props.county_name)} (${htmlEscape(props.county_id)})`;
  }
  return `<b>${kind.replace(/^\w/, c => c.toUpperCase())} District:</b> ${htmlEscape(props.name || props.district)}`;
}

function makeLayer(kind, data) {
  const layer = L.geoJSON(data, {
    style: styles[kind],
    onEachFeature: (feat, lyr) => {
      lyr.on('mouseover', () => lyr.setStyle(styles.hover));
      lyr.on('mouseout',  () => layer.resetStyle(lyr));
      lyr.on('click', () => {
        const html = featureHTML(kind, feat.properties);
        lyr.bindPopup(html, { maxWidth: 320 }).openPopup();
        featurePanel.innerHTML = html;
      });
    }
  });
  return layer;
}

const layers = {};
const fitFns = {};

async function loadLayer(kind) {
  loadingEl.style.display = 'flex';
  const res = await fetch(URLs[kind]);
  const gj = await res.json();
  if (layers[kind]) { map.removeLayer(layers[kind]); }
  layers[kind] = makeLayer(kind, gj);
  map.addLayer(layers[kind]);
  fitFns[kind] = () => map.fitBounds(layers[kind].getBounds(), { padding:[20,20] });
  loadingEl.style.display = 'none';
}

// Default layers
loadLayer('counties').then(()=>fitFns['counties'] && fitFns['counties']());
loadLayer('precincts');

// Sidebar controls
[
  ['lyr-counties','counties','fit-counties'],
  ['lyr-precincts','precincts','fit-precincts'],
  ['lyr-house','house','fit-house'],
  ['lyr-senate','senate','fit-senate'],
  ['lyr-congress','congress','fit-congress'],
].forEach(([chkId, kind, fitId]) => {
  const chk = document.getElementById(chkId);
  const fit = document.getElementById(fitId);

  chk.addEventListener('change', async () => {
    if (chk.checked) {
      if (!layers[kind]) await loadLayer(kind);
      else map.addLayer(layers[kind]);
    } else if (layers[kind]) {
      map.removeLayer(layers[kind]);
    }
  });

  fit.addEventListener('click', () => {
    if (layers[kind]) fitFns[kind]();
  });
});
