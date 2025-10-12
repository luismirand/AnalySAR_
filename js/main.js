document.addEventListener('DOMContentLoaded', async () => {
  if (typeof MAPBOX_TOKEN === 'undefined' || MAPBOX_TOKEN === "") {
    alert("Mapbox token is not defined. Please ensure your 'config.js' file exists and is loaded correctly.");
    return;
  }
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const AREA_TABASCO_KM2 = 24738;
  const isMobile = () => window.innerWidth <= 860;

  const stageToFile = (stage) => stage?.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const dataPath = (stage, year) => `data/Agua_${stageToFile(stage)}_Tabasco_${year}.geojson`;

  const severityOf = (km2) => {
    if (km2 > 3000) return { name:'Catastrophic', color:'#ef4444' };
    if (km2 > 1500) return { name:'Major',        color:'#f97316' };
    if (km2 > 500)  return { name:'Moderate',     color:'#facc15' };
    if (km2 > 0)    return { name:'Minor',        color:'#22c55e' };
    return { name:'N/A', color:'#6b7280' };
  };

  const POTENTIAL_EVENTS = [
    { year:2014, stage:'Antes',   stage_en:'Before',  label:'Sep 2014',     description:'2014 Pre-Event' },
    { year:2014, stage:'Durante', stage_en:'During',  label:'Oct 2014',     description:'2014 Event' },
    { year:2014, stage:'Después', stage_en:'After',   label:'Nov 2014',     description:'2014 Post-Event' },
    { year:2015, stage:'Antes',   stage_en:'Before',  label:'Oct 2015',     description:'2015 Pre-Event' },
    { year:2015, stage:'Durante', stage_en:'During',  label:'Nov 2015',     description:'2015 Event' },
    { year:2015, stage:'Después', stage_en:'After',   label:'Dec 2015',     description:'2015 Post-Event' },
    { year:2016, stage:'Antes',   stage_en:'Before',  label:'Sep 2016',     description:'2016 Pre-Event' },
    { year:2016, stage:'Durante', stage_en:'During',  label:'Oct 2016',     description:'2016 Event' },
    { year:2016, stage:'Después', stage_en:'After',   label:'Nov 2016',     description:'2016 Post-Event' },
    { year:2017, stage:'Antes',   stage_en:'Before',  label:'Sep 2017',     description:'2017 Pre-Event' },
    { year:2017, stage:'Durante', stage_en:'During',  label:'Oct 2017',     description:'2017 Event' },
    { year:2017, stage:'Después', stage_en:'After',   label:'Nov 2017',     description:'2017 Post-Event' },
    { year:2018, stage:'Antes',   stage_en:'Before',  label:'Sep 2018',     description:'2018 Pre-Event' },
    { year:2018, stage:'Durante', stage_en:'During',  label:'Oct 2018',     description:'2018 Event' },
    { year:2018, stage:'Después', stage_en:'After',   label:'Nov 2018',     description:'2018 Post-Event' },
    { year:2019, stage:'Antes',   stage_en:'Before',  label:'Jul 2019',     description:'2019 Pre-Event' },
    { year:2019, stage:'Durante', stage_en:'During',  label:'Oct-Nov 2019', description:'2019 Event' },
    { year:2019, stage:'Después', stage_en:'After',   label:'Dec 2019',     description:'2019 Post-Event' },
    { year:2020, stage:'Antes',   stage_en:'Before',  label:'Sep 2020',     description:'Pre-Flood' },
    { year:2020, stage:'Durante', stage_en:'During',  label:'Oct-Nov 2020', description:'Major Flood' },
    { year:2020, stage:'Después', stage_en:'After',   label:'Dec 2020',     description:'Post-Flood' },
    { year:2021, stage:'Antes',   stage_en:'Before',  label:'Oct 2021',     description:'2021 Pre-Event' },
    { year:2021, stage:'Durante', stage_en:'During',  label:'Nov 2021',     description:'2021 Event' },
    { year:2021, stage:'Después', stage_en:'After',   label:'Dec 2021',     description:'2021 Post-Event' },
    { year:2022, stage:'Antes',   stage_en:'Before',  label:'Sep 2022',     description:'2022 Pre-Event' },
    { year:2022, stage:'Durante', stage_en:'During',  label:'Oct 2022',     description:'2022 Event' },
    { year:2022, stage:'Después', stage_en:'After',   label:'Nov 2022',     description:'2022 Post-Event' },
    { year:2023, stage:'Antes',   stage_en:'Before',  label:'Oct 2023',     description:'2023 Pre-Event' },
    { year:2023, stage:'Durante', stage_en:'During',  label:'Nov-Dec 2023', description:'2023 Event' },
    { year:2023, stage:'Después', stage_en:'After',   label:'Jan 2024',     description:'2023 Post-Event' },
    { year:2024, stage:'Antes',   stage_en:'Before',  label:'Sep 2024',     description:'2024 Pre-Event' },
    { year:2024, stage:'Durante', stage_en:'During',  label:'Oct 2024',     description:'2024 Event' },
    { year:2024, stage:'Después', stage_en:'After',   label:'Nov 2024',     description:'2024 Post-Event' },
    { year:2025, stage:'Antes',   stage_en:'Before',  label:'Sep 2025',     description:'2025 Pre-Event' },
    { year:2025, stage:'Durante', stage_en:'During',  label:'Oct 2025',     description:'2025 Event' },
    { year:2025, stage:'Después', stage_en:'After',   label:'Nov 2025',     description:'2025 Post-Event' },
  ];

  // --- Estado/UI ---
  const state = {
    currentEventId: '2020-Durante',
    opacity: 1,
    is3D: true,
    isBorderVisible: true,
    areLabelsVisible: true,
    waterColor: '#22d3ee',
    mapStyle: 'satellite-streets-v12'
  };

  const $ = (id) => document.getElementById(id);
  const dom = {
    welcomeScreen: $('welcome-screen'),
    mapApp: $('map-app'),
    enterAppBtn: $('enter-app-btn'),

    leftContainer: $('left-sidebar-container'),
    infoTitle: $('info-title'),
    infoArea: $('info-area'),
    infoPercentage: $('info-percentage'),
    infoVolume: $('info-volume'),
    infoPolygons: $('info-polygons'),
    infoSeverity: $('info-severity'),
    chartLabel: $('chart-label'),
    closeLeft: $('close-left'),

    rightContainer: $('dashboard-panel'),
    mapStyleControls: $('map-style-controls'),
    waterColorControls: $('water-color-controls'),
    opacitySlider: $('opacity-slider'),
    opacityValue: $('opacity-value'),
    toggle3DBtn: $('toggle-3d-btn'),
    toggleBorderBtn: $('toggle-border-btn'),
    toggleLabelsBtn: $('toggle-labels-btn'),
    closeRight: $('close-right'),

    kebabLeft: $('kebab-left'),
    kebabRight: $('kebab-right'),
    overlay: $('sidebar-overlay'),
    homeLink: $('home-link'),

    timelineWrapper: $('timeline'),
    timelineLeftBtn: $('timeline-left-btn'),
    timelineRightBtn: $('timeline-right-btn'),
    floatingNav: $('floating-nav'),
    timelineContainer: $('timeline-container'),
  };

  let map, chart;
  let availableEvents = [];

  function updateSafeAreas(){
    const root = document.documentElement.style;
    const navH = dom.floatingNav?.offsetHeight ?? 60;
    const tlH  = dom.timelineContainer?.offsetHeight ?? 88;
    // sumamos un margen extra para respiración
    root.setProperty('--nav-h', `${navH}px`);
    root.setProperty('--timeline-h', `${tlH + 6}px`);
    root.setProperty('--safe-gap', '14px');
  }

  const initializeApp = async () => {
    await discoverData();
    if (!availableEvents.length) { alert("No data files found in /data/ folder."); return; }
    dom.enterAppBtn.addEventListener('click', () => {
      document.body.classList.add('map-active');
      dom.welcomeScreen.classList.add('hidden');
      dom.mapApp.classList.remove('hidden');
      startApp();
    });
  };

  const startApp = () => {
    // paneles visibles de inicio y kebabs ocultos (para que no tapen la X)
    dom.leftContainer.classList.remove('collapsed');
    dom.rightContainer.classList.remove('collapsed');
    dom.kebabLeft.classList.add('hidden');
    dom.kebabRight.classList.add('hidden');
    hideOverlay();

    dom.opacitySlider.value = state.opacity;
    dom.opacityValue.textContent = Math.round(state.opacity*100);

    updateSafeAreas();
    mapInit();
    buildTimeline();
    initChart();
    bindUI();
    refreshUI();
  };

  // --- Descubre archivos disponibles ---
  async function discoverData(){
    const checks = POTENTIAL_EVENTS.map(async (e) => {
      const path = dataPath(e.stage, e.year);
      try{
        const res = await fetch(path);
        if(!res.ok) return null;
        const geojson = await res.json();
        const areaKm2 = turf.area(geojson) / 1e6;
        return { ...e, id:`${e.year}-${e.stage}`, area:areaKm2, severity:severityOf(areaKm2) };
      }catch{ return null; }
    });
    availableEvents = (await Promise.all(checks)).filter(Boolean);
  }

  // --- Mapbox ---
  function mapInit(){
    map = new mapboxgl.Map({
      container:'map-container',
      style:`mapbox://styles/mapbox/${state.mapStyle}`,
      center:[-92.93,17.84], zoom:8.5, pitch:45, bearing:-17.6, antialias:true
    });
    map.on('load', () => { addLayers(); refreshUI(); });
    map.on('style.load', () => {
      if (map.getSource('mapbox-dem') && map.getSource('agua-source')) return;
      addLayers();
    });
  }

  function addLayers(){
    if (state.mapStyle.includes('satellite') && map.getLayer('satellite')) {
      map.setPaintProperty('satellite','raster-saturation',-0.7);
      map.setPaintProperty('satellite','raster-contrast',-0.2);
    }
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', { type:'raster-dem', url:'mapbox://mapbox.mapbox-terrain-dem-v1' });
    }
    if (state.is3D) map.setTerrain({ source:'mapbox-dem', exaggeration:2.5 });

    const ev = availableEvents.find(e => e.id === state.currentEventId);
    const path = ev ? dataPath(ev.stage, ev.year) : {type:'FeatureCollection',features:[]};

    if (!map.getSource('agua-source')) {
      map.addSource('agua-source', { type:'geojson', data:path });
    } else {
      map.getSource('agua-source').setData(path);
    }

    if (!map.getLayer('agua-fill-layer')) {
      map.addLayer({
        id:'agua-fill-layer', type:'fill-extrusion', source:'agua-source',
        paint:{
          'fill-extrusion-color': state.waterColor,
          'fill-extrusion-height': 500,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': state.opacity
        }
      });
    }
    if (!map.getSource('tabasco-border')) {
      map.addSource('tabasco-border', { type:'geojson', data:'data/tabasco-boundary.geojson' });
    }
    if (!map.getLayer('tabasco-border-layer')) {
      map.addLayer({
        id:'tabasco-border-layer', type:'line', source:'tabasco-border',
        layout:{ visibility: state.isBorderVisible ? 'visible' : 'none' },
        paint:{ 'line-color':'#ffffff', 'line-width':1.5, 'line-dasharray':[2,2] }
      });
    }
    toggleLabels(state.areLabelsVisible);
  }

  const toggleLabels = (visible) => {
    if (!map.isStyleLoaded()) return;
    const v = visible ? 'visible' : 'none';
    map.getStyle().layers.forEach(l => { if (l.type === 'symbol') map.setLayoutProperty(l.id,'visibility',v); });
  };

  // --- Timeline ---
  function buildTimeline(){
    dom.timelineWrapper.innerHTML = '<div class="timeline-line"></div>';
    availableEvents.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'timeline-point'; btn.dataset.eventId = e.id;
      btn.innerHTML = `
        <div class="dot"></div>
        <div class="event-description">${e.description}</div>
        <div class="event-label">${e.label}</div>`;
      if (e.stage === 'Durante') btn.querySelector('.dot').style.borderColor = e.severity.color;
      btn.addEventListener('click', () => goToEvent(e.id));
      dom.timelineWrapper.appendChild(btn);
    });

    requestAnimationFrame(updateSafeAreas);
  }

  function goToEvent(id){
    if (state.currentEventId === id) return;
    state.currentEventId = id;
    const ev = availableEvents.find(e => e.id === id);
    if (map.getSource('agua-source')) {
      map.getSource('agua-source').setData(dataPath(ev.stage, ev.year));
    }
    refreshUI();
  }

  // --- Chart ---
  function initChart(){
    const ctx = document.getElementById('dashboard-chart').getContext('2d');
    chart = new Chart(ctx,{
      type:'bar',
      data:{ labels:[], datasets:[{ data:[] }] },
      options:{
        responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
        scales:{
          x:{ ticks:{ color:'#e2e8f0' }, grid:{ color:'rgba(255,255,255,.08)' } },
          y:{ ticks:{ color:'#e2e8f0', callback:v=>`${v} km²` }, grid:{ color:'rgba(255,255,255,.08)' } }
        }
      }
    });
  }

  function refreshUI(){
    // botones activos
    document.querySelectorAll('.timeline-point').forEach(p => p.classList.toggle('active', p.dataset.eventId === state.currentEventId));
    document.querySelectorAll('.style-btn').forEach(b => b.classList.toggle('active', b.dataset.style === state.mapStyle));
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === state.waterColor));
    dom.toggleBorderBtn.textContent = state.isBorderVisible ? 'Hide Border' : 'Show Border';
    dom.toggleLabelsBtn.textContent = state.areLabelsVisible ? 'Hide Labels' : 'Show Labels';
    dom.toggle3DBtn.textContent = state.is3D ? 'Disable 3D View' : 'Enable 3D View';
    dom.opacityValue.textContent = Math.round(state.opacity*100);

    // info + chart
    const ev = availableEvents.find(e => e.id === state.currentEventId);
    if (!ev) return;
    const volumeMm3 = (ev.area * 1e6 * 0.5) / 1e6;
    const pct = (ev.area / AREA_TABASCO_KM2) * 100;
    dom.infoTitle.textContent = `${ev.description} (${ev.label})`;
    dom.infoSeverity.textContent = ev.severity.name;
    dom.infoSeverity.style.color = ev.severity.color;
    dom.infoArea.textContent = `${ev.area.toLocaleString('en-US',{maximumFractionDigits:2})} km²`;
    dom.infoPercentage.textContent = `${pct.toFixed(2)} %`;
    dom.infoVolume.textContent = `${volumeMm3.toLocaleString('en-US',{maximumFractionDigits:2})} M m³`;
    fetch(dataPath(ev.stage, ev.year))
      .then(r => r.json()).then(g => dom.infoPolygons.textContent = (g.features?.length || 0).toLocaleString('en-US'))
      .catch(()=> dom.infoPolygons.textContent = '—');

    // chart por año (orden Antes/Durante/Después)
    const order = ["Antes","Durante","Después"].map(stageToFile);
    const sameYear = availableEvents.filter(e => e.year === ev.year)
      .sort((a,b) => order.indexOf(stageToFile(a.stage)) - order.indexOf(stageToFile(b.stage)));
    chart.data.labels = sameYear.map(e => `${e.stage_en} (${e.label})`);
    chart.data.datasets[0] = {
      label:'Flooded Area',
      data: sameYear.map(e => Math.round(e.area)),
      backgroundColor: `${state.waterColor}99`,
      borderColor: state.waterColor,
      borderWidth:1,
      borderRadius:4
    };
    chart.update();
  }

  // ===== helpers overlay/aria/kebabs =====
  function showOverlay(){ if(isMobile()) dom.overlay.classList.remove('hidden'); }
  function hideOverlay(){ dom.overlay.classList.add('hidden'); }

  // abrir/cerrar con gestión de overlay + kebabs
  function expandLeft(withOverlay){
    dom.leftContainer.classList.remove('collapsed');
    dom.kebabLeft.classList.add('hidden');     // evita solape con la “X”
    if(withOverlay) showOverlay();
  }
  function expandRight(withOverlay){
    dom.rightContainer.classList.remove('collapsed');
    dom.kebabRight.classList.add('hidden');
    if(withOverlay) showOverlay();
  }
  function collapseLeft(withOverlay){
    dom.leftContainer.classList.add('collapsed');
    dom.kebabLeft.classList.remove('hidden');  // vuelve a aparecer
    if(withOverlay && isMobile() && dom.rightContainer.classList.contains('collapsed')) hideOverlay();
  }
  function collapseRight(withOverlay){
    dom.rightContainer.classList.add('collapsed');
    dom.kebabRight.classList.remove('hidden');
    if(withOverlay && isMobile() && dom.leftContainer.classList.contains('collapsed')) hideOverlay();
  }

  // --- UI bindings ---
  function bindUI(){
    $('home-link')?.addEventListener('click', (e)=>{e.preventDefault();window.location.reload();});

    dom.opacitySlider.addEventListener('input', e => {
      state.opacity = parseFloat(e.target.value);
      dom.opacityValue.textContent = Math.round(state.opacity*100);
      if (map.getLayer('agua-fill-layer')) map.setPaintProperty('agua-fill-layer','fill-extrusion-opacity',state.opacity);
    });

    dom.toggle3DBtn.addEventListener('click', () => {
      state.is3D = !state.is3D;
      if (state.is3D){
        map.setTerrain({ source:'mapbox-dem', exaggeration:2.5 });
        map.easeTo({ pitch:45, bearing:-17.6, duration:800 });
      }else{
        map.easeTo({ pitch:0, bearing:0, duration:800 });
        setTimeout(()=> map.setTerrain(null), 820);
      }
      refreshUI();
    });

    dom.mapStyleControls.addEventListener('click', (e) => {
      const btn = e.target.closest('.style-btn'); if(!btn || btn.classList.contains('active')) return;
      state.mapStyle = btn.dataset.style;
      map.setStyle(`mapbox://styles/mapbox/${state.mapStyle}`);
      refreshUI();
    });

    dom.waterColorControls.addEventListener('click', (e) => {
      const sw = e.target.closest('.color-swatch'); if(!sw) return;
      state.waterColor = sw.dataset.color;
      if (map.getLayer('agua-fill-layer')) map.setPaintProperty('agua-fill-layer','fill-extrusion-color',state.waterColor);
      chart.data.datasets[0].backgroundColor = `${state.waterColor}99`;
      chart.data.datasets[0].borderColor = state.waterColor;
      chart.update();
      refreshUI();
    });

    dom.toggleBorderBtn.addEventListener('click', () => {
      state.isBorderVisible = !state.isBorderVisible;
      map.setLayoutProperty('tabasco-border-layer','visibility', state.isBorderVisible ? 'visible' : 'none');
      refreshUI();
    });

    dom.toggleLabelsBtn.addEventListener('click', () => {
      state.areLabelsVisible = !state.areLabelsVisible;
      toggleLabels(state.areLabelsVisible);
      refreshUI();
    });

    // Botones X
    dom.closeLeft.addEventListener('click', () => collapseLeft(true));
    dom.closeRight.addEventListener('click', () => collapseRight(true));

    // KEBABS
    dom.kebabLeft.addEventListener('click', () => {
      const isOpen = !dom.leftContainer.classList.contains('collapsed');
      if (isOpen) collapseLeft(true); else expandLeft(true);
    });
    dom.kebabRight.addEventListener('click', () => {
      const isOpen = !dom.rightContainer.classList.contains('collapsed');
      if (isOpen) collapseRight(true); else expandRight(true);
    });

    // Overlay cierra todo
    dom.overlay.addEventListener('click', () => {
      collapseLeft(false); collapseRight(false); hideOverlay();
    });

    // Timeline arrows
    dom.timelineLeftBtn.addEventListener('click', ()=> dom.timelineWrapper.scrollBy({left:-320, behavior:'smooth'}));
    dom.timelineRightBtn.addEventListener('click',()=> dom.timelineWrapper.scrollBy({left:320, behavior:'smooth'}));

    window.addEventListener('keydown', (e)=>{
      if(e.key==='Escape'){
        if(!dom.leftContainer.classList.contains('collapsed')) collapseLeft(true);
        if(!dom.rightContainer.classList.contains('collapsed')) collapseRight(true);
        hideOverlay();
      }
    });

    window.addEventListener('resize', () => { 
      if(!isMobile()) hideOverlay();
      updateSafeAreas();
    });
  }

  await initializeApp();
});
