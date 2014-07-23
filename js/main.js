function getProjects () {
	$.ajax({
		url: 'http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/0/query',
		dataType: 'jsonp',
		data: {f: 'pjson', where: '1=1', orderByField: 'NAME', outSR: 4326, outFields: '*'},
		success: function (data) {

		}
	});
}

function getSymbols () {
	$.ajax({
		url: 'http://maps.raleighnc.gov/arcgis/rest/services/Sustainable/MapServer/legend',
		dataType: 'jsonp',
		data: {f: 'pjson'},
		success: function (data) {

		}
	});	
}

$(document).ready(function (){
	getProjects();
	getSymbols();
});