// js/main.js
document.addEventListener('DOMContentLoaded', async () => {

    if (typeof MAPBOX_TOKEN === 'undefined' || MAPBOX_TOKEN === "") {
        alert("Error: La clave de Mapbox no está definida...");
        return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const POTENTIAL_EVENTS = [
        { year: 2019, stage: 'Antes', label: 'Jul 2019', description: 'Pre-Evento 2019' }, { year: 2019, stage: 'Durante', label: 'Oct-Nov 2019', description: 'Evento 2019' }, { year: 2019, stage: 'Después', label: 'Dic 2019', description: 'Post-Evento 2019' }, { year: 2020, stage: 'Antes', label: 'Sept 2020', description: 'Pre-Inundación' }, { year: 2020, stage: 'Durante', label: 'Oct-Nov 2020', description: 'Inundación Grave' }, { year: 2020, stage: 'Después', label: 'Dic 2020', description: 'Post-Inundación' }, { year: 2021, stage: 'Durante', label: 'Nov 2021', description: 'Evento 2021' }, { year: 2022, stage: 'Durante', label: 'Oct 2022', description: 'Evento 2022' }, { year: 2023, stage: 'Durante', label: 'Nov-Dic 2023', description: 'Evento 2023' }, { year: 2024, stage: 'Durante', label: 'Oct 2024', description: 'Evento 2024' },
    ];
    const AREA_TABASCO_KM2 = 24738;
    let availableEvents = [];
    const state = { currentEventId: null, opacity: 0.60, is3D: true };
    
    const welcomeScreen = document.getElementById('welcome-screen'), mapApp = document.getElementById('map-app'), enterAppBtn = document.getElementById('enter-app-btn'), homeLink = document.getElementById('home-link'), opacitySlider = document.getElementById('opacity-slider'), opacityValue = document.getElementById('opacity-value'), toggle3DBtn = document.getElementById('toggle-3d-btn'), timelineContainer = document.getElementById('timeline'), chartLabel = document.getElementById('chart-label'), infoPanel = document.getElementById('info-panel'), infoTitle = document.getElementById('info-title'), infoArea = document.getElementById('info-area'), infoPercentage = document.getElementById('info-percentage'), infoVolume = document.getElementById('info-volume'), infoPolygons = document.getElementById('info-polygons'), loadingIndicator = document.getElementById('loading-indicator');
    let map, dashboardChart;

    const initializeApp = async () => {
        await findAvailableData();
        if (availableEvents.length === 0) { alert("No se encontraron archivos de datos en /data/."); return; }
        state.currentEventId = availableEvents.find(e => e.id === '2020-Durante')?.id || availableEvents[0].id;
        initEventListeners(); initMap(); initTimeline(); initChart();
    };

    const findAvailableData = async () => {
        const checks = POTENTIAL_EVENTS.map(async (event) => {
            const path = `data/Agua_${event.stage}_Tabasco_${event.year}.geojson`;
            try {
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) return { ...event, id: `${event.year}-${event.stage}` };
            } catch (error) {}
            return null;
        });
        availableEvents = (await Promise.all(checks)).filter(Boolean);
    };

    const initMap = () => {
        map = new mapboxgl.Map({
            container: 'map-container',
            style: 'mapbox://styles/mapbox/dark-v11', // <-- CAMBIO DE ESTILO DE MAPA
            center: [-92.93, 17.84], zoom: 7.5, bearing: -17.6, antialias: true,
        });

        map.on('load', () => {
            map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1' });
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.5 });
            map.addSource('agua-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({
                id: 'agua-fill-layer', type: 'fill-extrusion', source: 'agua-source',
                paint: {
                    'fill-extrusion-color': '#22d3ee', // <-- CAMBIO DE COLOR DEL AGUA (CIAN BRILLANTE)
                    'fill-extrusion-height': 500,
                    'fill-extrusion-base': 0, 'fill-extrusion-opacity': state.opacity,
                },
            });
            map.easeTo({ pitch: 60, duration: 2000 });
            updateUI();
        });
    };

    const updateMapData = async () => {
        loadingIndicator.classList.remove('hidden');
        infoPanel.classList.add('hidden');
        const event = availableEvents.find(e => e.id === state.currentEventId);
        const path = `data/Agua_${event.stage}_Tabasco_${event.year}.geojson`;
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error('No se pudo cargar el archivo');
            const geojson = await response.json();
            map.getSource('agua-source').setData(geojson);
            const areaKm2 = turf.area(geojson) / 1e6;
            const volumeMegaM3 = (areaKm2 * 1e6 * 0.5) / 1e6;
            const percentageAffected = (areaKm2 / AREA_TABASCO_KM2) * 100;
            
            infoArea.textContent = `${areaKm2.toLocaleString('es-MX', {maximumFractionDigits: 2})} km²`;
            infoPercentage.textContent = `${percentageAffected.toFixed(2)} %`; // NUEVO DATO
            infoVolume.textContent = `${volumeMegaM3.toLocaleString('es-MX', {maximumFractionDigits: 2})} M m³`;
            infoPolygons.textContent = geojson.features.length.toLocaleString('es-MX');
            infoTitle.textContent = `${event.description} (${event.label})`;
            infoPanel.classList.remove('hidden');
        } catch (error) {
            console.warn(error.message, `path: ${path}`);
            map.getSource('agua-source').setData({ type: 'FeatureCollection', features: [] });
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    };
    
    const initEventListeners = () => {
        enterAppBtn.addEventListener('click', () => {
            welcomeScreen.style.transition = 'opacity 0.5s ease-out';
            welcomeScreen.style.opacity = 0;
            setTimeout(() => { welcomeScreen.classList.add('hidden'); mapApp.classList.remove('hidden'); }, 500);
        });
        
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            mapApp.style.transition = 'opacity 0.5s ease-out';
            mapApp.style.opacity = 0;
            setTimeout(() => { window.location.reload(); }, 500);
        });

        opacitySlider.addEventListener('input', (e) => {
            state.opacity = parseFloat(e.target.value);
            opacityValue.textContent = Math.round(state.opacity * 100);
            if (map.getLayer('agua-fill-layer')) { map.setPaintProperty('agua-fill-layer', 'fill-extrusion-opacity', state.opacity); }
        });

        toggle3DBtn.addEventListener('click', () => {
            state.is3D = !state.is3D;
            if (state.is3D) {
                map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.5 });
                map.easeTo({ pitch: 60, duration: 1000 });
                toggle3DBtn.textContent = 'Cambiar a Vista 2D';
            } else {
                map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
                toggle3DBtn.textContent = 'Cambiar a Vista 3D';
                setTimeout(() => map.setTerrain(null), 1000);
            }
        });
    };
    
    const initTimeline = () => {
        timelineContainer.innerHTML = '<div class="timeline-line"></div>';
        availableEvents.forEach(event => {
            const point = document.createElement('button');
            point.className = 'timeline-point';
            point.dataset.eventId = event.id;
            point.innerHTML = `<div class="dot"></div><div class="event-description">${event.description}</div><div class="event-label">${event.label}</div>`;
            point.addEventListener('click', () => { state.currentEventId = event.id; updateUI(); });
            timelineContainer.appendChild(point);
        });
    };

    const initChart = () => {
        const ctx = document.getElementById('dashboard-chart').getContext('2d');
        dashboardChart = new Chart(ctx, {
            type: 'bar', data: { labels: [], datasets: [{ data: [] }] },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#e2e8f0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, // COLOR LEGIBLE
                    y: { ticks: { color: '#e2e8f0', callback: (v) => `${v} km²` }, grid: { color: 'rgba(255, 255, 255, 0.1)' } } // COLOR LEGIBLE
                }
            }
        });
    };

    const updateChartForYear = async (year) => {
        chartLabel.textContent = `Resumen del Evento ${year}`;
        const eventsForYear = availableEvents.filter(e => e.year === year).sort((a,b) => ["Antes", "Durante", "Después"].indexOf(a.stage) - ["Antes", "Durante", "Después"].indexOf(b.stage));
        const labels = [], data = [];
        for (const event of eventsForYear) {
            const path = `data/Agua_${event.stage}_Tabasco_${event.year}.geojson`;
            try {
                const res = await fetch(path);
                const geojson = await res.json();
                labels.push(`${event.stage} (${event.label})`);
                data.push(Math.round(turf.area(geojson) / 1e6));
            } catch { labels.push(event.stage); data.push(0); }
        }
        dashboardChart.data.labels = labels;
        dashboardChart.data.datasets[0] = {
            label: 'Área Inundada', data: data, backgroundColor: 'rgba(34, 211, 238, 0.6)', borderColor: 'rgba(34, 211, 238, 1)',
            borderWidth: 1, borderRadius: 4,
        };
        dashboardChart.update();
    };

    const updateUI = () => { const event = availableEvents.find(e => e.id === state.currentEventId); if (event) { updateActiveButtons(); updateMapData(); updateChartForYear(event.year); } };
    const updateActiveButtons = () => { document.querySelectorAll('.timeline-point').forEach(point => { point.classList.toggle('active', point.dataset.eventId === state.currentEventId); }); };

    initializeApp();
});