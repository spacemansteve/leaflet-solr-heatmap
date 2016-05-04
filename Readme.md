# Leaflet-Solr-Heatmap

A Leaflet plugin that visualizes heatmap facets from Solr 5.x

## Using with Leaflet

```javascript
// Create a SolrHeatmap layer and add it to the map
var solr = L.solrHeatmap('http://127.0.0.1:8983/solr/gettingstarted', {
  // Solr field with geospatial data (should be type Spatial Recursive Prefix Tree)
  field: 'loc_srpt',

  // Set type of visualization. Allowed types: 'geojsonGrid', 'clusters'
  // Note: 'clusters' requires LeafletMarkerClusterer
  type: 'geojsonGrid'
}).addTo(map);
```

Option | Type | Default | Description
------ | ---- | ------- | -----------
`field` | `String` | `null` | *Required.* Solr field with geospatial data (should be type Spatial Recursive Prefix Tree)
`type` | `String` | `'geojsonGrid'` | Type of visualization. Accepts `geojsonGrid`, `clusters` and `heatmap`
`solrRequestHandler` | `String` | `'select'` | Request handler for Solr
`colors` | `Array` | `['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043']` | Colors for heatmap.  Array can be of any length.
`maxSampleSize` | `Number` | `Number.MAX_SAFE_INTEGER` | For improved performance, run Jenks classification on only a sample of Solr counts.  Default value turns off sampling.  Typical value is 400.
`popupDisplay` | `various` | `false` | on mouse click optionaly display nearby documents in popup, defaults to ignoring clicks
`nearbyField` | `String` | `null` | computing documents near a mouse click, BBox required for non-point data
`nearbyFieldType` | `String` | 'BBox' | either BBox or RPT
`sortField` | `String` | `null` | when present, used to sort results for pop-up in desc order
`popupHighlight` | `Boolean` | `false` | on mouseover in popup list of nearby items, items and their boudning boxes can be highlighted
`solrSuccessHandler` | `function` | `null` | user function to call during processing of Solr heatmap results, args: data, textStatus, jqXHR
`solrErrorHandler` | `function` | `null` | user function to call when Solr heatmap response was an error, args: jqXHR, textStatus, errorThrown
`solrNearbySuccessHandler` | `function` | `null` | user function to call during processing of Solr "nearby" results, args: data, textStatus, jqXHR
`solrNearbyErrorHandler` | `function` | `null` | user function to call when Solr "nearby" response was an error, args: jqXHR, textStatus, errorThrown
`renderCompleteHandler` | `function` | `null` | user function to call after rendering of Solr heatmap response is complete
`showGlobalResults` | `boolean` | `false` | should we display a popup in the corner of the map listing results from the entire map




## popupDisplay
When the user clicks on the map, the heatmap layer can popup a window
with information on nearby Solr documents.  Nearby is defined as Solr
documents within the size of a heatmap bubble cell.  On map clicks,
use Solr intersection if nearby field type is BBox.  If nearby field
type is RPT, assume it only holds point data and use geofilt/geodist.
Note that your Solr instance may crash if your RPT field contains
non-point data (e.g., envelopes or polygons) and you run a
geofilt/geodist query against it.  

To display popups, set popupDisplay to the name of the Solr field you
would like displayed.  If you need more than one field displayed, set 
popupDisplay to a comma seperated list of Solr field names.  If you
want to change the formatting of a single field, rather than providing
the field name provide an array whose first element is the field name
and second element a function that takes a Solr document.  This
function should return the html description of the field.  You can
override all the default formatting of Solr fields.  Simply set
popupDisplay to a function that accepts one argument, a Solr document
in JSON format. This function should return a string with HTML tags.   

If the sort field is provided, the results in the popup are sorted
from largest to smallest


```javascript
// how to specify popup
var solr = L.solrHeatmap("http://localhost:8983/solr/coreName", 
{
  field: 'bounds_rpt',
  type: 'heatmap',
  bboxField: 'bounds_bbox',
  popupDisplay: ['title',['doi', function(doc) {return formatDoi(doc);}],'count']
}.addTo(map);

// where title, doi and count are Solr field names 
// and formatDoi is a local Javascript function that returns the html
// representation of the doi field
```

## Running locally

Download required libraries for example (Leaflet, Leaflet MarkerClusterer, jQuery)
```sh
bower install
```

(Optional) Install packages for running local server
```sh
npm install
```

Start local server
```sh
grunt
```

View the example at [http://127.0.0.1:8000/example/](http://127.0.0.1:8000/example/)