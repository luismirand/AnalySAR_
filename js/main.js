document.addEventListener('DOMContentLoaded', async () => {

    if (typeof MAPBOX_TOKEN === 'undefined' || MAPBOX_TOKEN === "") {
        alert("Mapbox token is not defined. Please ensure your 'config.js' file exists and is loaded correctly.");
        return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // --- FUNCIÓN DE CLASIFICACIÓN DE SEVERIDAD ---
    const getSeverity = (areaKm2) => {
        if (areaKm2 > 3000) return { name: 'Catastrophic', color: '#ef4444' }; // Red-500
        if (areaKm2 > 1500) return { name: 'Major', color: '#f97316' };       // Orange-500
        if (areaKm2 > 500) return { name: 'Moderate', color: '#facc15' };     // Yellow-400
        if (areaKm2 > 0) return { name: 'Minor', color: '#22c55e' };          // Green-500
        return { name: 'N/A', color: '#6b7280' };                           // Gray-500
    };

    const POTENTIAL_EVENTS = [
        { year: 2014, stage: 'Antes', label: 'Sep 2014', description: '2014 Pre-Event' }, { year: 2014, stage: 'Durante', label: 'Oct 2014', description: '2014 Event' }, { year: 2014, stage: 'Después', label: 'Nov 2014', description: '2014 Post-Event' }, { year: 2015, stage: 'Antes', label: 'Oct 2015', description: '2015 Pre-Event' }, { year: 2015, stage: 'Durante', label: 'Nov 2015', description: '2015 Event' }, { year: 2015, stage: 'Después', label: 'Dec 2015', description: '2015 Post-Event' }, { year: 2016, stage: 'Antes', label: 'Sep 2016', description: '2016 Pre-Event' }, { year: 2016, stage: 'Durante', label: 'Oct 2016', description: '2016 Event' }, { year: 2016, stage: 'Después', label: 'Nov 2016', description: '2016 Post-Event' }, { year: 2017, stage: 'Antes', label: 'Sep 2017', description: '2017 Pre-Event' }, { year: 2017, stage: 'Durante', label: 'Oct 2017', description: '2017 Event' }, { year: 2017, stage: 'Después', label: 'Nov 2017', description: '2017 Post-Event' }, { year: 2018, stage: 'Antes', label: 'Sep 2018', description: '2018 Pre-Event' }, { year: 2018, stage: 'Durante', label: 'Oct 2018', description: '2018 Event' }, { year: 2018, stage: 'Después', label: 'Nov 2018', description: '2018 Post-Event' }, { year: 2019, stage: 'Antes', label: 'Jul 2019', description: '2019 Pre-Event' }, { year: 2019, stage: 'Durante', label: 'Oct-Nov 2019', description: '2019 Event' }, { year: 2019, stage: 'Después', label: 'Dec 2019', description: '2019 Post-Event' }, { year: 2020, stage: 'Antes', label: 'Sep 2020', description: 'Pre-Flood' }, { year: 2020, stage: 'Durante', label: 'Oct-Nov 2020', description: 'Major Flood' }, { year: 2020, stage: 'Después', label: 'Dec 2020', description: 'Post-Flood' }, { year: 2021, stage: 'Antes', label: 'Oct 2021', description: '2021 Pre-Event' }, { year: 2021, stage: 'Durante', label: 'Nov 2021', description: '2021 Event' }, { year: 2021, stage: 'Después', label: 'Dec 2021', description: '2021 Post-Event' }, { year: 2022, stage: 'Antes', label: 'Sep 2022', description: '2022 Pre-Event' }, { year: 2022, stage: 'Durante', label: 'Oct 2022', description: '2022 Event' }, { year: 2022, stage: 'Después', label: 'Nov 2022', description: '2022 Post-Event' }, { year: 2023, stage: 'Antes', label: 'Oct 2023', description: '2023 Pre-Event' }, { year: 2023, stage: 'Durante', label: 'Nov-Dec 2023', description: '2023 Event' }, { year: 2023, stage: 'Después', label: 'Jan 2024', description: '2023 Post-Event' }, { year: 2024, stage: 'Antes', label: 'Sep 2024', description: '2024 Pre-Event' }, { year: 2024, stage: 'Durante', label: 'Oct 2024', description: '2024 Event' }, { year: 2024, stage: 'Después', label: 'Nov 2024', description: '2024 Post-Event' }, { year: 2025, stage: 'Antes', label: 'Sep 2025', description: '2025 Pre-Event' }, { year: 2025, stage: 'Durante', label: 'Oct 2025', description: '2025 Event' }, { year: 2025, stage: 'Después', label: 'Nov 2025', description: '2025 Post-Event' },
    ];
    const AREA_TABASCO_KM2 = 24738;
    let availableEvents = [];
    const state = { currentEventId: '2020-Durante', opacity: 0.75, is3D: true, isBorderVisible: true, areLabelsVisible: true, waterColor: '#22d3ee', mapStyle: 'satellite-streets-v12' };
    
    const dom = {
        welcomeScreen: document.getElementById('welcome-screen'), mapApp: document.getElementById('map-app'), enterAppBtn: document.getElementById('enter-app-btn'), homeLink: document.getElementById('home-link'), opacitySlider: document.getElementById('opacity-slider'), opacityValue: document.getElementById('opacity-value'), toggle3DBtn: document.getElementById('toggle-3d-btn'), timelineContainer: document.getElementById('timeline'), chartPanel: document.getElementById('chart-panel'), chartLabel: document.getElementById('chart-label'), infoPanel: document.getElementById('info-panel'), infoTitle: document.getElementById('info-title'), infoArea: document.getElementById('info-area'), infoPercentage: document.getElementById('info-percentage'), infoVolume: document.getElementById('info-volume'), infoPolygons: document.getElementById('info-polygons'), infoSeverity: document.getElementById('info-severity'), loadingIndicator: document.getElementById('loading-indicator'), mapStyleControls: document.getElementById('map-style-controls'), waterColorControls: document.getElementById('water-color-controls'), toggleBorderBtn: document.getElementById('toggle-border-btn'), toggleLabelsBtn: document.getElementById('toggle-labels-btn')
    };
    let map, dashboardChart, isTransitioning = false;

    const initializeApp = async () => {
        await findAvailableData();
        if (availableEvents.length === 0) { alert("No data files found in /data/ folder."); return; }
        
        dom.enterAppBtn.addEventListener('click', () => {
            document.body.classList.add('map-active');
            dom.welcomeScreen.style.transition = 'opacity 0.5s ease-out';
            dom.welcomeScreen.style.opacity = 0;
            setTimeout(() => {
                dom.welcomeScreen.classList.add('hidden');
                dom.mapApp.classList.remove('hidden');
                startMapApplication();
            }, 500);
        });
    };

    const startMapApplication = () => {
        dom.opacitySlider.value = state.opacity;
        dom.opacityValue.textContent = Math.round(state.opacity * 100);
        initEventListeners();
        initMap();
        initTimeline();
        initChart();
        updateUI();
    };

    const findAvailableData = async () => {
        console.log("Analyzing data files...");
        const checks = POTENTIAL_EVENTS.map(async (event) => {
            const path = `data/Agua_${event.stage}_Tabasco_${event.year}.geojson`;
            try {
                const response = await fetch(path);
                if (!response.ok) return null;

                const geojson = await response.json();
                const areaKm2 = turf.area(geojson) / 1e6;
                const severity = getSeverity(areaKm2);
                
                return { ...event, id: `${event.year}-${event.stage}`, area: areaKm2, severity: severity };
            } catch (error) {
                return null;
            }
        });
        availableEvents = (await Promise.all(checks)).filter(Boolean);
        console.log(`Found and analyzed ${availableEvents.length} events.`);
    };

    const initMap = () => {
        map = new mapboxgl.Map({
            container: 'map-container',
            style: `mapbox://styles/mapbox/${state.mapStyle}`,
            center: [-92.93, 17.84], zoom: 8.5, pitch: 45, bearing: -17.6, antialias: true,
        });

        map.on('load', () => {
            addMapLayers();
            updateUI(); 
        });
        
        map.on('style.load', () => {
            if (map.getSource('mapbox-dem')) return;
            addMapLayers();
        });
    };
    
    const addMapLayers = () => {
        if (state.mapStyle.includes('satellite') && map.getLayer('satellite')) {
             map.setPaintProperty('satellite', 'raster-saturation', -0.7);
             map.setPaintProperty('satellite', 'raster-contrast', -0.2);
        }
        
        map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1' });
        if (state.is3D) map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.5 });
        
        const currentEvent = availableEvents.find(e => e.id === state.currentEventId);
        const dataPath = currentEvent ? `data/Agua_${currentEvent.stage}_Tabasco_${currentEvent.year}.geojson` : { type: 'FeatureCollection', features: [] };
        
        map.addSource('agua-source', { type: 'geojson', data: dataPath });
        
        map.addLayer({
            id: 'agua-fill-layer', type: 'fill-extrusion', source: 'agua-source',
            paint: { 'fill-extrusion-color': state.waterColor, 'fill-extrusion-height': 500, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': state.opacity }
        });
        
        map.addSource('tabasco-border', { type: 'geojson', data: 'data/tabasco-boundary.geojson' });
        map.addLayer({
            id: 'tabasco-border-layer', type: 'line', source: 'tabasco-border',
            layout: { 'visibility': state.isBorderVisible ? 'visible' : 'none' },
            paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-dasharray': [2, 2] }
        });
        toggleMapLabels(state.areLabelsVisible);
    };

    const toggleMapLabels = (visible) => {
        if (!map.isStyleLoaded()) return;
        const visibility = visible ? 'visible' : 'none';
        map.getStyle().layers.forEach(layer => {
            if (layer.type === 'symbol') {
                map.setLayoutProperty(layer.id, 'visibility', visibility);
            }
        });
    };

    const transitionToEvent = (newEventId) => {
        if (isTransitioning || state.currentEventId === newEventId) return;
        isTransitioning = true;
        state.currentEventId = newEventId;
        
        const event = availableEvents.find(e => e.id === newEventId);
        updateUI();

        map.setPaintProperty('agua-fill-layer', 'fill-extrusion-opacity', 0);
        setTimeout(() => {
             const newPath = `data/Agua_${event.stage}_Tabasco_${event.year}.geojson`;
             map.getSource('agua-source').setData(newPath);
             map.setPaintProperty('agua-fill-layer', 'fill-extrusion-opacity', state.opacity);
             isTransitioning = false;
        }, 300);
    };

    const initEventListeners = () => {
        dom.homeLink.addEventListener('click', (e) => { e.preventDefault(); dom.mapApp.style.transition = 'opacity 0.5s ease-out'; dom.mapApp.style.opacity = 0; setTimeout(() => { window.location.reload(); }, 500); });
        dom.opacitySlider.addEventListener('input', (e) => { state.opacity = parseFloat(e.target.value); dom.opacityValue.textContent = Math.round(state.opacity * 100); if (map.getLayer('agua-fill-layer')) { map.setPaintProperty('agua-fill-layer', 'fill-extrusion-opacity', state.opacity); } });
        dom.toggle3DBtn.addEventListener('click', () => { state.is3D = !state.is3D; if (state.is3D) { map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.5 }); map.easeTo({ pitch: 45, duration: 1000 }); dom.toggle3DBtn.textContent = 'Change to 2D View'; } else { map.easeTo({ pitch: 0, bearing: 0, duration: 1000 }); dom.toggle3DBtn.textContent = 'Change to 3D View'; setTimeout(() => map.setTerrain(null), 1000); } });
        
        dom.mapStyleControls.addEventListener('click', (e) => {
            if (e.target.classList.contains('style-btn') && !e.target.classList.contains('active')) {
                state.mapStyle = e.target.dataset.style;
                map.setStyle(`mapbox://styles/mapbox/${state.mapStyle}`);
                updateActiveButtons();
            }
        });
        
        dom.waterColorControls.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-swatch')) {
                state.waterColor = e.target.dataset.color;
                map.setPaintProperty('agua-fill-layer', 'fill-extrusion-color', state.waterColor);
                dashboardChart.data.datasets[0].backgroundColor = `${state.waterColor}99`;
                dashboardChart.data.datasets[0].borderColor = state.waterColor;
                dashboardChart.update();
                updateActiveButtons();
            }
        });

        dom.toggleBorderBtn.addEventListener('click', () => {
            state.isBorderVisible = !state.isBorderVisible;
            map.setLayoutProperty('tabasco-border-layer', 'visibility', state.isBorderVisible ? 'visible' : 'none');
            updateActiveButtons();
        });

        dom.toggleLabelsBtn.addEventListener('click', () => {
            state.areLabelsVisible = !state.areLabelsVisible;
            toggleMapLabels(state.areLabelsVisible);
            updateActiveButtons();
        });
    };
    
    const initTimeline = () => {
        dom.timelineContainer.innerHTML = '<div class="timeline-line"></div>';
        availableEvents.forEach(event => {
            const point = document.createElement('button');
            point.className = 'timeline-point';
            point.dataset.eventId = event.id;
            point.innerHTML = `<div class="dot"></div><div class="event-description">${event.description}</div><div class="event-label">${event.label}</div>`;
            
            if (event.stage === 'Durante') {
                point.querySelector('.dot').style.borderColor = event.severity.color;
            }

            point.addEventListener('click', () => transitionToEvent(event.id));
            dom.timelineContainer.appendChild(point);
        });
    };

    const initChart = () => {
        const ctx = document.getElementById('dashboard-chart').getContext('2d');
        dashboardChart = new Chart(ctx, { type: 'bar', data: { labels: [], datasets: [{ data: [] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#e2e8f0' }, grid: { color: 'rgba(255,255,255,0.1)' } }, y: { ticks: { color: '#e2e8f0', callback: (v) => `${v} km²` }, grid: { color: 'rgba(255,255,255,0.1)' } } } } });
    };
    
    const updateUI = () => {
        const event = availableEvents.find(e => e.id === state.currentEventId);
        if (event) {
            updateActiveButtons();
            updateInfoPanel(event); 
            updateChartForYear(event.year);
        }
    };
    
    const updateInfoPanel = (event) => {
        dom.loadingIndicator.classList.add('hidden');
        dom.infoPanel.classList.remove('hidden');

        const { area, severity, stage, year, description, label } = event;
        const volumeMegaM3 = (area * 1e6 * 0.5) / 1e6;
        const percentageAffected = (area / AREA_TABASCO_KM2) * 100;
        
        dom.infoSeverity.textContent = severity.name;
        dom.infoSeverity.style.color = severity.color;
        dom.infoArea.textContent = `${area.toLocaleString('en-US',{maximumFractionDigits:2})} km²`;
        dom.infoPercentage.textContent = `${percentageAffected.toFixed(2)} %`;
        dom.infoVolume.textContent = `${volumeMegaM3.toLocaleString('en-US',{maximumFractionDigits:2})} M m³`;
        dom.infoTitle.textContent = `${description} (${label})`;

        // Re-fetch only for polygon count as it's not pre-calculated
        fetch(`data/Agua_${stage}_Tabasco_${year}.geojson`)
            .then(res => res.json())
            .then(geojson => {
                dom.infoPolygons.textContent = geojson.features.length.toLocaleString('en-US');
            });
    };
    
    const updateChartForYear = (year) => {
        dom.chartLabel.textContent = `Event Summary ${year}`;
        const eventsForYear = availableEvents.filter(e => e.year === year).sort((a,b) => ["Antes", "Durante", "Después"].indexOf(a.stage) - ["Antes", "Durante", "Después"].indexOf(b.stage));
        
        const labels = eventsForYear.map(e => `${e.stage} (${e.label})`);
        const data = eventsForYear.map(e => Math.round(e.area));

        dashboardChart.data.labels = labels;
        dashboardChart.data.datasets[0] = {
            label: 'Flooded Area', data: data, backgroundColor: `${state.waterColor}99`, borderColor: state.waterColor,
            borderWidth: 1, borderRadius: 4,
        };
        dashboardChart.update();
    };

    const updateActiveButtons = () => {
        document.querySelectorAll('.timeline-point').forEach(p => p.classList.toggle('active', p.dataset.eventId === state.currentEventId));
        document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === state.mapStyle));
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === state.waterColor));
        dom.toggleBorderBtn.textContent = state.isBorderVisible ? 'Hide Border' : 'Show Border';
        dom.toggleBorderBtn.classList.toggle('active', state.isBorderVisible);
        dom.toggleLabelsBtn.textContent = state.areLabelsVisible ? 'Hide Labels' : 'Show Labels';
        dom.toggleLabelsBtn.classList.toggle('active', !state.areLabelsVisible);
    };

    initializeApp();
});