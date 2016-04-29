var map = L.map('map').setView([0, 0], 1);

var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

function onEachFeature(feature, layer) {
  var count = feature.properties.count.toLocaleString();
  layer.bindPopup(count);
}

// Create and add a solrHeatmap layer to the map
//var solr = L.solrHeatmap('http://127.0.0.1:8983/solr/gettingstarted', {

function resetSolr()
{
    var solrUrl = jQuery('#solrUrl').val();
    var renderType = jQuery("#renderType option:selected" ).text();
    var rptField = jQuery('#rptField').val();
    var colorMap = jQuery('#colorMap').val();
    var nearbyField = jQuery('#nearbyField').val();
    var nearbyFieldType = jQuery("#nearbyFieldType option:selected" ).text();
    var popupDisplayField = jQuery('#popupDisplayField').val();
    var sortField = jQuery('#sortField').val();

    if (popupDisplayField.indexOf(',') > -1)
	popupDisplayField = popupDisplayField.split(',');
    else
	popupDisplayField = [popupDisplayField];

    colorMap = colorMap.split(',');

    if (solr)
	{
	    map.removeLayer(solr);
	    map.off('moveend');
	    solr._clearLayers();
	    if (solr.heatmapLayer)
		{
		    // this code highlights the problem of L.SolrHeatmap creating L.Heat
		    // perhaps L.SolrHeatmap needs to override remove layer
		    map.removeLayer(solr.heatmapLayer);
		    map.off("click");
		}

	}

    // if the doi field is present, we format it as an html link to the jstor document
    // first, a function to generate the html
    doiLinker = function(doc)
    {
	value = doc['doi'];
	if (Array.isArray(value))
	    value = value.join();
	return "<a target='_blank' href='http://www.jstor.org/stable/" + value + "'>" + value + "</a>.  ";
    };
    doiIndex = popupDisplayField.indexOf('doi');
    if (doiIndex > -1 )
	popupDisplayField[doiIndex] = ['doi', function(doc) {return doiLinker(doc);}];

    //http://localhost:8983/solr/jstorTest
    solr = L.solrHeatmap(solrUrl, {
	    // Solr field with geospatial data (should be type Spatial Recursive Prefix Tree)
	    field: rptField,
	    // Sorl field needed to compute nearby items
	    nearbyField: nearbyField,
	    nearbyFieldType: nearbyFieldType,
	    
	    // Set type of visualization. Allowed types: 'geojsonGrid', 'clusters' Note: 'clusters' requires LeafletMarkerClusterer, heatmap
	    type: renderType,
	    colors: colorMap, //['#000000', '#0000df', '#00effe', '#00ff42', '#feec30', '#ff5f00', '#ff0000'],
	    maxSampleSize: 400,
	    popupDisplay: popupDisplayField,
	    // we optionally sort display of nearby items from smallest to largest
	    sortField: sortField,
	    
	    // Inherited from L.GeoJSON
	    onEachFeature: onEachFeature
	});
    solr.addTo(map);
    
}

var solr = null;

resetSolr();