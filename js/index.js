import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import GeoJSON from 'ol/format/GeoJSON';
import Cluster from 'ol/source/Cluster';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {OSM, TileWMS, Vector as VectorSource} from 'ol/source';
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style';
import {createEmpty, getWidth, getHeight, extend} from 'ol/extent';

var dateSelect = new Date();
var intervalId = null;
var maxFeatureCount;
var vector = null;
var currentResolution = null;
var sourceFilter = null;

var calculateClusterInfo = function(resolution) {
    maxFeatureCount = 0;
    var features = vector.getSource().getFeatures();
    var feature, radius, size;
    for (var i = features.length - 1; i >= 0; --i) {
	feature = features[i];
	size = 0;
	var originalFeatures = feature.get('features');
	var extent = createEmpty();
	var j = (void 0), jj = (void 0);
	for (j = 0, jj = originalFeatures.length; j < jj; ++j) {
	    extend(extent, originalFeatures[j].getGeometry().getExtent());
	    var postcode = originalFeatures[j].get('postcode');
	    size += sourceFilter[postcode];
	}
	maxFeatureCount = Math.max(maxFeatureCount, jj);
	radius = 10; //0.25 * (getWidth(extent) + getHeight(extent)) /
            //resolution;

	feature.set('size', size);
	feature.set('radius', Math.max(10, radius/2));
    }
};

function styleFunction(feature, resolution) {
    if (resolution != currentResolution) {
	calculateClusterInfo(resolution);
	currentResolution = resolution;
    }
    var style;
    //var size = feature.get('size');
    var size = feature.get('features').length;
    return new Style({
	image: new CircleStyle({
            radius: feature.get('radius'),
            fill: new Fill({
		color: [255, 13, 33, Math.min(0.8, 0.4 + (size / maxFeatureCount))]
            })
	}),
	text: new Text({
            text: feature.get('size') + '',
            fill: new Fill({
		color: '#fff'
	    }),
            stroke: new Stroke({
		color: 'rgba(0, 0, 0, 0.6)',
		width: 3
	    })
	})
    });
}

var vector = new VectorLayer({
    source: new Cluster({
	source: new VectorSource({
	    format: new GeoJSON(),
	    url: '/geo.json'
	}),
	geometryFunction: function(feature) {
	    if(sourceFilter[feature.get('postcode')] == 0) {
		return null;
	    } else {
		return feature.getGeometry();
	    }
	},
	distance: 30
    }),
    style: styleFunction
});

var map = new Map({
    layers: [
	new TileLayer({
	    source: new OSM()
	}),
	vector
    ],
    target: 'map',
    view: new View({
	projection: 'EPSG:4326',
	center: [150, -35],
	zoom: 5
    })
});


window.onload = function () {
// Create an observer instance linked to the callback function
    const observer = new MutationObserver(function(mutationsList, observer) {
	for(let mutation of mutationsList) {
	    if (mutation.type === 'attributes') {
		sourceFilter = JSON.parse(mutation.target.getAttribute('data-json'));
		currentResolution = null;
		vector.changed();
            }
	}
    });

    // Start observing the target node for configured mutations
    observer.observe(document.getElementById('filtered_json'), {attributes: true});

    // Later, you can stop observing
    //observer.disconnect();
};
