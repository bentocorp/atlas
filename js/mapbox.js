// Taken from bento's mapbox account
L.mapbox.accessToken = "pk.eyJ1IjoiYmVudG9ub3ciLCJhIjoiNjI2ZmIwM2JkNzliMDZjYWEwYzkzOTc3YzdiYTQ2MmYifQ.LdRS3yQDx8_tWtEvY1bOjw";

var markers = { };

function get_order_color(state) {
	switch (state) {
		case 'highlight': return '#ffff00'; // yellow
		case 'accepted' : return '#0066cc'; // blue
		case 'rejected' : return '#cc0000'; // red
		case 'completed': return '#339900'; // green
		default:
			return '#666666'; // grey (unassigned)
	}
}

function highlight(order) {
	var marker = markers[order.attr('id')];
	marker.setIcon(
		L.mapbox.marker.icon({
        	'marker-symbol': 'circle',
            'marker-size': 'medium',
            'marker-color': get_order_color('highlight'),
        })
	);
}

function recolor(order) {
	var id = order.attr('id')
	var o = orders[id.split('_')[1]];
	markers[id].setIcon(
		L.mapbox.marker.icon({
        	'marker-symbol': 'circle',
            'marker-size': 'medium',
            'marker-color': get_order_color(o.state),
        })
	);
}

function toLatLng(address, callback) {
            // Mapbox format - 2017 Mission St, San Francisco, 94110, California, United States
            var query = encodeURI(address.street + ', ' + address.city + ', ' + address.zipCode + ', ' + address.region + ', ' + address.country);
            $.getJSON('https://api.mapbox.com/v4/geocode/mapbox.places/' + query + '.json?access_token=' + L.mapbox.accessToken, { }, function (res) {
                // Check relevance score too (>0.98)
                if (typeof res.features != 'undefined' && res.features.length > 0) {
                    callback(res.features[0]);
                } else {
                    console.log('Error - ' + res);
                }
            });
        }
