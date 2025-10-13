# AnalySAR
### Team MicroOndeados

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel)](https://analy-sar.vercel.app/)
[![NASA Space Apps 2025](https://img.shields.io/badge/NASA%20Space%20Apps-2025-blue?style=for-the-badge&logo=nasa)](https://www.spaceappschallenge.org/2025/)

This project was developed for the **NASA Space Apps Challenge 2025** under the global challenge "Through the Radar Looking Glass: Revealing Earth Processes with SAR."

---

## 1. About the Project

**AnalySAR** is a prototype designed to transform how we understand and respond to floods in Tabasco, Mexico, one of the country's most affected regions by this phenomenon.

> Floods account for nearly half of all weather-related natural disasters. In Tabasco, a low-elevation region with intense rainfall, these events are a constant threat. Traditional monitoring systems, based on optical imagery, fail when they are needed most: during storms and under cloudy skies.

To overcome this limitation, AnalySAR uses **Synthetic Aperture Radar (SAR)** from the Sentinel-1 mission. SAR technology allows us to observe the Earth's surface regardless of clouds or daylight, making it the ideal tool for hydrological analysis and disaster response.

Our goal is to democratize access to environmental intelligence by providing an intuitive web tool that not only visualizes where floods occur but also allows for the comparison of patterns before, during, and after major events, thereby improving long-term awareness of hydrological changes.

### Primary Objective

The objective of AnalySAR is to **develop an interactive platform for visualizing and quantifying flooded zones** using radar data from the Sentinel-1 mission. This platform aims to:
- Facilitate access to flood mapping for the public and researchers.
- Enable the visualization of water distribution and flood evolution across years.
- Integrate modern web visualization tools with open satellite datasets.
- Support environmental research and education through accessible technology.

---

## 2. Methodology: The Data Pipeline and the Z-Score Method

The technical core of AnalySAR is an automated pipeline in **Google Earth Engine (GEE)** that processes radar imagery to detect changes in water surfaces. Instead of using a simple, fixed threshold, we employ a statistical method known as the **Z-score** for more robust and adaptive detection.

### How Does the Z-Score Method Work?

This technique allows us to identify anomalous changes in radar backscatter that are characteristic of emerging water bodies. It is more reliable than a fixed threshold because it adapts to the specific conditions of each year.

The process follows these steps:

1.  **Image Collection:** For each year, we gather Sentinel-1 radar images (VV polarization) from two key periods:
    - **Before (October):** Represents a baseline, typically drier condition.
    - **After (Nov-Dec):** Coincides with the rainy and flood season.

2.  **Difference Calculation:** We create a difference image by subtracting the "Before" backscatter from the "After" backscatter (`Difference = After - Before`). In radar imagery, water appears very dark (low values). Therefore, an area that becomes flooded will show a large negative drop in its backscatter value.

3.  **Statistical Analysis:** Instead of just looking for pixels that got darker, we calculate the **mean (μ)** and **standard deviation (σ)** of the entire difference image over all of Tabasco.

4.  **Adaptive Threshold (Z-score):** We define a dynamic threshold based on these statistics. A pixel is classified as "flood" if its difference value `D` is significantly lower than the average change, according to the formula:
    > `D < μ - (k * σ)`
    
    Where `k` is a sensitivity factor (we use `k = 1.5`). This means we are looking for pixels whose change is 1.5 standard deviations more negative than the mean.

5.  **Mask Generation:** The result is a binary mask representing the flood extent. This mask is vectorized and exported as the "All Water" (or "Comparativo") GeoJSON file visualized on the map.

This approach ensures that only statistically significant changes are marked as floods, reducing noise and false positives.

---

## 3. Understanding the Information Panel Data

These are the metrics you see on the AnalySAR panel. Each value is calculated in real-time in your browser using **Turf.js** from the GeoJSON files generated in GEE.

| Metric | Calculated with | Unit | Main Meaning |
| :--- | :--- | :--- | :--- |
| **Area (km²)** | `turf.area()` | km² | Total surface covered by water. |
| **% Affected** | `(Area / 24,738) * 100` | % | Percentage of Tabasco's territory that is flooded. |
| **Est. Volume** | `Area * 0.5` | M m³ | Approximate total water volume (assuming an average depth). |
| **Polygons** | `features.length` | Count | The fragmentation level of the flood event. |

### Area (km²)
Represents the **total surface area covered by water**. It is the most direct measure of the flood's extent. It's calculated by summing the area of all blue polygons in the `.geojson` file and converting the result from square meters to square kilometers.

### % Affected
This percentage contextualizes the scale of the flood: `(Flooded Area / Total Area of Tabasco) * 100`. We use an approximate area for Tabasco of **24,738 km²**. This helps provide a human perspective on the event's impact.

### Estimated Volume (M m³)
This is an **approximate estimate** of the total water volume. Since satellite data is 2D, we assume a **constant average depth of 0.5 meters** for the entire flooded area. The result is displayed in millions of cubic meters (M m³).

### Polygons
This simply counts the number of separate "patches" or "islands" of water. A high number suggests a dispersed flood, while a low number indicates large, continuous bodies of water.

---

## 4. Technological Approach

The core of AnalySAR relies on open and accessible technologies:

- **Sentinel-1 SAR (ESA):** For detecting water surfaces.
- **Google Earth Engine (GEE):** For large-scale satellite image processing.
- **Mapbox GL JS:** For interactive 3D rendering in the browser.
- **Turf.js:** For client-side geospatial analysis (area and percentage calculations).
- **Chart.js:** For displaying summary statistics.

## Impact
By merging satellite radar data with web-based visualization, AnalySAR promotes environmental transparency and public awareness. It demonstrates that even small teams can build high-impact, scientifically relevant tools using open technology. The methodology can be adapted for other flood-prone areas worldwide, contributing to climate resilience.

---

## Team "MicroOndeados"
We are a multidisciplinary group of students and developers passionate about radar technology, Earth observation, and environmental resilience.
- **Luis Alberto Miranda Díaz**
- **Edson Adán López Carbajal**
- **María José Barragán Rosado**
- **Mauro Acuña Olivarría**
- **Armando Ilianov Lizárraga Duarte**
- **José Miguel Castro Cázarez**

---

## Deployment and Documentation
- **Live Deployment:** [https://analy-sar.vercel.app/](https://analy-sar.vercel.app/)
- **Full Documentation:** [Google Docs](https://docs.google.com/document/d/1WDu87pxi4sKpKesoL0GBPMWyg1R9JBwowFwL9rcU-yY/edit?usp=sharing)

---

## References
1.  *European Space Agency (ESA).* Sentinel-1 SAR GRD. [COPERNICUS_S1_GRD](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD)
2.  *Google Earth Engine.* Detecting Changes in Sentinel-1 Imagery. [Tutorial](https://developers.google.com/earth-engine/tutorials/community/detecting-changes-in-sentinel-1-imagery-pt-1?hl=en)
3.  *NASA Earthdata.* Synthetic Aperture Radar (SAR) Overview. [Backgrounder](https://earthdata.nasa.gov/learn/backgrounders/synthetic-aperture-radar)
4.  *Mapbox GL JS.* [Documentation](https://docs.mapbox.com/mapbox-gl-js/guides)
5.  *Turf.js.* [Website](https://turfjs.org/)
6.  *Chart.js.* [Website](https://www.chartjs.org/)
7.  *United Nations.* [UN Report on Weather-Related Disasters](https://www.un.org/sustainabledevelopment/blog/2015/11/un-report-finds-90-per-cent-of-disasters-are-weather-related/)

