document.addEventListener('DOMContentLoaded', () => {
  if (!window.MAPBOX_TOKEN || MAPBOX_TOKEN === "") {
    alert("Mapbox token missing (config.js).");
    return;
  }
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const AREA_TABASCO_KM2 = 24738;
  const MEAN_DEPTH_M = 0.5;
  const YEARS_SCAN = { start: 2014, end: 2025 };

  const LAYER_COLORS = {
    'Antes': '#66CCFF',
    'Después': '#304FFE',
    'Comparativo': '#FF9800'
  };

  const beforePath = (y) => `data/Agua_Antes_Tabasco_${y}.geojson`;
  const afterPath  = (y) => `data/Agua_Despues_Tabasco_${y}.geojson`;
  const floodPath  = (y) => `data/Flood_Comparative_Tabasco_${y}.geojson`;
  const summaryCSV = `data/ZScore_Resumen_Tabasco_2014_2025.csv`;

  const $ = (id) => document.getElementById(id);
  const dom = {
    welcome: $('welcome-screen'),
    app: $('map-app'),
    enterBtn: $('enter-app-btn'),

    left: $('left-sidebar-container'),
    right: $('dashboard-panel'),
    overlay: $('sidebar-overlay'),

    kebabLeft: $('kebab-left'),
    kebabRight: $('kebab-right'),
    closeLeft: $('close-left'),
    closeRight: $('close-right'),

    layerPills: $('layer-pills'),
    primaryPills: $('primary-pills'),
    opacitySlider: $('opacity-slider'),
    opacityValue: $('opacity-value'),
    mapStyleControls: $('map-style-controls'),
    toggle3D: $('toggle-3d-btn'),
    toggleBorder: $('toggle-border-btn'),
    toggleLabels: $('toggle-labels-btn'),

    infoTitle: $('info-title'),
    infoArea: $('info-area'),
    infoPct: $('info-percentage'),
    infoVol: $('info-volume'),
    infoPolys: $('info-polygons'),
    infoSeverity: $('info-severity'),
    infoMeanDepth: $('info-meandepth'),
    primaryBadge: $('primary-label-badge'),

    tl: $('timeline'),
    tlLeft: $('timeline-left-btn'),
    tlRight: $('timeline-right-btn'),
  };

  const state = {
    currentYear: 2020,
    primaryStage: 'Antes',                 
    opacity: 1,
    is3D: true,
    isBorderVisible: true,
    areLabelsVisible: true,
    mapStyle: 'satellite-streets-v12',     
    dataReady: false
  };

  let map, chart;
  let availableByYear = {};
  let summariesByYear = {};

  const isMobile = () => window.innerWidth <= 860;
  const fmtKM2 = (v) => Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  function severityOf(km2){
    if (km2 > 3000) return { name:'Catastrophic', color:'#ef4444' };
    if (km2 > 1500) return { name:'Major',        color:'#f97316' };
    if (km2 > 500)  return { name:'Moderate',     color:'#facc15' };
    if (km2 > 0)    return { name:'Minor',        color:'#22c55e' };
    return { name:'N/A', color:'#6b7280' };
  }

  async function tryFetchJSON(url){
    try{
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    }catch{ return null; }
  }

  async function discoverData(){
    const years = [];
    for (let y=YEARS_SCAN.start; y<=YEARS_SCAN.end; y++){
      const entry = {};
      const a = await tryFetchJSON(beforePath(y));
      if (a) entry['Antes'] = { url: beforePath(y), geojson: a, areaKm2: a?.features?.length ? turf.area(a)/1e6 : 0, polygons: a?.features?.length || 0 };
      const d = await tryFetchJSON(afterPath(y));
      if (d) entry['Después'] = { url: afterPath(y), geojson: d, areaKm2: d?.features?.length ? turf.area(d)/1e6 : 0, polygons: d?.features?.length || 0 };
      const c = await tryFetchJSON(floodPath(y));
      if (c) entry['Comparativo'] = { url: floodPath(y), geojson: c, areaKm2: c?.features?.length ? turf.area(c)/1e6 : 0, polygons: c?.features?.length || 0 };
      if (Object.keys(entry).length){
        availableByYear[y] = entry;
        years.push(y);
      }
    }
    if (years.length && !availableByYear[state.currentYear]){
      state.currentYear = years.includes(2020) ? 2020 : Math.max(...years);
    }
  }

  async function loadSummaryCSV(){
    try{
      const txt = await (await fetch(summaryCSV)).text();
      const rows = txt.trim().split(/\r?\n/);
      const head = rows.shift().split(',');
      rows.forEach(line=>{
        const cols = line.split(',');
        const rec = Object.fromEntries(head.map((h,i)=>[h.trim(), cols[i]?.trim()]));
        const y = Number(rec.year);
        summariesByYear[y] = {
          mu: Number(rec.mu), sigma: Number(rec.sigma),
          k_value: Number(rec.k_value||rec.k||1.5),
          threshold: Number(rec.threshold),
          diff_min: Number(rec.diff_min), diff_max: Number(rec.diff_max),
          imgs_before: Number(rec.imgs_before||0), imgs_after: Number(rec.imgs_after||0)
        };
      });
    }catch{ }
  }

  function mapInit(){
    map = new mapboxgl.Map({
      container: 'map-container',
      style: `mapbox://styles/mapbox/${state.mapStyle}`,
      center: [-92.93, 17.84],
      zoom: 8.6, pitch: 45, bearing: -17.6, antialias: true
    });

    map.on('load', () => {
      if (!map.getSource('mapbox-dem')){
        map.addSource('mapbox-dem', { type:'raster-dem', url:'mapbox://mapbox.mapbox-terrain-dem-v1' });
      }
      if (state.is3D) map.setTerrain({ source:'mapbox-dem', exaggeration:2.5 });

      if (!map.getSource('tabasco-border')){
        map.addSource('tabasco-border', { type:'geojson', data:'data/tabasco-boundary.geojson' });
      }
      if (!map.getLayer('tabasco-border-layer')){
        map.addLayer({
          id:'tabasco-border-layer', type:'line', source:'tabasco-border',
          layout:{ visibility: state.isBorderVisible ? 'visible':'none' },
          paint:{ 'line-color':'#ffffff','line-width':1.5,'line-dasharray':[2,2] }
        });
      }

      addSourcesAndLayers();
      refreshInfoUI();
    });

    map.on('style.load', () => {
      if (!map.getSource('mapbox-dem')){
        map.addSource('mapbox-dem', { type:'raster-dem', url:'mapbox://mapbox.mapbox-terrain-dem-v1' });
      }
      if (state.is3D) map.setTerrain({ source:'mapbox-dem', exaggeration:2.5 });

      if (!map.getSource('tabasco-border')){
        map.addSource('tabasco-border', { type:'geojson', data:'data/tabasco-boundary.geojson' });
      }
      if (!map.getLayer('tabasco-border-layer')){
        map.addLayer({
          id:'tabasco-border-layer', type:'line', source:'tabasco-border',
          layout:{ visibility: state.isBorderVisible ? 'visible':'none' },
          paint:{ 'line-color':'#ffffff','line-width':1.5,'line-dasharray':[2,2] }
        });
      }

      addSourcesAndLayers();
      refreshInfoUI();
    });
  }

  function addOrUpdateSource(id, data){
    if (!map.getSource(id)) map.addSource(id,{ type:'geojson', data });
    else map.getSource(id).setData(data);
  }
  function addOrUpdateLayer(id, src, color){
    if (!map.getLayer(id)){
      map.addLayer({
        id, type:'fill-extrusion', source:src,
        paint:{
          'fill-extrusion-color': color,
          'fill-extrusion-height': 500,
          'fill-extrusion-opacity': state.opacity
        }
      });
    } else {
      map.setPaintProperty(id,'fill-extrusion-color', color);
      map.setPaintProperty(id,'fill-extrusion-opacity', state.opacity);
    }
  }

  function addSourcesAndLayers(){
    const y = state.currentYear;
    const empty = { type:'FeatureCollection', features:[] };
    const rec = availableByYear[y] || {};
    const gjA = rec['Antes']?.geojson || empty;
    const gjD = rec['Después']?.geojson || empty;
    const gjC = rec['Comparativo']?.geojson || empty;

    addOrUpdateSource('src-antes', gjA);
    addOrUpdateSource('src-despues', gjD);
    addOrUpdateSource('src-cmp', gjC);

    addOrUpdateLayer('lyr-antes','src-antes', LAYER_COLORS['Antes']);
    addOrUpdateLayer('lyr-despues','src-despues', LAYER_COLORS['Después']);
    addOrUpdateLayer('lyr-cmp','src-cmp', LAYER_COLORS['Comparativo']);

    // Default visibility at start: BEFORE visible, others hidden.
    map.setLayoutProperty('lyr-antes','visibility','visible');
    map.setLayoutProperty('lyr-despues','visibility','none');
    map.setLayoutProperty('lyr-cmp','visibility','none');
  }

  function toggleLabels(visible){
    if (!map?.isStyleLoaded()) return;
    const v = visible ? 'visible' : 'none';
    map.getStyle().layers.forEach(l=>{
      if (l.type === 'symbol') map.setLayoutProperty(l.id,'visibility',v);
    });
  }

  function buildTimeline(){
    dom.tl.innerHTML = '';
    const years = Object.keys(availableByYear).map(Number).sort((a,b)=>a-b);
    years.forEach(y=>{
      const btn = document.createElement('button');
      btn.className = 'timeline-point';
      btn.dataset.year = y;
      btn.innerHTML = `<div class="timeline-year">${y}</div>`;
      btn.addEventListener('click', ()=> goToYear(y));
      dom.tl.appendChild(btn);
    });
    highlightYear();
  }
  function highlightYear(){
    document.querySelectorAll('.timeline-point').forEach(b=>{
      b.classList.toggle('active', Number(b.dataset.year)===state.currentYear);
    });
  }
  function goToYear(y){
    state.currentYear = y;
    addSourcesAndLayers();
    refreshInfoUI();
    highlightYear();
  }

  function selectedStageLabel(y){
    if (state.primaryStage==='Antes') return `Oct ${y}`;
    if (state.primaryStage==='Después') return `Nov–Dec ${y}`;
    return `All Water ${y}`;
  }

  function refreshInfoUI(){
    const y = state.currentYear;
    const rec = availableByYear[y] || {};
    const aA = rec['Antes']?.areaKm2 || 0;
    const aD = rec['Después']?.areaKm2 || 0;
    const aC = rec['Comparativo']?.areaKm2 || 0;

    const byStage = { 'Antes': aA, 'Después': aD, 'Comparativo': aC };
    const areaPrimary = byStage[state.primaryStage] || 0;

    dom.infoTitle.textContent = `Tabasco, ${selectedStageLabel(y)}`;
    dom.primaryBadge.textContent = selectedStageLabel(y);
    dom.infoArea.textContent = `${fmtKM2(areaPrimary)} km²`;
    dom.infoPct.textContent = `${((areaPrimary/AREA_TABASCO_KM2)*100).toFixed(2)} %`;
    dom.infoMeanDepth.textContent = `${MEAN_DEPTH_M.toFixed(2)} m`;
    dom.infoVol.textContent = `${((areaPrimary*1e6*MEAN_DEPTH_M)/1e6).toLocaleString('en-US',{maximumFractionDigits:2})} M m³`;
    const polys =
      state.primaryStage==='Antes' ? (rec['Antes']?.polygons||0) :
      state.primaryStage==='Después'? (rec['Después']?.polygons||0) :
      (rec['Comparativo']?.polygons||0);
    dom.infoPolys.textContent = (polys||0).toLocaleString('en-US');

    const sev = severityOf(areaPrimary);
    dom.infoSeverity.textContent = sev.name;
    dom.infoSeverity.style.color = sev.color;

    ensureChart();
    chart.data.labels = [`Oct ${y}`, `Nov–Dec ${y}`, `All Water ${y}`];
    chart.data.datasets[0] = {
      data: [Math.round(aA), Math.round(aD), Math.round(aC)],
      backgroundColor:[`${LAYER_COLORS['Antes']}99`, `${LAYER_COLORS['Después']}99`, `${LAYER_COLORS['Comparativo']}99`],
      borderColor:[LAYER_COLORS['Antes'], LAYER_COLORS['Después'], LAYER_COLORS['Comparativo']],
      borderWidth:1, borderRadius:4
    };
    chart.update();

    // Z-score fields (prefetched from CSV)
    const s = summariesByYear[y] || {};
    const put = (id, val, unit='') => {
      const el = $(id); if (!el) return;
      if (val===undefined || val===null || Number.isNaN(val)) { el.textContent = '—'; return; }
      el.textContent = unit ? `${val} ${unit}` : `${val}`;
    };
    put('z-mu',      (s.mu??null)?.toFixed?.(3),'dB');
    put('z-sigma',   (s.sigma??null)?.toFixed?.(3),'dB');
    put('z-k',       (s.k_value??1.5).toFixed?.(2));
    put('z-threshold',(s.threshold??null)?.toFixed?.(3),'dB');
    put('z-diffmin', (s.diff_min??null)?.toFixed?.(2),'dB');
    put('z-diffmax', (s.diff_max??null)?.toFixed?.(2),'dB');
    put('z-imgs-before', s.imgs_before);
    put('z-imgs-after',  s.imgs_after);
  }

  function ensureChart(){
    if (chart) return;
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

  // ====== Kebabs visibility helpers
  function updateKebabs(){
    const leftOpen  = !dom.left.classList.contains('collapsed');
    const rightOpen = !dom.right.classList.contains('collapsed');
    dom.kebabLeft.classList.toggle('hidden', leftOpen);
    dom.kebabRight.classList.toggle('hidden', rightOpen);
  }
  function collapse(el){ el.classList.add('collapsed'); updateKebabs(); }
  function expand(el){ el.classList.remove('collapsed'); updateKebabs(); }

  function bindUI(){
    dom.enterBtn?.addEventListener('click', (e)=>{
      e.preventDefault();
      document.body.classList.add('map-active');
      dom.welcome.classList.add('hidden');
      dom.app.classList.remove('hidden');
      ensureChart();
      refreshInfoUI();

      startMap();
      updateKebabs();
    });

    dom.primaryPills?.addEventListener('click',(e)=>{
      const btn = e.target.closest('.pill'); if(!btn) return;
      dom.primaryPills.querySelectorAll('.pill').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.primaryStage = btn.dataset.stage;
      if (btn.dataset.stage==='Antes'){
        if (map?.getLayer('lyr-antes')) map.setLayoutProperty('lyr-antes','visibility','visible');
        if (map?.getLayer('lyr-despues')) map.setLayoutProperty('lyr-despues','visibility','none');
        if (map?.getLayer('lyr-cmp')) map.setLayoutProperty('lyr-cmp','visibility','none');
      }else if (btn.dataset.stage==='Después'){
        if (map?.getLayer('lyr-antes')) map.setLayoutProperty('lyr-antes','visibility','none');
        if (map?.getLayer('lyr-despues')) map.setLayoutProperty('lyr-despues','visibility','visible');
        if (map?.getLayer('lyr-cmp')) map.setLayoutProperty('lyr-cmp','visibility','none');
      }else{
        if (map?.getLayer('lyr-antes')) map.setLayoutProperty('lyr-antes','visibility','none');
        if (map?.getLayer('lyr-despues')) map.setLayoutProperty('lyr-despues','visibility','none');
        if (map?.getLayer('lyr-cmp')) map.setLayoutProperty('lyr-cmp','visibility','visible');
      }
      refreshInfoUI();
    });

    dom.layerPills?.addEventListener('click',(e)=>{
      const btn = e.target.closest('.pill'); if(!btn) return;
      const id = btn.dataset.layer;
      btn.classList.toggle('on');
      const on = btn.classList.contains('on');
      const mapId = id === 'before' ? 'lyr-antes' : id === 'after' ? 'lyr-despues' : 'lyr-cmp';
      if (map?.getLayer(mapId)) map.setLayoutProperty(mapId,'visibility', on?'visible':'none');
    });

    dom.opacitySlider?.addEventListener('input', e=>{
      state.opacity = parseFloat(e.target.value);
      dom.opacityValue.textContent = Math.round(state.opacity*100);
      ['lyr-antes','lyr-despues','lyr-cmp'].forEach(id=>{
        if (map?.getLayer(id)) map.setPaintProperty(id,'fill-extrusion-opacity', state.opacity);
      });
    });

    dom.mapStyleControls?.addEventListener('click',(e)=>{
      const btn = e.target.closest('.style-btn'); if(!btn || btn.classList.contains('active')) return;
      dom.mapStyleControls.querySelectorAll('.style-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.mapStyle = btn.dataset.style;
      if (map) map.setStyle(`mapbox://styles/mapbox/${state.mapStyle}`);
    });

    dom.toggle3D?.addEventListener('click',()=>{
      state.is3D = !state.is3D;
      if (!map) return;
      if (state.is3D){
        if (!map.getSource('mapbox-dem')){
          map.addSource('mapbox-dem', { type:'raster-dem', url:'mapbox://mapbox.mapbox-terrain-dem-v1' });
        }
        map.setTerrain({ source:'mapbox-dem', exaggeration:2.5 });
        map.easeTo({ pitch:45, bearing:-17.6, duration:700 });
        dom.toggle3D.textContent = 'Disable 3D View';
      }else{
        map.easeTo({ pitch:0, bearing:0, duration:700 });
        setTimeout(()=> map.setTerrain(null), 720);
        dom.toggle3D.textContent = 'Enable 3D View';
      }
    });
    dom.toggleBorder?.addEventListener('click',()=>{
      state.isBorderVisible = !state.isBorderVisible;
      if (map?.getLayer('tabasco-border-layer')){
        map.setLayoutProperty('tabasco-border-layer','visibility', state.isBorderVisible?'visible':'none');
      }
      dom.toggleBorder.textContent = state.isBorderVisible ? 'Hide Border' : 'Show Border';
    });
    dom.toggleLabels?.addEventListener('click',()=>{
      state.areLabelsVisible = !state.areLabelsVisible;
      toggleLabels(state.areLabelsVisible);
      dom.toggleLabels.textContent = state.areLabelsVisible ? 'Hide Labels' : 'Show Labels';
    });

    // Panels + kebab visibility
    dom.closeLeft?.addEventListener('click',()=>{ collapse(dom.left); });
    dom.closeRight?.addEventListener('click',()=>{ collapse(dom.right); });
    dom.kebabLeft?.addEventListener('click',()=>{
      const open = !dom.left.classList.contains('collapsed');
      if (open){ collapse(dom.left); } else { expand(dom.left); }
    });
    dom.kebabRight?.addEventListener('click',()=>{
      const open = !dom.right.classList.contains('collapsed');
      if (open){ collapse(dom.right); } else { expand(dom.right); }
    });

    dom.tlLeft?.addEventListener('click',()=> dom.tl.scrollBy({left:-320, behavior:'smooth'}));
    dom.tlRight?.addEventListener('click',()=> dom.tl.scrollBy({left:320, behavior:'smooth'}));

    document.getElementById('home-link')?.addEventListener('click',(e)=>{ e.preventDefault(); window.location.reload(); });

    // Initial panel/kebab state
    if (isMobile()){
      dom.left.classList.add('collapsed');
      dom.right.classList.add('collapsed');
    } else {
      dom.left.classList.remove('collapsed');
      dom.right.classList.remove('collapsed');
    }
    updateKebabs();
  }

  async function prefetch(){
    await Promise.all([discoverData(), loadSummaryCSV()]);
    state.dataReady = true;
    buildTimeline();
  }

  function startMap(){
    mapInit();
    ensureChart();

    refreshInfoUI();
  }

  bindUI();

  prefetch();
});
