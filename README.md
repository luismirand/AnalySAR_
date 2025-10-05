Document Link: https://docs.google.com/document/d/1WDu87pxi4sKpKesoL0GBPMWyg1R9JBwowFwL9rcU-yY/edit?usp=sharing

 # 1. Introduction

Flooding is one of the most frequent and devastating natural hazards in Mexico, particularly in the southeastern region of *Tabasco*, where low elevation and intense rainfall combine to cause recurring flood events. These floods not only damage infrastructure and agriculture but also threaten the safety and livelihood of local communities. Traditional monitoring systems often rely on optical satellite imagery, which becomes ineffective during cloudy or stormy conditions — precisely when flood monitoring is most needed.

To address this limitation, *AnalySAR* was developed as a prototype capable of mapping flooded areas using *Synthetic Aperture Radar (SAR)* imagery from the *Sentinel-1* satellite mission of the *European Space Agency (ESA)*. SAR technology allows continuous observation of the Earth's surface regardless of cloud cover or daylight, making it ideal for disaster response and hydrological analysis.

The project utilizes *Google Earth Engine (GEE)* to process multi-temporal Sentinel-1 datasets, applying thresholding and water detection algorithms to derive flood extent maps across different time intervals. These processed layers are then integrated into a *web-based 3D visualization system* powered by *Mapbox GL JS, **Turf.js, and **Chart.js*, providing an intuitive and interactive interface for exploring flood dynamics.

By combining open satellite data, cloud computing, and interactive visualization, AnalySAR aims to make geospatial information more accessible to decision-makers, researchers, and the general public. This tool demonstrates how spaceborne radar data can be transformed into actionable insights for environmental monitoring, risk management, and community resilience.

---

## Project Origin

AnalySAR was conceived as part of the *NASA International Space Apps Challenge, in response to global calls for open innovation and Earth observation applications. The project was initiated with the goal of making radar-based flood data accessible and visually intuitive for both researchers and citizens. The idea originated from observing the challenges faced by **southern Mexican communities* in understanding and preparing for floods, where decision-making often relies on anecdotal reports or delayed official data.

The development of AnalySAR started with *Google Earth Engine (GEE), a cloud platform capable of processing **Sentinel-1 Synthetic Aperture Radar (SAR)* data from the *European Space Agency (ESA). By leveraging GEE’s processing power, the project performs temporal analyses to map water surfaces across multiple years. The output GeoJSON layers are then integrated into a **3D web interface* created with *Mapbox GL JS, enhanced by **Turf.js* for spatial calculations (e.g., flooded area, estimated volume) and *Chart.js* for event visualization.

---

## Problem Statement

The main problem addressed by AnalySAR is the *lack of accessible, real-time geospatial information* about flood-affected areas, especially in regions with limited infrastructure or technical capacity. Local communities and small authorities often depend on post-event reports or external organizations to assess the extent of floods, delaying response and recovery efforts.

AnalySAR seeks to bridge this gap by providing a *web-based open tool* capable of mapping flood extents using *free satellite data, thus democratizing access to environmental intelligence. The system not only helps visualize **where floods occur, but also enables the comparison of flood patterns **before, during, and after* major events, enhancing long-term awareness of hydrological changes.

---

## Objective

The objective of AnalySAR is to *develop an interactive platform for visualizing and quantifying flooded zones* using radar data from the Sentinel-1 mission. This platform aims to:

- Facilitate access to flood mapping for the public and researchers  
- Enable the visualization of water distribution and flood evolution across years  
- Integrate modern web visualization tools with open satellite datasets  
- Support early-stage environmental research and education through accessible technology  

---


# Understanding the Information Panel Data 📊

These are the calculations and meanings behind each metric displayed on the *AnalySAR* information panel.  
Each value comes from automated geospatial analysis performed directly in the browser using *Turf.js* and data derived from *GeoJSON* files generated in *Google Earth Engine*.

---

## Area (km²)

*How is it calculated?*  
The geospatial analysis library *Turf.js* is used for this metric.  
The function turf.area() reads the geographic coordinates of all blue polygons that make up the flood zones in your .geojson file.  
It then sums the area of each polygon and returns a total in *square meters*.  
Finally, the code divides that value by one million to convert it into *square kilometers (km²)* — the value you see on screen.

*What does it mean?*  
This represents the *total surface area covered by water*.  
It is the most direct and precise measure of how extensive the flood was.

---

## % Affected

