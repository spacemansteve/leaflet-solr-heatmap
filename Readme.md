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
`bboxField` | `String` | `null` | computing documents near a mouse click requires the bbox field
`areaField` | `String` | `null` | when present, used to sort results for pop-up

## popupDisplay
When the user clicks on the map, the heatmap layer can popup a window
with information on nearby Solr documents.  Nearby is defined as Solr
documents within the size of a heatmap bubble cell.  On map clicks a
Solr intersection is used on the field of type BBox.

To display popups, set popupDisplay to the name of the Solr field you
would like displayed.  If you need more than one field displayed, set 
popupDisplay to a comma seperated list of Solr field names.  If you
want to provide a formatter for a single field, rather than providing
the field name provide an array whose first element is the field name
and second element a function that takes a Solr document.  If you do
not like the default formatting of Solr fields, set popupDisplay to a
function that accepts one argument, a Solr document in JSON format.
This function should return a string with HTML tags.  

If the area field is provided, the results in the popup are sorted
from smallest to largest.

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