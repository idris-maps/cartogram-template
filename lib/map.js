var width = config.width
var height = config.height

var body = d3.select("body")

var map = d3.select("#map")
	.attr("viewBox", "0 0 " + width + " " + height)

var mapFeatures = map.append("g")
      .attr("id", "mapFeatures")
      .selectAll("path")

var proj = d3.geo.mercator()
var topology
var geometries
var dataById = {}

var carto = d3.cartogram()
      .projection(proj)
      .properties(function(d) {
        if (!dataById[d.properties[config.linkOnTopo]]) {
          console.log('ERROR: Entry "' + d.properties[config.linkOnTopo] + '" was found in the Topojson but not in the data CSV. Please correct either of them.');
        }
        return dataById[d.properties[config.linkOnTopo]];
      });

d3.json(config.pathToTopo, function(topo) {
  topology = topo;
  geometries = topology.objects[config.topoObject].geometries;
  d3.csv(config.pathToCsv, function(data) {
    dataById = d3.nest()
      .key(function(d) { return d[config.linkInCsv]; })
      .rollup(function(d) { return d[0]; })
      .map(data)
    init()
  });
});


function init() {

	var path = d3.geo.path()
        .projection(proj);

  var b = config.bbox

  t = [(b[0]+b[2])/2, (b[1]+b[3])/2];
  s = 0.95 / Math.max(
      (b[2] - b[0]) / width,
      (b[3] - b[1]) / height
    );

  var cartoFeatures = carto.features(topology, geometries)
  s = s * config.scale;
  proj
      .scale(s)
      .center(t).translate([width / 2, height / 1.7]);

  mapFeatures = mapFeatures.data(cartoFeatures)
    .enter()
    .append('path')
      .attr({
				class: 'mapFeature',
				id: function(d) { return getName(d) }
			})
		

  var value = function(d) {
    return getValue(d);
  }
	var values = mapFeatures.data()
        .map(value)
        .filter(function(n) {
          return !isNaN(n);
        })
        .sort(d3.ascending)

	var lo = d3.min(values)
	var hi = d3.max(values)	

  var color = d3.scale.linear()
    .range(config.colorRange)


	if(lo < 0) {
		color.domain([lo, 0, hi])
	} else {
		color.domain([lo, d3.mean(values), hi])
	}

  var scale = d3.scale.linear()
    .domain([lo, hi])
    .range([1, 1000])

  carto.value(function(d) {
    return scale(value(d))
  })


  var cartoFeaturesData = carto(topology, geometries).features
  mapFeatures.data(cartoFeaturesData)

  mapFeatures
		.attr({
			'stroke-width': config.stroke.width,
			'stroke-opacity': config.stroke.opacity,
			stroke: config.stroke.color,
			fill: function(d) { return color(value(d)) },
			d: carto.path
		})
}



function drawInlineSVG(rawSVG) {
		var rawSVG = '<svg viewBox="0 0 960 600">' + rawSVG + '</svg>'
    var svgBlob = new Blob([rawSVG], {type:"image/svg+xml;charset=utf-8"})
		console.log(svgBlob)
		saveAs(svgBlob, config.fileName + '.svg')
}

function onload() {
	var btn = d3.select('body').append('button').text('Save as SVG')
	btn.on('click', function() {
		drawInlineSVG(window.d3.select('#map').html())
	})
}

window.onload = onload()

function getValue(f) {
	if(f.properties !== undefined) {
  	return +f.properties[config.valueInCsv];
	} else {
		return 0
	}
}

function getName(f) {
	if(f.properties !== undefined) {
		return f.properties[config.idFromTopo];
	} else {
		return 'undefinedID'
	}
}



