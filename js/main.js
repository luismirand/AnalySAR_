document.addEventListener('DOMContentLoaded', async () => {

    if (typeof MAPBOX_TOKEN === 'undefined' || MAPBOX_TOKEN === "") {
        alert("Error: La clave de Mapbox no está definida...");
        return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const POTENTIAL_EVENTS = [
        // --- Año 2014 ---
        { year: 2014, stage: 'Antes', label: 'Sept 2014', description: 'Pre-Evento 2014' },
        { year: 2014, stage: 'Durante', label: 'Oct 2014', description: 'Evento 2014' },
        { year: 2014, stage: 'Después', label: 'Nov 2014', description: 'Post-Evento 2014' },

        // --- Año 2015 ---
        { year: 2015, stage: 'Antes', label: 'Oct 2015', description: 'Pre-Evento 2015' },
        { year: 2015, stage: 'Durante', label: 'Nov 2015', description: 'Evento 2015' },
        { year: 2015, stage: 'Después', label: 'Dic 2015', description: 'Post-Evento 2015' },

        // --- Año 2016 ---
        { year: 2016, stage: 'Antes', label: 'Sept 2016', description: 'Pre-Evento 2016' },
        { year: 2016, stage: 'Durante', label: 'Oct 2016', description: 'Evento 2016' },
        { year: 2016, stage: 'Después', label: 'Nov 2016', description: 'Post-Evento 2016' },
        
        // --- Año 2017 ---
        { year: 2017, stage: 'Antes', label: 'Sept 2017', description: 'Pre-Evento 2017' },
        { year: 2017, stage: 'Durante', label: 'Oct 2017', description: 'Evento 2017' },
        { year: 2017, stage: 'Después', label: 'Nov 2017', description: 'Post-Evento 2017' },

        // --- Año 2018 ---
        { year: 2018, stage: 'Antes', label: 'Sept 2018', description: 'Pre-Evento 2018' },
        { year: 2018, stage: 'Durante', label: 'Oct 2018', description: 'Evento 2018' },
        { year: 2018, stage: 'Después', label: 'Nov 2018', description: 'Post-Evento 2018' },

        // --- Año 2019 ---
        { year: 2019, stage: 'Antes', label: 'Jul 2019', description: 'Pre-Evento 2019' },
        { year: 2019, stage: 'Durante', label: 'Oct-Nov 2019', description: 'Evento 2019' },
        { year: 2019, stage: 'Después', label: 'Dic 2019', description: 'Post-Evento 2019' },
        
        // --- Año 2020 ---
        { year: 2020, stage: 'Antes', label: 'Sept 2020', description: 'Pre-Inundación' },
        { year: 2020, stage: 'Durante', label: 'Oct-Nov 2020', description: 'Inundación Grave' },
        { year: 2020, stage: 'Después', label: 'Dic 2020', description: 'Post-Inundación' },

        // --- Año 2021 ---
        { year: 2021, stage: 'Antes', label: 'Oct 2021', description: 'Pre-Evento 2021' },
        { year: 2021, stage: 'Durante', label: 'Nov 2021', description: 'Evento 2021' },
        { year: 2021, stage: 'Después', label: 'Dic 2021', description: 'Post-Evento 2021' },
        
        // --- Año 2022 ---
        { year: 2022, stage: 'Antes', label: 'Sept 2022', description: 'Pre-Evento 2022' },
        { year: 2022, stage: 'Durante', label: 'Oct 2022', description: 'Evento 2022' },
        { year: 2022, stage: 'Después', label: 'Nov 2022', description: 'Post-Evento 2022' },

        // --- Año 2023 ---
        { year: 2023, stage: 'Antes', label: 'Oct 2023', description: 'Pre-Evento 2023' },
        { year: 2023, stage: 'Durante', label: 'Nov-Dic 2023', description: 'Evento 2023' },
        { year: 2023, stage: 'Después', label: 'Ene 2024', description: 'Post-Evento 2023' },

        // --- Año 2024 ---
        { year: 2024, stage: 'Antes', label: 'Sept 2024', description: 'Pre-Evento 2024' },
        { year: 2024, stage: 'Durante', label: 'Oct 2024', description: 'Evento 2024' },
        { year: 2024, stage: 'Después', label: 'Nov 2024', description: 'Post-Evento 2024' },

        // --- Año 2025 ---
        { year: 2025, stage: 'Antes', label: 'Sept 2025', description: 'Pre-Evento 2025' },
        { year: 2025, stage: 'Durante', label: 'Oct 2025', description: 'Evento 2025' },
        { year: 2025, stage: 'Después', label: 'Nov 2025', description: 'Post-Evento 2025' },
    ];

    const AREA_TABASCO_KM2 = 24738;
    let availableEvents = [];
    const state = {
        currentEventId: '2020-Durante', opacity: 0.75, is3D: true, isBorderVisible: true, areLabelsVisible: true, waterColor: '#22d3ee', mapStyle: 'satellite-streets-v12',
    };
    
    const dom = {
        welcomeScreen: document.getElementById('welcome-screen'), mapApp: document.getElementById('map-app'), enterAppBtn: document.getElementById('enter-app-btn'), homeLink: document.getElementById('home-link'), opacitySlider: document.getElementById('opacity-slider'), opacityValue: document.getElementById('opacity-value'), toggle3DBtn: document.getElementById('toggle-3d-btn'), timelineContainer: document.getElementById('timeline'), chartPanel: document.getElementById('chart-panel'), chartLabel: document.getElementById('chart-label'), infoPanel: document.getElementById('info-panel'), infoTitle: document.getElementById('info-title'), infoArea: document.getElementById('info-area'), infoPercentage: document.getElementById('info-percentage'), infoVolume: document.getElementById('info-volume'), infoPolygons: document.getElementById('info-polygons'), loadingIndicator: document.getElementById('loading-indicator'), mapStyleControls: document.getElementById('map-style-controls'), waterColorControls: document.getElementById('water-color-controls'), toggleBorderBtn: document.getElementById('toggle-border-btn'), toggleLabelsBtn: document.getElementById('toggle-labels-btn')
    };
    let map, dashboardChart, isTransitioning = false;

    const initializeApp = async () => {
        await findAvailableData();
        if (availableEvents.length === 0) { alert("No se encontraron archivos de datos en /data/."); return; }
        
        dom.enterAppBtn.addEventListener('click', () => {
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
            style: `mapbox://styles/mapbox/${state.mapStyle}`,
            center: [-92.93, 17.84], // <-- INICIA DIRECTO EN TABASCO
            zoom: 8.5,
            pitch: 45, // <-- VISTA 3D INICIAL SUTIL
            bearing: -17.6,
            antialias: true,
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
        dom.toggle3DBtn.addEventListener('click', () => { state.is3D = !state.is3D; if (state.is3D) { map.setTerrain({ source: 'mapbox-dem', exaggeration: 2.5 }); map.easeTo({ pitch: 45, duration: 1000 }); dom.toggle3DBtn.textContent = 'Cambiar a Vista 2D'; } else { map.easeTo({ pitch: 0, bearing: 0, duration: 1000 }); dom.toggle3DBtn.textContent = 'Cambiar a Vista 3D'; setTimeout(() => map.setTerrain(null), 1000); } });
        
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
    
    const updateInfoPanel = async (event) => {
        dom.loadingIndicator.classList.remove('hidden');
        dom.infoPanel.classList.add('hidden');
        const path = `data/Agua_${event.stage}_Tabasco_${event.year}.geojson`;
        try {
            const response = await fetch(path);
            const geojson = await response.json();
            const areaKm2 = turf.area(geojson) / 1e6;
            const volumeMegaM3 = (areaKm2 * 1e6 * 0.5) / 1e6;
            const percentageAffected = (areaKm2 / AREA_TABASCO_KM2) * 100;
            dom.infoArea.textContent = `${areaKm2.toLocaleString('es-MX',{maximumFractionDigits:2})} km²`;
            dom.infoPercentage.textContent = `${percentageAffected.toFixed(2)} %`;
            dom.infoVolume.textContent = `${volumeMegaM3.toLocaleString('es-MX',{maximumFractionDigits:2})} M m³`;
            dom.infoPolygons.textContent = geojson.features.length.toLocaleString('es-MX');
            dom.infoTitle.textContent = `${event.description} (${event.label})`;
            dom.infoPanel.classList.remove('hidden');
        } catch (error) { dom.infoPanel.classList.add('hidden'); }
        finally { dom.loadingIndicator.classList.add('hidden'); }
    };
    
    const updateChartForYear = async (year) => {
        dom.chartLabel.textContent = `Resumen del Evento ${year}`;
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
            label: 'Área Inundada', data: data, backgroundColor: `${state.waterColor}99`, borderColor: state.waterColor,
            borderWidth: 1, borderRadius: 4,
        };
        dashboardChart.update();
    };

    const updateActiveButtons = () => {
        document.querySelectorAll('.timeline-point').forEach(p => p.classList.toggle('active', p.dataset.eventId === state.currentEventId));
        document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === state.mapStyle));
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === state.waterColor));
        dom.toggleBorderBtn.textContent = state.isBorderVisible ? 'Ocultar Borde' : 'Mostrar Borde';
        dom.toggleBorderBtn.classList.toggle('active', state.isBorderVisible);
        dom.toggleLabelsBtn.textContent = state.areLabelsVisible ? 'Ocultar Etiquetas' : 'Mostrar Etiquetas';
        dom.toggleLabelsBtn.classList.toggle('active', !state.areLabelsVisible);
    };

    initializeApp();
});