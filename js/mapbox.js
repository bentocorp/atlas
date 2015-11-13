// Taken from bento's mapbox account
L.mapbox.accessToken = "pk.eyJ1IjoiYmVudG9ub3ciLCJhIjoiNjI2ZmIwM2JkNzliMDZjYWEwYzkzOTc3YzdiYTQ2MmYifQ.LdRS3yQDx8_tWtEvY1bOjw";

var markers = { };

// Make sure same with atlas.css
function get_order_color(status) {
	switch (status.toLowerCase()) {
        case 'pending'   : return '#8467d7';
        case 'unassigned': return '#bbbbbb';
        case 'modified'  : return '#fffb67';
		case 'accepted'  : return '#0066cc'; // blue
		case 'rejected'  : return '#cc0000'; // red
		case 'complete'  : return '#339900'; // green
		default:
			throw 'Trying to color based on unsupported status ' + status;
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
	var o = order;
    var marker = markers['order_' + o.id];
    /*
    // Test usability if we don't render completed orders
    if (o.status == 'complete') {
        map.removeLayer(marker);
        return;
    }
    */
	marker.setIcon(
		L.mapbox.marker.icon({
        	'marker-symbol': o.id.split('-')[0],
            'marker-size': 'medium',
            'marker-color': get_order_color(o.status),
        })
	);
    if (o.status == 'accepted' || o.status == 'rejected' || o.status == 'complete' || o.status == 'pending') {
        order.css('font-weight', 'bold').css('color', get_order_color(o.status));
    }
}

function toLatLng(order, callback) {
    var address = order.address,
        lat     = address.lat,
        lng     = address.lng;
    if (lat != null && lng != null) {
        // Mapbox API returns [lng, lat] so we must replicate that
        callback({center: [lng, lat]});
        return;
    }
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

function mkIcon(order, size) {
    return L.mapbox.marker.icon({
            'marker-symbol': order.id.split("-")[0],
            'marker-size': size,
            'marker-color': get_order_color(order.status),
    });
}

function addOrderToMap(order) {
    //console.log(order);
    toLatLng(order, function (res) {
        var marker = L.marker(
            [res.center[1], res.center[0]],
            {
                icon: L.mapbox.marker.icon(
                    {
                        'marker-symbol': order.id.split("-")[0],
                        'marker-size': 'medium',
                        'marker-color': get_order_color(order.status),
                    }
                ),
                riseOnHover: true,
            }
        ).bindLabel(order.id+"\n"+order.name);
        var orderElement = $('#order_' + order.id);
        var driver = $('#driver_' + order.driverId + '>.driver-header');
        marker.on('mouseover', function () {
            if (orderElement.is(':visible')) {
                orderElement.addClass('marker-mouse-over');
            } else {
                // else show order's assigned driver
                driver.addClass('driver-header-drag-enter');
            }
        });
        marker.on('mouseout', function () {
            orderElement.removeClass('marker-mouse-over');
            driver.removeClass('driver-header-drag-enter');
        });
        markers['order_' + order.id] = marker;
        marker.addTo(map);              
    });
}

var routes = { };
function hideRoute(driverId) {
    var layer = routes[driverId];
    if (layer != null) {
        map.removeLayer(layer);
        delete routes[driverId];
    }
}
function drawRoute(driverId) {
    var driver = g.drivers[driverId];
    var line = [];
    line.push(markers['driver_' + driverId].getLatLng());
    var q = driver.orderQueue;
    for (var i = 0; i < q.length; i++) {
        //var order = g.orders[q[i]];
        line.push(markers['order_' + q[i]].getLatLng());
    }
    var route = L.polyline(line, { color: '#000' });
    //console.log(route);
    var pane = route.addTo(map);
    routes[driverId] = route;
}
