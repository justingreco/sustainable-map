var icons = {}, map,
	pts;

var fieldMap = {
	"NAME": "Name",
	"CATEGORY": "Category",
	"LOCATION": "Location",
	"OWNER": "Owner",
	"STATUS": "Status",
	"SIZE_": "Size",
	"OUTPUT": "Description",
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
	map = L.map('map', {maxZoom: 16, minZoom: 10}).setView([35.7806, -78.6389], 10);
	var base = L.layerGroup().addTo(map),
		aerials = L.layerGroup(),
		markers = L.MarkerClusterGroup();
	L.esri.basemapLayer('Gray').addTo(base);
	L.esri.tiledMapLayer('http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer').addTo(base);
	L.esri.basemapLayer('Imagery').addTo(aerials);
	L.esri.tiledMapLayer('http://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer').addTo(aerials);
	L.control.layers({"Streets": base, "Aerials": aerials}, null, {collapsed: false}).addTo(map);
	pts = new L.esri.ClusteredFeatureLayer('http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/0',
		{pointToLayer: function (geojson, latlng) {
			return L.marker(latlng, {
				icon: icons[geojson.properties.CATEGORY]
			});
		}}).addTo(map);
	pts.on('load', function () {
		populateTable();
	});
	var template = '<div><h5>{NAME}</h5><hr><div><strong>Location:</strong> <span>{LOCATION}</span></div><div><strong>Size:</strong> <span>{SIZE_}</span></div><div><strong>Description:</strong> <span>{OUTPUT}</span></div><div><strong>Certification:</strong> <span>{CERTIFICATION}</span></div><a href="{URL}" target="_blank">Website</a><br/><img src="http://maps.raleighnc.gov/Photos/Sustainable/{CATEGORY}/{NAME}.jpg"/></div>';
	pts.bindPopup(function (feature) {	
		return L.Util.template(template, feature.properties);
	});
	pts.on('popupopen', function (e) {
		var content = $(e.popup.getContent());
		$('a', content).filter(function () {
			return $(this).attr('href').trim().length === 0;
		}).remove();
		$('span', content).filter(function () {
			return $(this).text().trim().length === 0;
		}).parent().remove();
		$(":contains('null')", content).parent().remove();
		$('a[href="null"]', content).remove();
		$('img', content).load(function () {
			e.popup.update();
		});
		$('img', content).error(function () {
			this.src = 'http://maps.raleighnc.gov/photos/Sustainable/sustainable.jpg';
			if (e.layer.feature.properties.CATEGORY === 'Big Belly Solar Trash Compactors') {
				this.src = 'http://maps.raleighnc.gov/photos/Sustainable/Big Belly Solar Trash Compactors/BigBelly.jpg';
			}
			e.popup.setContent('<div>'+content.html()+'</div>');
		});
		e.popup.setContent('<div>'+content.html()+'</div>');
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
			//collection.openPopup();
		}
	});
}

function sortTableData (a, b) {
	var n1 = a.name,
		n2 = b.name;
	if (n1 < n2) return -1;
	if (n1 > n2) return 1;
	return 0;
}

function populateTable () {
	var body = $("#list tbody").empty()
		data = [];
	pts.eachFeature(function (layer) {
		if ($("#categories option:selected").val() != 'All Categories') {
			if (layer.feature.properties.CATEGORY === $("#categories option:selected").val()) {
					data.push({name: layer.feature.properties.NAME, category: layer.feature.properties.CATEGORY});
			}
		} else {
			data.push({name: layer.feature.properties.NAME, category: layer.feature.properties.CATEGORY});
		}
	});
	data.sort(sortTableData);
	$.each(data, function (i, d) {
		body.append('<tr><td>' + d.name + '</td><td>' + d.category + '</td></tr>');
	});
	$("#list tbody").off('click', 'tr');
	$("#list tbody").on ('click', 'tr', function () {
		findFeature($('td:first', this).text());
	})
}

function categoryChanged (category) {
	map.setView([35.7806, -78.6389], 10);
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


function streetsFilter (resp) {
	var data = []
	if (resp.features.length > 0) {
		$(resp.features).each(function (i, f) {
			data.push({value:f.attributes['CARTONAME']});
		});
	}
	return data;
}

function typeaheadSelected (obj, data, dataset) {
	var url = "", field = "";
	if (dataset === "Addresses") {
		url = "http://mapstest.raleighnc.gov/arcgis/rest/services/Addresses/MapServer/0/query";
		field = "ADDRESS";
	} else if (dataset === "Streets") {
		url = "http://maps.raleighnc.gov/arcgis/rest/services/StreetsDissolved/MapServer/0/query";
		field = "CARTONAME";		
	}
	$.ajax({
		url: url,
		type: 'GET',
		dataType: 'jsonp',
		data: {f: 'pjson',
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
				map.setView(geom, 16);
			} else {
				var paths = [];
				if (data.features.length > 0) {
					$.each(data.features[0].geometry.paths, function (i, path) {
						var arr = [];
						$.each(path, function (i, p) {
							arr.push(L.latLng(p[1], p[0]));
						});
						paths.push(arr);
					});
					var pl = L.multiPolyline(paths);
					map.fitBounds(pl.getBounds());
				}
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
            ajax: {
                type: "GET",
                dataType: "jsonp"
            },   			
			filter: addressFilter,
			replace: function(url, uriEncodedQuery) {
			      var newUrl = url + '&where=ADDRESSU like ' + "'" + checkAbbreviations(uriEncodedQuery).toUpperCase() +"%'";
			      return newUrl;
			}
		}
	});
	addresses.initialize();
	var streets = new Bloodhound({
		datumTokenizer: function (datum) {
	        return Bloodhound.tokenizers.whitespace(datum.value);
	    },
	    queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: "http://maps.raleighnc.gov/arcgis/rest/services/StreetsDissolved/MapServer/0/query?orderByFields=CARTONAME&returnGeometry=false&outFields=CARTONAME&returnDistinctValues=false&f=pjson",
            ajax: {
                type: "GET",
                dataType: "jsonp"
            },   			
			filter: streetsFilter,
			replace: function(url, uriEncodedQuery) {
			      var newUrl = url + '&where=CARTONAME like ' + "'" + uriEncodedQuery.toUpperCase() +"%'";
			      return newUrl;
			}
		}
	});
	streets.initialize();	
	$(".typeahead").typeahead({hint: true, highlight: true, minLength: 1},
		{name:'Addresses',
		displayKey:'value',
		source:addresses.ttAdapter(),
		templates: {
			header: "<h5>Addresses</h5>"
		}},
		{name:'Streets',
		displayKey:'value',
		source:streets.ttAdapter(),
		templates: {
			header: "<h5>Streets</h5>"
		}}).on("typeahead:selected", typeaheadSelected);
}

$(window).resize(function () {
	$("#map").height($("#leftPanel").height() - 20);
});

$(document).ready(function (){
	setTypeahead();
	getSymbols();
	$('#categories').change(function () {
		categoryChanged($('option:selected', this).val());
	});
});