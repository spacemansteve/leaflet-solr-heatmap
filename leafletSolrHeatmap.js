L.SolrHeatmap = L.GeoJSON.extend({
  options: {
    solrRequestHandler: 'select',
    type: 'geojsonGrid',
    colors: ['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043'],
    popupDisplay: false,
    maxSampleSize: Number.MAX_SAFE_INTEGER,  // for Jenks classification
    nearbyFieldType: 'BBox',
    solrErrorHandler: null,
    solrSuccessHandler: null,
    solrNearbyErrorHandler: null,
    solrNearbySuccessHandler: null,
    renderCompleteHandler: null,
    popupHighlight: false,
    showGlobalResults: false
  },

  initialize: function(url, options) {
    var _this = this;
    options = L.setOptions(_this, options);
    _this._solrUrl = url;
    _this._layers = {};
    _this.timeOfLastClick = 0;
  },

  onAdd: function (passedMap) {
	    var _this = this;
  	    _this._map = passedMap;
	    _this._map.on('moveend', function() {
		    _this._clearLayers();
		    _this._getData();
		});
	    if (_this.options.popupDisplay)
		{
		    if (typeof _this.options.popupDisplay === "string")
			if (_this.options.popupDisplay.indexOf(",") > -1)
			    // easier for angular to pass in string
			    _this.options.popupDisplay = _this.options.popupDisplay.split(',');
		    _this.heatmapLayerListener =  _this._map.on('click', function(e) {
			    _this.timeOfLastClick = Date.now();
			    _this._getNearbyData(e.latlng);
		});
		}
	    _this._getData();
 	},

  onRemove: function(passedMap)
  {
      var _this = this;
      try
      {
	  passedMap.off('moveend');
	  if (_this.heatmapLayer)
	  {
	      passedMap.removeLayer(_this.heatmapLayer);
	      map.off("click"); // will this remove click handlers that it shouldn't
	  }
	  _this._clearLayers();
      }
      catch (e)
      {
	  // perhaps there was an error during initialization
	  console.log('exception in onRemove cleanup');
      }

  },

  _computeHeatmapObject: function(data) {
    var _this = this;
    _this.facetHeatmap = {},
      facetHeatmapArray = data.facet_counts.facet_heatmaps[this.options.field];

    // Convert array to an object
    $.each(facetHeatmapArray, function(index, value) {
      if ((index + 1) % 2 !== 0) {
        // Set object keys for even items
        _this.facetHeatmap[value] = '';
      }else {
        // Set object values for odd items
        _this.facetHeatmap[facetHeatmapArray[index - 1]] = value;
      }
    });

    this._computeIntArrays();
  },

  _clearLayers: function() {
    var _this = this;

    switch (_this.options.type) {
      case 'geojsonGrid':
        _this.clearLayers();
        break;
      case 'clusters':
        _this.clusterMarkers.clearLayers();
        break;
      case 'heatmap':
	  if (_this._map)
	      _this._map.removeLayer(_this.heatmapLayer);
	  break;
    }
  },

  _createGeojson: function() {
    var _this = this;
    var geojson = {};

    geojson.type = 'FeatureCollection';
    geojson.features = [];

    $.each(_this.facetHeatmap.counts_ints2D, function(row, value) {
      if (value === null) {
        return;
      }

      $.each(value, function(column, val) {
        if (val === 0) {
          return;
        }

        var newFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [_this._minLng(column), _this._minLat(row)],
                [_this._minLng(column), _this._maxLat(row)],
                [_this._maxLng(column), _this._maxLat(row)],
                [_this._maxLng(column), _this._minLat(row)],
                [_this._minLng(column), _this._minLat(row)]
              ]
            ]
          },
          properties: {
            count: val
          }
        };
        geojson.features.push(newFeature);
      });
    });

    _this.addData(geojson);
    var colors = _this.options.colors; 
    var classifications = _this._getClassifications(colors.length);
    _this._styleByCount(classifications);
    _this._setRenderTime();
  },

  _createHeatmap: function(){
    var _this = this;
    if (_this.facetHeatmap.counts_ints2D == null) return;
    var heatmapCells = [];
    var cellSize = _this._getCellSize() * 1.;
    var colors = _this.options.colors; 
    var classifications = _this._getClassifications(colors.length - 1);

    var maxValue = classifications[classifications.length - 1];
    var gradient = _this._getGradient(classifications);
    $.each(_this.facetHeatmap.counts_ints2D, function(row, value) {
      if (value === null) {
        return;
      }

      $.each(value, function(column, val) {
        if (val === 0) {
          return;
        }
	var scaledValue = Math.min((val / maxValue), 1);
	var current = [(_this._minLat(row) + _this._maxLat(row)) / 2.,
		       (_this._minLng(column) + _this._maxLng(column)) / 2., scaledValue];
	heatmapCells.push(current);
      })
    });

    // settting max due to bug
    // http://stackoverflow.com/questions/26767722/leaflet-heat-issue-with-adding-points-with-intensity
    var options = {radius: cellSize, gradient: gradient, minOpacity: .1};
    var heatmapLayer = L.heatLayer(heatmapCells, options);
    //heatmapLayer.setOptions(options);
    heatmapLayer.addTo(map);
    _this.heatmapLayer = heatmapLayer;
    _this._setRenderTime();
  },

  // heatmap display need hash of scaled counts value, color pairs
  _getGradient: function (classifications){
    var gradient = {};
    var maxValue = classifications[classifications.length - 1];
    var colors = _this.options.colors; 
    // skip first lower bound, assumed to be 0 from Jenks
    for (var i = 1 ; i < classifications.length ; i++)
	gradient[classifications[i] / maxValue] = colors[i];
    return gradient;
  },

  // compute size of heatmap cells in pixels
  _getCellSize: function(){
    _this = this;
    try
    {
	var mapSize = _this._map.getSize();  // should't we use solr returned map extent?
	var widthInPixels = mapSize.x; 
	var heightInPixels = mapSize.y;
	var heatmapRows = _this.facetHeatmap.rows;
	var heatmapColumns = _this.facetHeatmap.columns;
	var sizeX = widthInPixels / heatmapColumns;
	var sizeY = heightInPixels / heatmapRows;
	var size = Math.ceil(Math.max(sizeX, sizeY));
	return size;
    }
    catch (e)
    {
	// it is possible that there has never been a heatmap requested
	// so we can not use it to compute the size of the actual heatmap
	// return default
	return 25;
    }
},

  _setRenderTime: function() {
    var _this = this;
    _this.renderTime = Date.now() - _this.renderStart;
  },

  _createClusters: function() {
    var _this = this;

    _this.clusterMarkers = new L.MarkerClusterGroup({
      maxClusterRadius: 140
    });

    $.each(_this.facetHeatmap.counts_ints2D, function(row, value) {
      if (value === null) {
        return;
      }

      $.each(value, function(column, val) {
        if (val === 0) {
          return;
        }

        var bounds = new L.latLngBounds([
          [_this._minLat(row), _this._minLng(column)],
          [_this._maxLat(row), _this._maxLng(column)]
        ]);
        _this.clusterMarkers.addLayer(new L.Marker(bounds.getCenter(), {
          count: val
        }).bindPopup(val.toString()));
      });
    });

    _this._map.addLayer(_this.clusterMarkers);
    _this._setRenderTime();
  },

  _computeIntArrays: function() {
    var _this = this;

    _this.lengthX = (_this.facetHeatmap.maxX - _this.facetHeatmap.minX) / _this.facetHeatmap.columns;
    _this.lengthY = (_this.facetHeatmap.maxY - _this.facetHeatmap.minY) / _this.facetHeatmap.rows;

    switch (_this.options.type) {
      case 'geojsonGrid':
        _this._createGeojson();
        break;
      case 'clusters':
        _this._createClusters();
        break;
    case 'heatmap':
	_this._createHeatmap();
	break;
    }
  },

  _getClassifications: function(howMany)
  {
    var _this = this;
    var one_d_array = [];
    if (_this.facetHeatmap.counts_ints2D == null) return;
    for(var i = 0; i < _this.facetHeatmap.counts_ints2D.length; i++) {
	if (_this.facetHeatmap.counts_ints2D[i] != null)
	    one_d_array = one_d_array.concat(_this.facetHeatmap.counts_ints2D[i]);
    }
    var sampled_array = _this._sampleCounts(one_d_array);

    var series = new geostats(sampled_array);
    var scale = _this.options.colors; 
    var classifications = series.getClassJenks(howMany);
    return classifications;
  },

  _styleByCount: function(classifications) {
    var _this = this;
    var scale = _this.options.colors;

    _this.eachLayer(function(layer) {
      var color;
      $.each(classifications, function(i, val) {
        if (layer.feature.properties.count >= val) {
          color = scale[i];
        }
      });
      layer.setStyle({
        fillColor: color,
        fillOpacity: 0.5,
        weight: 0
      });
    });
  },

  // Jenks classification can be slow so we optionally sample the data
  // typically any big sample of counts are much the same, don't need to classify on all of them
  _sampleCounts: function(passedArray)
  {
      _this = this;
      if (passedArray.length <= _this.options.maxSampleSize)
	  return passedArray;   // array too small to sample
      
      var maxValue = Math.max.apply(Math, passedArray);
      var sampledArray = [];
      var period = Math.ceil(passedArray.length / _this.options.maxSampleSize);
      for (i = 0 ; i < passedArray.length ; i = i + period)
	  sampledArray.push(passedArray[i]);
      
      sampledArray.push(maxValue);  // make sure largest value gets in, doesn't matter much if duplicated
      return sampledArray
  },


  _minLng: function(column) {
    return this.facetHeatmap.minX + (this.lengthX * column);
  },

  _minLat: function(row) {
    return this.facetHeatmap.maxY - (this.lengthY * row) - this.lengthY;
  },

  _maxLng: function(column) {
    return this.facetHeatmap.minX + (this.lengthX * column) + this.lengthX;
  },

  _maxLat: function(row) {
    return this.facetHeatmap.maxY - (this.lengthY * row);
  },

  _getMetersPerPixel: function(latlng)
  {
      // based on http://stackoverflow.com/questions/27545098/leaflet-calculating-meters-per-pixel-at-zoom-level

      // convert passed location to containerpoint (pixels)
      var _this = this;
      if (_this._map == null) return;

      var pointC = _this._map.latLngToContainerPoint(latlng); 
      var pointX = [pointC.x + 1, pointC.y]; // add one pixel to x
      var pointY = [pointC.x, pointC.y + 1]; // add one pixel to y

      // convert pixel coords to latlng's
      var latLngC = _this._map.containerPointToLatLng(pointC);
      var latLngX = _this._map.containerPointToLatLng(pointX);
      var latLngY = _this._map.containerPointToLatLng(pointY);

      var distanceX = latLngC.distanceTo(latLngX); // calculate distance between c and x (latitude)
      var distanceY = latLngC.distanceTo(latLngY); // calculate distance between c and y (longitude)
      return Math.max(distanceX, distanceY);
  },

  // called on mouse clicks, sends Solr request for nearby documents
  _getNearbyData: function(latlng)
  {
      var _this = this;
      if (_this._map == null) 
	  {console.log('leafletSolrHeatmap._getNearbyData null map warning');return;}
      var pt = latlng.lat + ',' + latlng.lng;
      var metersPerPixel = _this._getMetersPerPixel(latlng);
      var cellSizePixels = _this._getCellSize();
      var cellSizeKm = (metersPerPixel * cellSizePixels) / 1000.;
      var cellSizeDegrees = cellSizeKm / 111.
      var lat = parseFloat(latlng.lat);
      var lng = parseFloat(latlng.lng);
      var nearbyField = _this.options.nearbyField;
      var nearbyFieldType = _this.options.nearbyFieldType;
      var sortField = _this.options.sortField;

      // for bbox field
      var query = '{!field f=' + nearbyField + ' score=overlapRatio}Intersects(ENVELOPE(' + 
			    (lng - cellSizeDegrees) + ',' + (lng + cellSizeDegrees) + ',' +  (lat + cellSizeDegrees) + ',' + (lat - cellSizeDegrees)
			    + '))';
      var queryHash = {q: query, rows: 20, wt: 'json'};
      if (nearbyFieldType === 'RPT')
      {
	  query = "*:*";
	  queryHash = {
	      q: query,
	      rows: 20,
	      wt: 'json',
	      fq: '{!geofilt}',
	      sfield: nearbyField,
	      d: cellSizeKm,
	      pt: pt,
	      sort: "geodist() asc"
	  };
      }
      if (sortField)
	  queryHash.sort = sortField + ' desc';
      jQuery.ajax({
	      url: _this._solrUrl + _this._solrQuery(),
		  dataType: 'JSONP',
		  data: queryHash,
		  jsonp: 'json.wrf',
		  success: function(data, textStatus, jqXHR) {
		      if (_this.options.solrNearbySuccessHandler)
			  _this.options.solrNearbySuccessHandler(data, textStatus, jqXHR);
		      _this._nearbyDataResponseHandler(data, latlng, _this);
	          },
		  error: function(jqXHR, textStatus, errorThrown) {
		      if (_this.options.solrNearbyErrorHandler)
			  _this.options.solrNearbyErrorHandler(jqXHR, textStatus, errorThrown);
      }

	  });

  },

  // displays nearby items from solr
  _nearbyDataResponseHandler: function (data, latlng, _this)
  {
      _this._createPopup(data, latlng);
  },
  
  // display solr data in popup with highighlighting
  _createPopup: function(data, latlng)
  {
      var solrResponse = data;
      var solrItems = data.response.docs;
      var lines = "";
      _this.tmpIdToSolr = {};
      if (solrItems.length == 0)
	  return;
      var limit = Math.min(20, solrItems.length);
      for (var i = 0 ; i < limit ; i++)
	  {
	      var current = solrItems[i];
	      var line = _this._popupDocFormatter(current);
	      var id = 'tempLshId' + i;
	      _this.tmpIdToSolr[id] = current;
	      line = "<div id='" + id + "'>" + line + "</div>";
	      lines += line;
	  }
      // offset the popup so it doesn't cover highlighting
      var popup = L.popup({offset: L.point(0, -20)});
      popup.setLatLng(latlng);
      popup.setContent(lines);
      popup.openOn(map);

      if (_this.options.popupHighlight)
      {
	  // div elements exist, add mouseover to highlight each one
	  for (var i = 0 ; i < limit ; i++)
	  {	  
	      var id = 'tempLshId' + i;
	      var div = jQuery('#' + id);
	      var solrRecord = _this.tmpIdToSolr[id];
	      _this._addMouse(div, id);
	  };
      }
  },

  // add mouseover and mouseout to highlight and unhighlight
  _addMouse: function(div, id)
  {
      var _this = this;
      div.mouseover(id, function(event){
	      var id = event.data;
	      var solr = _this.tmpIdToSolr[id];
	      _this._highlightDocument(id, solr);
	  });
      div.mouseout(id, function(event){
	      var id = event.data;
	      var solr = _this.tmpIdToSolr[id];
	      _this._unhighlightDocument(id, solr);
	  });
  },

  // called when the mouse out of the div for  an item on the popup of nearby things
  // undo anything highlightDocument did
  _unhighlightDocument: function(divId, solrDocument)
  {
      var _this = this;
      var div = jQuery("#" + divId);
      div.css({backgroundColor: ''});

      if (_this.highlightRectangle)
	  _this._map.removeLayer(_this.highlightRectangle);
  },

  // called when the passed div received a mouseover event
  // highlight element in div and on map
  _highlightDocument: function(divId, solrDocument)
  {
      var _this = this;
      var div = jQuery("#" + divId);
      div.css({backgroundColor: 'aliceblue'});
      var rpt = solrDocument[_this.options.field];
      if (_this.highlightRectangle)
	  _this._map.removeLayer(_this.highlightRectangle);
      if (rpt.indexOf("ENVELOPE") > -1)
      {
	  rpt = rpt.substr(rpt.indexOf('(') + 1);
	  rpt = rpt.substr(0, rpt.length - 1);
	  var coords = rpt.split(',');
	  var minX = parseFloat(coords[0]);
	  var maxX = parseFloat(coords[1]);
	  var maxY = parseFloat(coords[2]);
	  var minY = parseFloat(coords[3]);
	  var bounds = [[maxY, minX], [minY, maxX]];

	  _this.highlightRectangle = L.rectangle(bounds, {opacity: 1});
	  _this.highlightRectangle.addTo(_this._map);
	  _this.highlightRectangle.bringToFront();
      }
      else
	  console.log("can not highlight ", rpt);
  },

  // format all displayed fields in the single passed solr doucment
  // via config param, user can provide a function to format the document, 
  //  the name of a single field to display 
  //  a list of field names to display
  _popupDocFormatter: function(doc)
  {
      var _this = this;
      var popupDisplay = _this.options.popupDisplay;
      if ((typeof popupDisplay) === "function")
	  return popupDisplay(doc);

      if ((typeof popupDisplay) === "string")
	  return _this._popupFieldFormatter(doc, popupDisplay) + "<br/>";

      if (Array.isArray(popupDisplay))
	  {
	      var fullValue = "";
	      for (var i = 0 ; i < popupDisplay.length ; i++)
		  {
		      var field = popupDisplay[i];
		      if ((typeof field) === "object")
		      {
			  // if current field is an array it is ['fieldname', function(doc,fieldname){...}
			  var fieldname = field[0];
			  var passedFunction = field[1];
			  fullValue +=  passedFunction(doc, fieldname);
		      }
		      else
		      {
			  var value = _this._popupFieldFormatter(doc, field);
			  fullValue += value + ".  ";
		      }
		  }
	      return fullValue + "<br/>";
	  }
  },

  // display passed field in solr docoument
  // default ingest of json into solr wildcard fields often assumes they are multivalued
  // so we pull elements out of returned array
  _popupFieldFormatter: function(doc, field)
  {
      if (doc[field])
	  {
	      var value = doc[field];
	      if (Array.isArray(value))
		  value = value.join();
	      if (typeof value === 'string')
	      {
		  // strings that look like a url should be html links
		  var temp = value.toLowerCase();
		  if (temp.indexOf('http://') == 0 || temp.indexOf('https://') == 0)
		      value = "<a href='" + value + "'>" + value + "</a>";
	      }
	      return value;
	  }
      else
	  return "Missing " + field;
  },

  _getData: function() {
    var _this = this;
    var startTime = Date.now();
    var bounds = _this._map.getBounds();
    var q = "*:*";
    if (_this.options.nearbyField && (_this.options.nearbyFieldType == 'BBox'))
	// score layers using bbox field
	q = '{!field f=' + _this.options.nearbyField + ' score=overlapRatio}Intersects(ENVELOPE(' +
	    bounds.getWest() + ',' + bounds.getEast() + ',' + bounds.getNorth() + ',' + bounds.getSouth() + '))';
    $.ajax({
      url: _this._solrUrl + _this._solrQuery(),
      dataType: 'JSONP',
      data: {
        q: q,
        wt: 'json',
        rows: 20,
        facet: true,
        'facet.heatmap': _this.options.field,
        'facet.heatmap.geom': _this._mapViewToWkt(),
        fq: _this.options.field + _this._mapViewToEnvelope()
      },
      jsonp: 'json.wrf',
      success: function(data, textStatus, jqXHR) {
	var solrTime = Date.now() - startTime; 
	if (data.response == null)
	{
	    console.log("warning, invalid solr result"); return;
	}
        _this.docsCount = data.response.numFound;
	_this.solrTime = solrTime;

	if (_this.options.solrSuccessHandler)
	    _this.options.solrSuccessHandler(data, textStatus, jqXHR);

        _this.renderStart = Date.now();
        _this._computeHeatmapObject(data);
	if (_this.options.renderCompleteHandler)
	    _this.options.renderCompleteHandler(data, textStatus, jqXHR);
	if (_this.options.showGlobalResults && ((Date.now() - _this.timeOfLastClick) > 1000))
	{
	    var mapBounds = _this._map.getBounds();
	    var width = mapBounds.getEast() - mapBounds.getWest();
	    var height = mapBounds.getNorth() - mapBounds.getSouth();
	    var popupLocation = L.latLng(mapBounds.getSouth() + (height * 0.), mapBounds.getWest() + (width* .2));
	    _this._createPopup(data, popupLocation);
	}

      },
      error: function(jqXHR, textStatus, errorThrown) {
	if (_this.options.solrErrorHandler)
	    _this.options.solrErrorHandler(jqXHR, textStatus, errorThrown);
      }
    });
  },

  _mapViewToEnvelope: function() {
    var _this = this;
    var bounds = _this._map.getBounds();
    return ':"Intersects(ENVELOPE(' + bounds.getWest() + ', ' + bounds.getEast() + ', ' + bounds.getNorth() + ', ' + bounds.getSouth() + '))"';
  },

  _mapViewToWkt: function() {
    var _this = this;
    var bounds = _this._map.getBounds();
    return '["' + bounds.getWest() + ' ' + bounds.getSouth() + '" TO "' + bounds.getEast() + ' ' + bounds.getNorth() + '"]';
  },

  _solrQuery: function() {
    return '/' + this.options.solrRequestHandler + '?' + this.options.field;
  }
});

L.solrHeatmap = function(url, options) {
  return new L.SolrHeatmap(url, options);
};

L.LatLngBounds.prototype.getWest = function() {
  var west = this._southWest.lng;
  return west < -180 ? -180 : west;
};

L.LatLngBounds.prototype.getEast = function() {
  var east = this._northEast.lng;
  return east > 180 ? 180 : east;
};

// Check if L.MarkerCluster is included
if (typeof L.MarkerCluster !== 'undefined') {
  L.MarkerCluster.prototype.initialize = function(group, zoom, a, b) {

  	L.Marker.prototype.initialize.call(this, a ? (a._cLatLng || a.getLatLng()) : new L.LatLng(0, 0), { icon: this });

  	this._group = group;
  	this._zoom = zoom;

  	this._markers = [];
  	this._childClusters = [];
  	this._childCount = 0;
  	this._iconNeedsUpdate = true;

  	this._bounds = new L.LatLngBounds();

  	if (a) {
  		this._addChild(a);
  	}
  	if (b) {
  		this._addChild(b);
      this._childCount = b.options.count;
  	}
  };
}