var map = L.map('map').setView([39.82, -98.58], 4);

var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

function onEachFeature(feature, layer) {
  var count = feature.properties.count.toLocaleString();
  layer.bindPopup(count);
}

function setKeyword()
{
    var filterQuery = jQuery('#keywordSearchText').val();
    solr.clearFilterQueries();
    solr.addFilterQuery(filterQuery);
    solr.refresh();
};


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
    var showGlobalResults = jQuery('#showGlobalResults').is(':checked');

    if (popupDisplayField.indexOf(',') > -1)
	popupDisplayField = popupDisplayField.split(',');
    else
	popupDisplayField = [popupDisplayField];

    colorMap = colorMap.split(',');

    if (solr)
	map.removeLayer(solr);

    // if the doi field is present, we format it as an html link to the jstor document
    // first, a function to generate the html
    var doiLinker = function(doc)
    {
	value = doc['doi'];
	if (Array.isArray(value))
	    value = value.join();
	return "<a target='_blank' href='http://www.jstor.org/stable/" + value + "'>" + value + "</a>.  ";
    };
    doiIndex = popupDisplayField.indexOf('doi');
    if (doiIndex > -1 )
	popupDisplayField[doiIndex] = ['doi', function(doc) {return doiLinker(doc);}];
    
    var solrErrorHandler = function(jqXHR, textStatus, errorThrown)
    {
	// due to jsonp, no details are available
	jQuery('#errorMessage').text('Solr error, bad URL or RPT field name');
    };

    var solrNearbyErrorHandler = function(jqXHR, textStatus, errorThrown)
    {
	// due to jsonp, no details are available
	jQuery('#errorMessage').text('Solr error, bad URL or field name related to pop-up');
    };

    var solrSuccessHandler = function(data, textStatus, jqXHR)
    {
	jQuery('#errorMessage').text('');
        jQuery('#responseTime').html('Solr response time: ' + solr.solrTime + ' ms');
        jQuery('#numDocs').html('Number of docs: ' + solr.docsCount.toLocaleString());

    };

    var renderCompleteHandler = function()
    {
	if (solr.renderTime)
	    $('#renderTime').html('Render time: ' + solr.renderTime + ' ms');
    };

    var keyword = jQuery('#keywordSearchText').val();
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
	    solrErrorHandler: solrErrorHandler,
	    solrNearbyErrorHandler: solrNearbyErrorHandler,
	    solrSuccessHandler: solrSuccessHandler,
	    solrNearbySuccessHandler: solrSuccessHandler,
	    renderCompleteHandler: renderCompleteHandler,
	    popupHighlight: true,
	    showGlobalResults: showGlobalResults,
	    fixedOpacity: 100,
	    filterQuery: keyword,
	    // Inherited from L.GeoJSON
	    onEachFeature: onEachFeature
	});
    solr.addTo(map);

}

var solr = null;

resetSolr();