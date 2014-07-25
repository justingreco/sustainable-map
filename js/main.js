var icons = {}, map,
	pts;

var fieldMap = {
	"NAME": "Name",
	"CATEGORY": "Category",
	"LOCATION": "Location",
	"OWNER": "Owner",
	"STATUS": "Status",
	"SIZE_": "Size",
	"OUTPUT": "Output",
	"INSTALLER": "Installer",
	"CERTIFICATION" : "Certification",
	"URL": "Website",
	"TYPE": "Use Type"
}

function createLegend () {
	var div = $("#legend"),
		row = null,
		cnt = 0;
	$.each(icons, function (k, v) {
		if (cnt % 2 === 0) {
			row = $('<div class="row"></div>').appendTo(div);
		}
		if (row) {
			row.append('<div class="col-xs-6 legend-item"><img src="'+v.options.iconUrl+'"/><span>'+k+'</span></div>');
		}
		cnt += 1;
	});

	$('.legend-item').click(function () {
		$('#categories').val($('span', this).text());
		categoryChanged($('span', this).text());
	});
	window.setTimeout(function () {
		$("#map").height($("#leftPanel").height() - 20);
	}, 1000);
}

function getPopup (props) {
	var content = $("<div></div>");
	$.each(props, function (k, v) {
		if (k === "NAME") {
			content.prepend("<h5>" + v + "</h5><hr>");
		} else if (k === "URL") {
			content.append("<a href='"+v+"'>Website</a><br/>");
		} else {
			content.append("<strong>"+fieldMap[k]+ "</strong>: " + v + "<br/>");
		}
	});
	content.append('<img src="http://maps.raleighnc.gov/Photos/Sustainable/' + props.CATEGORY+'/'+props.NAME+'.jpg"/>');
	return content;
}

function createMap() {
	map = L.map('map').setView([35.7806, -78.6389], 9);
	var base = L.layerGroup().addTo(map),
		aerials = L.layerGroup();
	L.esri.basemapLayer('Gray').addTo(base);
	L.esri.tiledMapLayer('http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer').addTo(base);
	L.esri.basemapLayer('Imagery').addTo(aerials);
	L.esri.tiledMapLayer('http://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer').addTo(aerials);

	L.control.layers({"Streets": base, "Aerials": aerials}).addTo(map);

	pts = new L.esri.FeatureLayer('http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/0',
		{pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: icons[geojson.properties.CATEGORY]
			});
		},
		onEachFeature: function (feature, layer) {
			//layer.bindPopup(getPopup(feature.properties));
		}
	}).addTo(map);
	pts.on('load', function () {
		populateTable();
	});

	var template = '<div><h5>{NAME}</h5><hr><div><strong>Location:</strong> <span>{LOCATION}</span></div><div><strong>Certification:</strong> <span>{CERTIFICATION}</span></div><a href="{URL}" target="_blank">Website</a><br/><img src="http://maps.raleighnc.gov/Photos/Sustainable/{CATEGORY}/{NAME}.jpg"/></div>';
	pts.bindPopup(function (feature) {
		return L.Util.template(template, feature.properties);
	});

	pts.on('popupopen', function (e) {
		var content = $(e.popup.getContent());
		$(":contains('null')", content).parent().remove();
		
		$('img', content).error(function () {
			this.src = 'http://maps.raleighnc.gov/photos/Sustainable/sustainable.jpg';
			e.popup.setContent('<div>'+content.html()+'</div>');
		});


		e.popup.setContent('<div>'+content.html()+'</div>');

	// 	var content = $(e.popup.getContent());
	// 	$(content[4]).error(function () {
	// 		var newContent = 
	// 		$(content[4]).prop('src', 'http://maps.raleighnc.gov/photos/Sustainable/sustainable.jpg');
	// 		e.popup.setContent(content[0].outerHTML+content[1].outerHTML+content[2].outerHTML+content[3].outerHTML+content[4].outerHTML);
	// 	});
	});


	L.control.locate().addTo(map);
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
			createLegend();
		}
	});
}

function findFeature (name) {
	pts.query().where("NAME = '" + name + "'").run(function (error, collection) {
		console.log(collection);
		if (collection.features.length > 0) {
			map.setView(collection.features[0].geometry.coordinates.reverse(), 16);
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

function categoryChanged (category) {
		populateTable();
		if (category != "All Categories") {
			pts.setWhere("CATEGORY = '" + category + "'");
		} else {
			pts.setWhere("1=1");
		}
}

function addressFilter (resp) {
	var data = []
	if (resp.features.length > 0) {
		$(resp.features).each(function (i, f) {
			data.push({value:f.attributes['ADDRESS']});
		});
	}
	return data;
}

function typeaheadSelected (obj, data, dataset) {
	var url = "", field = "";
	if (dataset === "Addresses") {
		url = "http://mapstest.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query";
		field = "ADDRESS";
	} 
	$.ajax({
		url: url,
		type: 'GET',
		dataType: 'json',
		data: {f: 'json',
			where: field + " = '" + data.value + "'",
			returnGeometry: true,
			outSR: 4326
		},
	})
	.done(function(data) {
		var geom;
		if (data.features.length > 0) {
			if (data.geometryType === "esriGeometryPoint") {
				geom = L.latLng(data.features[0].geometry.y, data.features[0].geometry.x);
				var marker = new L.marker(geom);
				//selection.clearLayers();
				//selection.addLayer(marker);
				map.setView(geom, 16);
			} 
		}

	});
}

function checkAbbreviations (value) {
	var abbreviations = [{full: "Saint ", abbr: "St "}, 
	{full: "North ", abbr:"N "}, 
	{full: "South ", abbr: "S "},
	{full: "West ", abbr:"W "},
	{full: "East ", abbr: "E "},
	{full: "Martin Luther King Jr", abbr: "MLK"}];
	value = value.replace("'", "");
	value = value.replace(".", "");
	$.each(abbreviations, function (i, a) {
		value = value.replace(new RegExp(a.abbr, 'gi'), a.full);
	});
	return value;
}

function setTypeahead () {
	var addresses = new Bloodhound({
		datumTokenizer: function (datum) {
	        return Bloodhound.tokenizers.whitespace(datum.value);
	    },
	    queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: "http://mapstest.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query?orderByFields=ADDRESS&returnGeometry=false&outFields=ADDRESS&returnDistinctValues=false&f=pjson",
			filter: addressFilter,
			replace: function(url, uriEncodedQuery) {
			      var newUrl = url + '&where=ADDRESSU like ' + "'" + checkAbbreviations(uriEncodedQuery).toUpperCase() +"%'";
			      return newUrl;
			}
		}
	});

	addresses.initialize();
	$(".typeahead").typeahead({hint: true, highlight: true, minLength: 1}, 
		{name:'Addresses', 
		displayKey:'value', 
		source:addresses.ttAdapter(),
		templates: {
			header: "<h5>Addresses</h5>"
		}}).on("typeahead:selected", typeaheadSelected);
}

$(window).resize(function () {
	$("#map").height($("#leftPanel").height() - 20);
});

$(document).ready(function (){
	//createMap();
	setTypeahead();
	getSymbols();
	$('#categories').change(function () {
		categoryChanged($('option:selected', this).val());
	});

});