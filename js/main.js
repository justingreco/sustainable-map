var icons = {}, map,
	pts;


function createMap() {
	map = L.map('map').setView([35.7806, -78.6389], 9);
	L.esri.basemapLayer('Gray').addTo(map);
	pts = new L.esri.FeatureLayer('http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/0',
		{pointToLayer: function (geojson, latlng) {

			return L.marker(latlng, {
				icon: icons[geojson.properties.CATEGORY]
			});
		}
	}).addTo(map);
	pts.on('load', function () {
		populateTable();
	});

	var template = '<h5>{NAME}</h5><hr><p>{LOCATION}</p><p><a href="{URL}" target="_blank">Website</a></p><img src="http://maps.raleighnc.gov/Photos/Sustainable/{CATEGORY}/{NAME}.jpg"/>';
	pts.bindPopup(function (feature) {
		return L.Util.template(template, feature.properties);
	});
}

function getSymbols () {
	$.ajax({
		url: 'http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/legend',
		dataType: 'jsonp',
		data: {f: 'pjson'},
		success: function (data) {
			$.each(data.layers[0].legend, function (i, item){
				$("#categories").append('<option>'+item.label+'</option>');
				icons[item.label] = L.icon({
					iconUrl: 'http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/0/images/'+item.url
				});
			});
			createMap();
		}
	});
}

function findFeature (name) {
	pts.query().where("NAME = '" + name + "'").run(function (error, collection) {
		console.log(collection);
		if (collection.features.length > 0) {
			map.setView(collection.features[0].geometry.coordinates.reverse(), 17);
			collection.openPopup();
		}
	});
}

function populateTable () {
	var body = $("#list tbody").empty();
	pts.eachFeature(function (layer) {
			if ($("#categories option:selected").val() != 'All Categories') {
				if (layer.feature.properties.CATEGORY === $("#categories option:selected").val()) {
				body.append('<tr><td>' + layer.feature.properties.NAME + '</td><td>' + layer.feature.properties.CATEGORY + '</td></tr>');
				}
			} else {
				body.append('<tr><td>' + layer.feature.properties.NAME + '</td><td>' + layer.feature.properties.CATEGORY + '</td></tr>');
			}
		}
	);
	$("#list tbody").off('click', 'tr');
	$("#list tbody").on ('click', 'tr', function () {
		findFeature($('td:first', this).text());
	})
}

$(document).ready(function (){
	//createMap();
	getSymbols();
	$('#categories').change(function () {
		populateTable();
		if ($('option:selected', this).val() != "All Categories") {
			pts.setWhere("CATEGORY = '" + $('option:selected', this).val() + "'");
		} else {
			pts.setWhere("1=1");
		}
	});

});