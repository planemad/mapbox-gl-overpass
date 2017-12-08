/**
 * A [Mapbox GL JS plugin](https://www.mapbox.com/blog/build-mapbox-gl-js-plugins/) that allows you to
 * query OpenStreetMap data using the Overpass API and visualize it on your Mapbox map.
 * @constructor
 * @param {object} options - Options to configure the plugin.
*/

var QueryOverpass = require('query-overpass');

// Mapbox Overpass
// based on github.com/mapbox/mapbox-gl-traffic/blob/master/mapbox-gl-traffic.js

function MapboxOverpass(options) {
  if (!(this instanceof MapboxOverpass)) {
    throw new Error('MapboxOverpass needs to be called with the new keyword');
  }

  this.options = Object.assign({
    enabled: false,
    query: null,
    style: {
      label: '{name}',
      labelSize: 10,
      color: '#ff00ed',
      size: 5,
      opacity: 0.5,
      layers: null
    },
    showButton: true,
    QueryOverpass: {
      overpassUrl: 'https://overpass-api.de/api/interpreter',
      flatProperties: true
    }

  }, options);

  this.toggle = this.toggle.bind(this);
  this.render = this.render.bind(this);
  this._hide = this._hide.bind(this);
  this._show = this._show.bind(this);
  this._hasSource = this._hasSource.bind(this);
  this._updateMap = this._updateMap.bind(this);
  this._toggle = new pluginButton({show: this.options.showButton, onToggle: this.toggle.bind(this)});
}

MapboxOverpass.prototype.onAdd = function(map) {
  this._map = map;
  map.on('load', this.render);
  map.on('moveend', this._updateMap);
  return this._toggle.elem;
};

MapboxOverpass.prototype.onRemove = function() {
  this._map.off('load', this.render);

  var elem = this._toggle.elem;
  elem.parentNode.removeChild(elem);
  this._map = undefined;
};

/**
 * Toggle the plugin
 */
MapboxOverpass.prototype.toggle = function() {
  this.options.enabled = !this.options.enabled;
  this.render();
};

/**
 * Render the plugin elements
 */
MapboxOverpass.prototype.render = function() {

  // Add the source and style layers if not already added
  if (!this._hasSource()) {
    this._map.addSource('overpass', {
      type: 'geojson',
      data: {
        "type": "FeatureCollection",
        "features": []
      }
    });

    // Compute where to insert the additional style layers
    var roadLayers = this._map.getStyle().layers.filter(function(layer) {
      return layer['source-layer'] === 'road';
    });
    var topRoadLayer = roadLayers[roadLayers.length - 1].id;

    // Build the style layers for the data
    if (!this.options.style.layers) {
      this.options.style.layers = buildStyleLayers(this.options.style);
    }
    // Add the style layers
    var style = this._map.getStyle();
    var mapStyle = addStyleLayers(style, this.options.style.layers, topRoadLayer);
    this._map.setStyle(mapStyle);
    this._toggle._input.onkeypress = (e) => {
      // On hitting return in the query input
      if (e.key === 'Enter') {
        this.options.query = this._toggle._input.value;
        this._updateMap();
        return true;
      }
    }
  }

  // Change plugin icon based on state
  if (this.options.enabled) {
    this._show();
    this._toggle.setMapIcon();
  } else {
    this._hide();
    this._toggle.setPluginIcon();
  }

};

// Update the map view with the Overpass results
MapboxOverpass.prototype._updateMap = function() {
  if (this.options.enabled && this.options.query) {
    var bbox = this._map.getBounds();
    var data;
    var _this = this;
    var overpassQL = this._toggle._input.value.replace(/{{bbox}}/g, [bbox._sw.lat, bbox._sw.lng, bbox._ne.lat, bbox._ne.lng].join()); // Replace {{bbox}} token with map bounds
    QueryOverpass(overpassQL, function(e, geojson) {
      _this._map.getSource('overpass').setData(geojson);
    }, this.options.QueryOverpass);

  }
}

