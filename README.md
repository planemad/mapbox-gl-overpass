# mapbox-gl-overpass
A [Mapbox GL JS plugin](https://www.mapbox.com/blog/build-mapbox-gl-js-plugins/) to query data from the OpenStreetMap project via the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL).

## Usage

**When using NPM**

```bash
npm install --save mapbox-gl @mapbox/mapbox-gl-overpass
```

```javascript
const mapboxgl = require('mapbox-gl')
const MapboxOverpass = require('@mapbox/mapbox-gl-overpass');
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/traffic-night-v2',
    center: [-77.0259, 38.9010],
    zoom: 9
});
map.addControl(new MapboxOverpass());
```