*How is it calculated?*  
This is a contextual percentage:  
(Flooded Area / Total Area of Tabasco) * 100  
The code uses the approximate total area of *Tabasco, which is **24,738 km²*.

*What does it mean?*  
This percentage provides a *human perspective* on the scale of flooding.  
It’s different to say “1,600 km² flooded” versus “6.61% of the state of Tabasco was underwater.”  
This makes the data easier to interpret and gives a clear idea of the flood’s impact relative to the total territory.

---

## Estimated Volume (M m³)

*How is it calculated?*  
The formula used is:  
Area (m²) * Assumed Average Depth  
The key term here is *“assumed.”*  
Since satellite data provides only 2D surface coverage and not water depth, the code assumes an *average depth of 0.5 meters* for the entire flooded area.  
The final result is displayed in *millions of cubic meters (M m³)*.

*What does it mean?*  
This is an *approximate estimate* of the total water volume.  
It’s useful to understand the magnitude of the flood, but accuracy depends directly on the assumed depth.  
In a real hydrological analysis, this depth would be derived from more complex *hydrological or topographical models*.

---

## Polygons

*How is it calculated?*  
This is the simplest calculation.  
It simply counts the number of *separate “shapes” or “patches”* of water present in the .geojson file.

*What does it mean?*  
It gives an idea of the *fragmentation of the flood event*.  
A very high number of polygons might indicate a highly dispersed flood, with many small puddles and isolated flooded zones.  
A lower number could suggest one or a few *large continuous bodies of water*, such as a temporary lake or a major river overflow.

---

## 🧩 Summary Table

| Metric | Calculated with | Unit | Main Meaning |
|---------|----------------|-------|---------------|
| *Area (km²)* | turf.area() | km² | Total surface covered by water |
| *% Affected* | (Area / 24,738) * 100 | % | Percentage of the state’s territory flooded |
| *Estimated Volume* | Area * 0.5 | M m³ | Approximate total water volume |
| *Polygons* | features.length | Count | Fragmentation or continuity level of flooding |

---

🔹 These values are updated dynamically each time you select a *year* or *stage* (“Before”, “During”, “After”) within the AnalySAR interface,  
allowing users to compare historical events and observe how water coverage

## Technological Approach

The core of AnalySAR relies on:

- *Sentinel-1 SAR imagery (Copernicus Program, ESA):* for detecting water surfaces using radar backscatter (VV polarization)  
- *Google Earth Engine (GEE):* for large-scale satellite image processing, filtering, and compositing  
- *Mapbox GL JS:* for interactive 3D rendering and real-time visualization in the browser  
- *Turf.js:* for geospatial analysis (area, perimeter, and water percentage)  
- *Chart.js:* for displaying summarized event statistics  

This combination enables a fully client-side and open-data workflow, requiring no proprietary software or paid APIs.


## Impact

By merging *satellite radar data* with *web-based visualization, AnalySAR promotes **environmental transparency and public awareness. It demonstrates that even small teams can build scientifically relevant, high-impact tools using open technology. Beyond Tabasco, the methodology can be adapted for **other flood-prone areas worldwide, contributing to **climate resilience* and *sustainable decision-making*.

---
## Deployment

https://analy-sar.vercel.app/

## References

1. *European Space Agency (ESA).* Sentinel-1 SAR GRD: C-band Synthetic Aperture Radar Ground Range Detected, log scaling.  
   [https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD)

2. *Google Earth Engine.* Guide for Sentinel-1 Data Processing and Visualization.  
   [https://developers.google.com/earth-engine/tutorials/community/sentinel-1-sar](https://developers.google.com/earth-engine/tutorials/community/sentinel-1-sar)

3. *NASA Earthdata.* Synthetic Aperture Radar (SAR) Missions Overview.  
   [https://earthdata.nasa.gov/learn/backgrounders/synthetic-aperture-radar](https://earthdata.nasa.gov/learn/backgrounders/synthetic-aperture-radar)

4. *Mapbox GL JS.* Interactive Mapping Library Documentation.  
   [https://docs.mapbox.com/mapbox-gl-js/](https://docs.mapbox.com/mapbox-gl-js/)

5. *Turf.js.* Advanced Geospatial Analysis for the Web.  
   [https://turfjs.org/](https://turfjs.org/)

6. *Chart.js.* Open-Source JavaScript Data Visualization Library.  

   [https://www.chartjs.org/](https://www.chartjs.org/)

