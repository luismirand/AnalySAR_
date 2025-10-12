document.addEventListener('DOMContentLoaded', async () => {
  if (typeof MAPBOX_TOKEN === 'undefined' || MAPBOX_TOKEN === "") {
    alert("Mapbox token is not defined. Please ensure your 'config.js' file exists and is loaded correctly.");
    return;
  }
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const AREA_TABASCO_KM2 = 24738;
  const stageToFile = (stage) => stage?.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const dataPath = (stage, year) => `data/Agua_${stageToFile(stage)}_Tabasco_${year}.geojson`;
  const floodPath = (year) => `data/Flood_Comparative_Tabasco_${year}.geojson`;
  const isMobile = () => window.innerWidth <= 860;

  const LAYER_COLORS = {
    'Antes': '#66CCFF',        
    'Después': '#304FFE',      
    'Comparativo': '#FF9800'   
  };

  // Month labels per stage
  const stageLabelForYear = (stage, year) => {
    if (stage === 'Antes') return `Before (Oct ${year})`;
    if (stage === 'Después') return `After (Nov–Dec ${year})`;
    return `Flood (Nov–Dec ${year})`;
  };

  const severityOf = (km2) => {
    if (km2 > 3000) return { name:'Catastrophic', color:'#ef4444' };
    if (km2 > 1500) return { name:'Major',        color:'#f97316' };
    if (km2 > 500)  return { name:'Moderate',     color:'#facc15' };
    if (km2 > 0)    return { name:'Minor',        color:'#22c55e' };
    return { name:'N/A', color:'#6b7280' };
  };

  // --- App state ---
  const state = {
    currentYear: 2020,
    primaryStage: 'Comparativo',
    opacity: 1,
    is3D: true,
    isBorderVisible: true,
    areLabelsVisible: true,
    mapStyle: 'dark-v11' // default dark
  };

  const $ = (id) => document.getElementById(id);
  const dom = {
    welcomeScreen: $('welcome-screen'),
    mapApp: $('map-app'),
    enterAppBtn: $('enter-app-btn'),

    leftContainer: $('left-sidebar-container'),
    rightContainer: $('dashboard-panel'),
    closeLeft: $('close-left'),
    closeRight: $('close-right'),
    kebabLeft: $('kebab-left'),
    kebabRight: $('kebab-right'),
    overlay: $('sidebar-overlay'),

    // info
    infoTitle: $('info-title'),
    infoArea: $('info-area'),
    infoPercentage: $('info-percentage'),
    infoVolume: $('info-volume'),
    infoPolygons: $('info-polygons'),
    infoSeverity: $('info-severity'),
    primaryBadge: $('primary-label-badge'),

    // controls right
    mapStyleControls: $('map-style-controls'),
    layerBefore: $('layer-before'),
    layerAfter: $('layer-after'),
    layerComparative: $('layer-comparative'),
    opacitySlider: $('opacity-slider'),
    opacityValue: $('opacity-value'),
    toggle3DBtn: $('toggle-3d-btn'),
    toggleBorderBtn: $('toggle-border-btn'),
    toggleLabelsBtn: $('toggle-labels-btn'),

    // timeline
    timelineWrapper: $('timeline'),
    timelineLeftBtn: $('timeline-left-btn'),
    timelineRightBtn: $('timeline-right-btn'),
    timelineContainer: $('timeline-container'),

    // primary stage select
    primarySelect: $('primary-stage-select'),

    // chart
    chartLegend: $('chart-legend'),
  };

  let map, chart;
  let availableByYear = {};  
  let summariesByYear = {};  

  function updateSafeAreas(){
    const root = document.documentElement.style;
    const navH = 64;
    const tlH  = dom.timelineContainer?.offsetHeight ?? 90;
    root.setProperty('--nav-h', `${navH}px`);
    root.setProperty('--timeline-h', `${tlH}px`);
    root.setProperty('--safe-gap', '12px');
  }

  // --- Discover available data & compute area
  async function discoverData(){
    const years = [];
    for (let y=2014; y<=2025; y++){
      const files = {
        'Antes': dataPath('Antes', y),
        'Después': dataPath('Despues', y), 
        'Comparativo': floodPath(y)
      };
      const yearEntry = {};
      for (const [stage, url] of Object.entries(files)){
        try{
          const res = await fetch(url);
          if (!res.ok) { yearEntry[stage] = null; continue; }
          const gj = await res.json();
          const areaKm2 = gj?.features?.length ? (turf.area(gj)/1e6) : 0;
          yearEntry[stage] = { url, geojson: gj, areaKm2, polygons: gj?.features?.length||0 };
        }catch{ yearEntry[stage] = null; }
      }
      if (yearEntry['Antes'] || yearEntry['Después'] || yearEntry['Comparativo']){
        availableByYear[y] = yearEntry;
        years.push(y);
      }
    }
    if (years.length) state.currentYear = Math.max(...years);
  }

  // --- Load CSV summary 
  async function loadSummaryCSV(){
    try{
      const csvTxt = await (await fetch('data/ZScore_Resumen_Tabasco_2014_2025.csv')).text();
      const lines = csvTxt.trim().split(/\r?\n/);
      const headers = lines.shift().split(',');
      lines.forEach(line=>{
        const cols = line.split(',');
        const rec = Object.fromEntries(headers.map((h,i)=>[h.trim(), cols[i]!==undefined?cols[i].trim():'' ]));
        const y = Number(rec.year);
        summariesByYear[y] = {
          mu: Number(rec.mu),
          sigma: Number(rec.sigma),
          k_value: Number(rec.k_value||rec.k||1.5),
          threshold: Number(rec.threshold),
          diff_min: Number(rec.diff_min),
          diff_max: Number(rec.diff_max),
          imgs_before: Number(rec.imgs_before||rec.imgs_antes||0),
          imgs_after: Number(rec.imgs_after||rec.imgs_despues||0)
        };
      });
    }catch{  }
  }

  // --- Timeline 
  function buildTimeline(){
    dom.timelineWrapper.innerHTML = '';
    const years = Object.keys(availableByYear).map(Number).sort((a,b)=>a-b);
    years.forEach(y=>{
      const btn = document.createElement('button');
      btn.className = 'timeline-point';
      btn.dataset.year = y;
      btn.innerHTML = `<div class="timeline-year">${y}</div>`;
      btn.addEventListener('click', ()=>goToYear(y));
      dom.timelineWrapper.appendChild(btn);
    });
    highlightActiveYear();
    requestAnimationFrame(updateSafeAreas);
  }
  function highlightActiveYear(){
    document.querySelectorAll('.timeline-point').forEach(p=>{
      p.classList.toggle('active', Number(p.dataset.year)===state.currentYear);
    });
  }
  function goToYear(y){
    state.currentYear = y;
    loadYearLayers();
    refreshInfoCard();
    highlightActiveYear();
  }

  // --- Mapbox
  function mapInit(){
    map = new mapboxgl.Map({
      container:'map-container',
      style:`mapbox://styles/mapbox/${state.mapStyle}`,
      center:[-92.93,17.84], zoom:8.6, pitch:45, bearing:-17.6, antialias:true
    });
    map.on('load', () => { addLayers(); refreshInfoCard(); });
    map.on('style.load', () => { addLayers(); });
  }

  function addOrUpdateSource(id, data){
    if (!map.getSource(id)) map.addSource(id, { type:'geojson', data });
    else map.getSource(id).setData(data);
  }
  function addOrUpdateLayer(id, sourceId, color){
    if (!map.getLayer(id)) {
      map.addLayer({
        id, type:'fill-extrusion', source:sourceId,
        paint:{
          'fill-extrusion-color': color,
          'fill-extrusion-height': 500,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': state.opacity
        }
      });
    } else {
      map.setPaintProperty(id,'fill-extrusion-color', color);
      map.setPaintProperty(id,'fill-extrusion-opacity', state.opacity);
    }
  }
  function toggleLabels(visible){
    if (!map.isStyleLoaded()) return;
    const v = visible ? 'visible' : 'none';
    map.getStyle().layers.forEach(l=>{ if (l.type==='symbol') map.setLayoutProperty(l.id,'visibility',v); });
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

    // Border
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

    loadYearLayers();
  }

  async function loadYearLayers(){
    const y = state.currentYear;
    const empty = { type:'FeatureCollection', features:[] };

    const yData = availableByYear[y] || {};
    const gjA = yData['Antes']?.geojson || empty;
    const gjP = yData['Después']?.geojson || empty;
    const gjC = yData['Comparativo']?.geojson || empty;

    addOrUpdateSource('src-antes', gjA);
    addOrUpdateSource('src-despues', gjP);
    addOrUpdateSource('src-cmp', gjC);

    addOrUpdateLayer('lyr-antes', 'src-antes', LAYER_COLORS['Antes']);
    addOrUpdateLayer('lyr-despues', 'src-despues', LAYER_COLORS['Después']);
    addOrUpdateLayer('lyr-cmp', 'src-cmp', LAYER_COLORS['Comparativo']);

    // visibility from checkboxes
    map.setLayoutProperty('lyr-antes','visibility', dom.layerBefore.checked ? 'visible':'none');
    map.setLayoutProperty('lyr-despues','visibility', dom.layerAfter.checked ? 'visible':'none');
    map.setLayoutProperty('lyr-cmp','visibility', dom.layerComparative.checked ? 'visible':'none');
  }

  // --- Chart
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

  function refreshInfoCard(){
    const y = state.currentYear;
    const rec = availableByYear[y] || {};
    const aA = rec['Antes']?.areaKm2 || 0;
    const aP = rec['Después']?.areaKm2 || 0;
    const aC = rec['Comparativo']?.areaKm2 || 0;
    const polygonsPrimary =
      state.primaryStage==='Antes' ? (rec['Antes']?.polygons||0) :
      state.primaryStage==='Después'? (rec['Después']?.polygons||0) :
      (rec['Comparativo']?.polygons||0);

    const byStageArea = { 'Antes': aA, 'Después': aP, 'Comparativo': aC };
    const areaPrimary = byStageArea[state.primaryStage]||0;

    // Title with months
    dom.infoTitle.textContent = `Tabasco — ${y} (${stageLabelForYear(state.primaryStage,y)})`;
    dom.primaryBadge.textContent = stageLabelForYear(state.primaryStage, y);

    dom.infoArea.textContent = `${areaPrimary.toLocaleString('en-US',{maximumFractionDigits:2})} km²`;
    const pct = (areaPrimary / AREA_TABASCO_KM2)*100;
    dom.infoPercentage.textContent = `${pct.toFixed(2)} %`;
    dom.infoVolume.textContent = `${((areaPrimary*1e6*0.5)/1e6).toLocaleString('en-US',{maximumFractionDigits:2})} M m³`;
    dom.infoPolygons.textContent = polygonsPrimary?.toLocaleString('en-US');

    const severity = severityOf(areaPrimary);
    dom.infoSeverity.textContent = severity.name;
    dom.infoSeverity.style.color = severity.color;

    // Z-score section
    const s = summariesByYear[y];
    const put = (id, val, unit='') => {
      const el = $(id);
      if (!el) return;
      if (val===undefined || val===null || Number.isNaN(val)) { el.textContent = '—'; return; }
      el.textContent = unit ? `${val} ${unit}` : `${val}`;
    };
    if (s){
      put('z-mu', s.mu.toFixed(3), 'dB');
      put('z-sigma', s.sigma.toFixed(3), 'dB');
      put('z-k', (s.k_value||1.5).toFixed(2));
      put('z-threshold', s.threshold.toFixed(3), 'dB');
      put('z-diffmin', s.diff_min.toFixed(2), 'dB');
      put('z-diffmax', s.diff_max.toFixed(2), 'dB');
      put('z-imgs-before', s.imgs_before);
      put('z-imgs-after', s.imgs_after);
    } else {
      ['z-mu','z-sigma','z-k','z-threshold','z-diffmin','z-diffmax','z-imgs-before','z-imgs-after'].forEach(id=>$(id).textContent='—');
    }

    // Chart with explicit months
    const labels = [
      `Before (Oct ${y})`,
      `After (Nov–Dec ${y})`,
      `Flood (Nov–Dec ${y})`
    ];
    chart.data.labels = labels;
    chart.data.datasets[0] = {
      data:[Math.round(aA), Math.round(aP), Math.round(aC)],
      backgroundColor:[LAYER_COLORS['Antes']+'99', LAYER_COLORS['Después']+'99', LAYER_COLORS['Comparativo']+'99'],
      borderColor:[LAYER_COLORS['Antes'], LAYER_COLORS['Después'], LAYER_COLORS['Comparativo']],
      borderWidth:1,
      borderRadius:4
    };
    chart.update();
    dom.chartLegend.textContent = `Oct ${y} — Nov–Dec ${y}`;
  }

  // ===== helpers overlay/kebabs =====
  function showOverlay(){ if(isMobile()) dom.overlay.classList.remove('hidden'); }
  function hideOverlay(){ dom.overlay.classList.add('hidden'); }
  function collapseLeft(withOverlay){
    dom.leftContainer.classList.add('collapsed');
    dom.kebabLeft.classList.remove('hidden');
    if(withOverlay && isMobile() && dom.rightContainer.classList.contains('collapsed')) hideOverlay();
  }
  function collapseRight(withOverlay){
    dom.rightContainer.classList.add('collapsed');
    dom.kebabRight.classList.remove('hidden');
    if(withOverlay && isMobile() && dom.leftContainer.classList.contains('collapsed')) hideOverlay();
  }
  function expandLeft(withOverlay){
    dom.leftContainer.classList.remove('collapsed');
    dom.kebabLeft.classList.add('hidden');
    if(withOverlay) showOverlay();
  }
  function expandRight(withOverlay){
    dom.rightContainer.classList.remove('collapsed');
    dom.kebabRight.classList.add('hidden');
    if(withOverlay) showOverlay();
  }

  // --- UI bindings ---
  function bindUI(){
    $('home-link')?.addEventListener('click', (e)=>{e.preventDefault();window.location.reload();});

    dom.opacitySlider.value = state.opacity;
    dom.opacityValue.textContent = Math.round(state.opacity*100);
    dom.opacitySlider.addEventListener('input', e => {
      state.opacity = parseFloat(e.target.value);
      dom.opacityValue.textContent = Math.round(state.opacity*100);
      ['lyr-antes','lyr-despues','lyr-cmp'].forEach(id=>{
        if(map?.getLayer(id)) map.setPaintProperty(id,'fill-extrusion-opacity', state.opacity);
      });
    });

    dom.primarySelect.addEventListener('change', e => { state.primaryStage = e.target.value; refreshInfoCard(); });

    dom.toggle3DBtn.addEventListener('click', () => {
      state.is3D = !state.is3D;
      if (state.is3D){
        map.setTerrain({ source:'mapbox-dem', exaggeration:2.5 });
        map.easeTo({ pitch:45, bearing:-17.6, duration:800 });
        dom.toggle3DBtn.textContent = 'Disable 3D View';
      }else{
        map.easeTo({ pitch:0, bearing:0, duration:800 });
        setTimeout(()=> map.setTerrain(null), 820);
        dom.toggle3DBtn.textContent = 'Enable 3D View';
      }
    });

    dom.mapStyleControls.addEventListener('click', (e) => {
      const btn = e.target.closest('.style-btn'); if(!btn || btn.classList.contains('active')) return;
      document.querySelectorAll('.style-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.mapStyle = btn.dataset.style;
      map.setStyle(`mapbox://styles/mapbox/${state.mapStyle}`);
    });

    // Layer toggles
    dom.layerBefore.addEventListener('change', () => {
      if (map.getLayer('lyr-antes')) map.setLayoutProperty('lyr-antes','visibility', dom.layerBefore.checked?'visible':'none');
    });
    dom.layerAfter.addEventListener('change', () => {
      if (map.getLayer('lyr-despues')) map.setLayoutProperty('lyr-despues','visibility', dom.layerAfter.checked?'visible':'none');
    });
    dom.layerComparative.addEventListener('change', () => {
      if (map.getLayer('lyr-cmp')) map.setLayoutProperty('lyr-cmp','visibility', dom.layerComparative.checked?'visible':'none');
    });

    dom.toggleBorderBtn.addEventListener('click', () => {
      state.isBorderVisible = !state.isBorderVisible;
      map.setLayoutProperty('tabasco-border-layer','visibility', state.isBorderVisible ? 'visible' : 'none');
      dom.toggleBorderBtn.textContent = state.isBorderVisible ? 'Hide Border' : 'Show Border';
    });
    dom.toggleLabelsBtn.addEventListener('click', () => {
      state.areLabelsVisible = !state.areLabelsVisible;
      toggleLabels(state.areLabelsVisible);
      dom.toggleLabelsBtn.textContent = state.areLabelsVisible ? 'Hide Labels' : 'Show Labels';
    });

    // X buttons / kebabs / overlay
    dom.closeLeft.addEventListener('click', () => collapseLeft(true));
    dom.closeRight.addEventListener('click', () => collapseRight(true));
    dom.kebabLeft.addEventListener('click', () => {
      const isOpen = !dom.leftContainer.classList.contains('collapsed');
      if (isOpen) collapseLeft(true); else expandLeft(true);
    });
    dom.kebabRight.addEventListener('click', () => {
      const isOpen = !dom.rightContainer.classList.contains('collapsed');
      if (isOpen) collapseRight(true); else expandRight(true);
    });
    dom.overlay.addEventListener('click', () => { collapseLeft(false); collapseRight(false); hideOverlay(); });

    dom.timelineLeftBtn.addEventListener('click', ()=> dom.timelineWrapper.scrollBy({left:-320, behavior:'smooth'}));
    dom.timelineRightBtn.addEventListener('click',()=> dom.timelineWrapper.scrollBy({left:320, behavior:'smooth'}));

    window.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ collapseLeft(true); collapseRight(true); hideOverlay(); }});
    window.addEventListener('resize', () => { if(!isMobile()) hideOverlay(); updateSafeAreas(); });
  }

  // --- Start
  async function initializeApp(){
    await discoverData();
    await loadSummaryCSV();

    if (!Object.keys(availableByYear).length) {
      alert("No data files found in /data/ folder.");
      return;
    }
    dom.enterAppBtn.addEventListener('click', () => {
      document.body.classList.add('map-active');
      dom.welcomeScreen.classList.add('hidden');
      dom.mapApp.classList.remove('hidden');
      startApp();
    });
  }

  function startApp(){
    // Mobile: start with panels hidden
    if (isMobile()){
      dom.leftContainer.classList.add('collapsed');
      dom.rightContainer.classList.add('collapsed');
      dom.kebabLeft.classList.remove('hidden');
      dom.kebabRight.classList.remove('hidden');
    } else {
      // Desktop: show both panels
      dom.leftContainer.classList.remove('collapsed');
      dom.rightContainer.classList.remove('collapsed');
      dom.kebabLeft.classList.add('hidden');
      dom.kebabRight.classList.add('hidden');
    }
    hideOverlay();

    updateSafeAreas();
    mapInit();
    buildTimeline();
    initChart();
    bindUI();
    refreshInfoCard();
  }

  await initializeApp();
});