// UI controls

// Create a button element
function button() {
  var btn = document.createElement('button');
  btn.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-overpass';
  btn.type = 'button';
  btn['aria-label'] = 'Inspect';
  return btn;
}

// Create an input text box element
function textInput() {
  var ti = document.createElement('input');
  ti.id = 'overpass';
  ti.type = 'text';
  ti.placeholder = 'Overpass QL';
  ti.style.display = 'none'
  return ti;
}

// Plugin controls container
function container(button, input, show) {
  var container = document.createElement('div');
  container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
  container.appendChild(button);
  container.appendChild(input);
  if (!show) {
    container.style.display = 'none';
  }
  return container;
}

// Create the plugin control
function pluginButton(options) {
  options = Object.assign({
    show: true,
    onToggle: function() {}
  }, options);

  this._btn = button(); // Plugin toggle button
  this._btn.onclick = options.onToggle;
  this._input = textInput(); // Plugin  text input
  this.elem = container(this._btn, this._input, options.show);
}

pluginButton.prototype.setPluginIcon = function() {
  this._btn.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-overpass';
};

pluginButton.prototype.setMapIcon = function() {
  this._btn.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-map';
};

// Show layers
MapboxOverpass.prototype._show = function() {
  var style = this._map.getStyle();
  var source = /overpass/;
  style.layers.forEach(function(layer) {
    if (source.test(layer['source'])) {
      layer['layout'] = layer['layout'] || {};
      layer['layout']['visibility'] = 'visible';
    }
  });
  this._map.setStyle(style);
  this._toggle._input.style.display = 'inline';
};

// Hide layers that have the target source
MapboxOverpass.prototype._hide = function() {
  var style = this._map.getStyle();
  var source = /overpass/;
  style.layers.forEach(function(layer) {
    if (source.test(layer['source'])) {
      layer['layout'] = layer['layout'] || {};
      layer['layout']['visibility'] = 'none';
    }
  });
  this._map.setStyle(style);
  this._toggle._input.style.display = 'none';
};

// Return true if source layers has been added already on first run
MapboxOverpass.prototype._hasSource = function() {
  var style = this._map.getStyle();
  var source = /overpass/;
  return Object.keys(style.sources).filter(function(sourceName) {
    return source.test(sourceName);
  }).length > 0;
};

/**
 * Define layers
 */
function buildStyleLayers(options) {
  var styleLayers = [
    {
      'id': 'overpass fill',
      'type': 'fill',
      'source': 'overpass',
      'paint': {
        'fill-color': options.color,
        'fill-opacity': options.opacity
      },
      'filter': ["==", "$type", "Polygon"]
    }, {
      'id': 'overpass line',
      'type': 'line',
      'source': 'overpass',
      'paint': {
        'line-color': options.color,
        'line-width': options.size,
        'line-opacity': options.opacity
      }
    }, {
      'id': 'overpass circle',
      'type': 'circle',
      'source': 'overpass',
      'paint': {
        'circle-color': options.color,
        'circle-radius': options.size,
        'circle-opacity': options.opacity
      }
    }, {
      'id': 'overpass symbol',
      'type': 'symbol',
      'source': 'overpass',
      'layout': {
        'text-field': options.label,
        'text-size': options.labelSize,
        "text-font": [
          "Open Sans Semibold", "Arial Unicode MS Bold"
        ],
        'text-anchor': 'top'
      }
    }
  ];

  return styleLayers;

}

// Add style layers to the map
function addStyleLayers(style, layers, before) {
  // Replace text-field property

  for (var i = 0; i < style.layers.length; i++) {
    var layer = style.layers[i];
    if (before === layer.id) {
      var newLayers = style.layers.slice(0, i).concat(layers).concat(style.layers.slice(i));
      return Object.assign({}, style, {layers: newLayers});
    }
  }
  return style;
}

// Export plugin
module.exports = MapboxOverpass;
