
/**

using the leaflet-solr-heatmap library in Angular 1.5

we must tell Angular about our component
this example uses the variable leafletSolrComponentOptions which is declared below

<script>
    angular.module("myapp", [])
	.component('leafletSolrComponent', leafletSolrComponentOptions)
        .controller("HelloController", function($scope) {
            $scope.helloTo = {};
            $scope.helloTo.title = "AngularJS";
         });
</script>


to add a leaflet map and heatmap layer to a web page, we declare a leaflet-solr-component tag as follows:

<leaflet-solr-component the-title='theTitle' mapdivid='map' solr-url='http://localhost:8983/solr/jstorTest' 
       options='{"field": "bbox_srpt", "nearbyField": "bbox_bbox", "popupDisplay": ["doi","title"],"type": "heatmap"}'>
</leaflet-solr-component>

*/

// the component wrapper around the leaflet-solr-heatmap JavaScript library
// leafletSolrComponentOptions should be passed to the .component function as illustrated above
// not that I have little experience with Angular
var map;
var leafletSolrComponentOptions = 
{
    bindings: {theTitle: '@', mapdivid: '@', solrUrl: '@', options: '@'},
    transclude: true,
    controller: function() 
    {this.$onInit = function() 
     {
	 console.log('in leafletSolr onInit function, map div id:',this.mapdivid);
	 console.log('theTitle', this.theTitle);
	 map = L.map(this.mapdivid).setView([0, 0], 1);

	 var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
		 attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoD\
B</a>'
	     }).addTo(map);
	 var options = JSON.parse(this.options);
	 solr = L.solrHeatmap(this.solrUrl, options);
	 solr.addTo(map);
     };
    },
    template: '<h2>hello map</h2><div id="map"></div>'
};