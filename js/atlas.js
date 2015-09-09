var drivers = {
	'online' : { },
	'offline': { },
};




var atlas = {
	event_handlers: {
		dragdrop : {
			ondragstart: function (e) {
				// For now, only orders are draggable
				e.dataTransfer.setData('order-id' , $(e.target).attr('id'));
			},
			ondragover : function (e) {
				e.preventDefault();
				return false;
			},
			/* order - drop listeners */
			order : {
				add_drop_listeners: function (el) {
					el.attr('ondragenter', 'atlas.event_handlers.dragdrop.order.ondragenter(event);');
					el.attr('ondragleave', 'atlas.event_handlers.dragdrop.order.ondragleave(event);');
					el.attr('ondragover' , 'atlas.event_handlers.dragdrop.ondragover(event);');
					el.attr('ondrop'     , 'atlas.event_handlers.dragdrop.order.ondragdrop (event);');
				},
				ondragenter: function (e) {
					e.preventDefault();
					$(e.target).css('border-top', '2px solid rgba(255, 255, 204, 0.5)');
				},
				ondragleave: function (e) {
					e.preventDefault();
					$(e.target).css('border-top', '2px solid transparent');
				},
				ondragdrop : function (e) {
					e.preventDefault();
					var order = $('#' + e.dataTransfer.getData('order-id')); // The order being moved
					var after = $(e.target); // The order being moved will be placed before this element
					Order.insert(order, after);
					after.css('border-top', '2px solid transparent');
				},
			},
			/* driver-settings - drop listeners */
			driver_header: {
				add_drop_listeners: function (el) {
					el.attr('ondragenter', 'atlas.event_handlers.dragdrop.driver_header.ondragenter(event);');
					el.attr('ondragleave', 'atlas.event_handlers.dragdrop.driver_header.ondragleave(event);');
					el.attr('ondragover' , 'atlas.event_handlers.dragdrop.ondragover(event);');
					el.attr('ondrop' , 'atlas.event_handlers.dragdrop.driver_header.ondragdrop (event);');
				},
				col: $(), // XXX: Temporary hack. Need a better solution
				ondragenter: function (e) {
					e.preventDefault();
					var target = $(e.target);
					this.col = this.col.add(target);
					//console.log('ondragenter - ' + $(e.target)[0].localName + ', counter = ' + this.counter);
					if (target.hasClass('driver-header')) {
						target.css('background-color', 'rgba(255, 255, 204, 0.5)');
					}
				},
				ondragleave: function (e) {
					e.preventDefault();
					var target = $(e.target);
					this.col = this.col.not(target);
					//console.log('ondragleave - ' + $(e.target)[0].localName + ', counter = ' + this.counter);
					if (this.col.length === 0) {
						target.closest('.driver-header').css('background-color', 'transparent');
					}
				},
				ondragdrop : function (e) {
					e.preventDefault();
					var target = $(e.target);
					var order = $('#' + e.dataTransfer.getData('order-id')), // The order being moved
					    driverId = target.closest('.driver-container').attr('id');
					Order.push(order, driverId);
					target.closest('.driver-header').css('background-color', 'transparent');
					// do assignment
					Order.assign(e.dataTransfer.getData('order-id').split('_')[1], driverId.split('_')[1]);
				},
			},
		},
	},
};






function render_driver(driver) {
	// driver-container
	var container = $('<div>').attr('id', 'driver_' + driver.id).addClass('driver-container');
	
	// driver-header
	var driver_header = $('<div>').addClass('driver-header');
	atlas.event_handlers.dragdrop.driver_header.add_drop_listeners(driver_header);
	driver_header
		.append('<span class="collapsed folding-symbol transparent" onclick="colexp(\'driver_' + driver.id + '\');"></span>')
	    .append('<span class="status-symbol"></span>')
	    .append('<span class="driver-name">' + driver.name + '</span>');

	// driver-orders
	var orders = $('<div>').attr('id', 'orders_' + driver.id).attr('class', 'orders');
	// Initialize order container with a dummy order (for drag and drop)
	orders.append(Order.create_order());

	// Add driver and order to driver-container
	container.append(driver_header).append(orders);
	
	//
	if (driver.connected) {
		driver_header.children('.status-symbol').addClass('online');
		drivers['online'][driver['id']] = driver;
		$('#online-drivers').append(container);
		markers[driver.id] = { };
	} else {
		driver_header.children('.status-symbol').addClass('offline');
		drivers['offline'][driver['id']] = driver;
		$('#offline-drivers').append(container);
	}
}










var houston_url = 'http://localhost:9000';
var token;
function init() {
	// Connect to node
	//var host = '54.191.141.101'; // bento-dev-nodejs01
    var port = 8081;
    var host = 'localhost';
    var url = 'http://' + host + ':' + port;
    println('Connecting to node');
    var soc = io.connect(url, { query: 'uid=atlas01', timeout: 5000 /* 5 seconds */ });
    soc.on('connect_error', function (e) {
    	console.log(e);
    });
    soc.on('connect_timeout', function (e) {
    	console.log(e);
    });
    soc.on('connect', function () {
        	
        	println('Connection established.');
        	println('Trying to authenticate');
        	soc.emit('get', {
        		api: '/api/authenticate', params: { username: 'atlas01', password: 'password' },
        	}, function (res) {
        		res = JSON.parse(res);
        		if (res.code != 0) {
        			println(res.msg);
        		} else {
        			token = res.ret['token'];
        			println('Success! access token = ' + token);
        			// Retrieve driver info
					$.getJSON(houston_url + '/api/get_drivers', {
    				}).done(function (res) {
    					if (res.code != 0) {
       						throw new Error('Error fetching driver data from houston');
       					} else {
       						println('Retrieved ' + res.ret.length + ' drivers');
       						for (var i = 0; i < res.ret.length; i++) {
       							render_driver(res.ret[i]);
       							
       							soc.emit('get', { api: '/api/track', params: { uid: 'atlas01', client_id: res.ret[i]['id'] }, 'token': token }, function (res2) {
       								
       								res2 = JSON.parse(res2);
       								
       								if (res2.code != 0) {
       									println('Error tracking ' + res2.ret.clientId + ' - ' + res2.msg);
       								} else {
       									println('Tracking ' + res2.ret.clientId + ' - connected: ' + res2.ret.connected);
       								}
       							});
       						}
       						init_orders(function () { });
       					}
    				});
        		}
        	});
    
    });

    soc.on('disconnect', function () {
    	println('Disconnected');
    });

    soc.on('stat', function (data) {
    	var push = JSON.parse(data);
    	var clientId = push.clientId;
    	var driver = $('#driver_' + clientId);
    	if (push.status == 'connected') {
    		$('#online-drivers').append(driver);
    		driver.children('.driver-header').children('.status-symbol').removeClass('offline').addClass('online');
    	} else if (push.status == 'disconnected') {
    		$('#offline-drivers').append(driver);
    		driver.children('.driver-header').children('.status-symbol').removeClass('online').addClass('offline');
    	}
    });


    soc.on('loc', function (e) {
        var clientId = e.clientId;
        var msg = "Location update for client " + clientId + ": (" + e.lat + ", " + e.lng + ")";
        println(msg);
        var p = [e.lat, e.lng];
        if (markers[clientId] == null) {
          markers[clientId] = L.marker(p, {
            icon: L.mapbox.marker.icon({
              'marker-symbol': 'car',
              'marker-size': 'large',
              'marker-color': randColor()
            })
          }).bindLabel(clientId);
          markers[clientId].addTo(map);
        } else {
        //  console.log('here');
          markers[clientId].setLatLng(L.latLng(e.lat, e.lng));
        }
      });

    soc.on('push', function (msg) {
        console.log("Received " + msg);
        var push = JSON.parse(msg);
        if (push.subject == 'NEW_CLIENT') {
          var clientId = push.body;
          println('Tracking client ' + clientId);
          $.getJSON(url + '/api/track', {
            uid: 'admin01',
            clientId: clientId,
          }).done(function (ret) {
            if (ret.code == 0) {
              //println('Tracking ' + _clientId);
            } else {
              println('Failed.');
            }
          });
        } else if (push.subject == 'CLIENT_OFFLINE') {
           println(push.body + ' is now offline');
           map.removeLayer(markers[push.body]);
        }
      });

}

var orders = {
	unassigned: [], inprogress: [], complete: [],
};



function init_orders(next) {
	$.getJSON(houston_url + '/api/get_orders', { }, function (res) {
		if (res.code != 0) {
			console.log('Error fetching orders - ' + res.msg);
		} else {
			for (var i = 0; i < res.ret.length; i++) {
				var o = res.ret[i];
				if (o.assignee > 0) {
					Order.atEnd(Order.create_order(o), o.assignee);
				} else {
					// Unassigned orders
					
					$('#no_driver').append(Order.create_order(o));
				}
				orders[o.id] = o;
				toLatLng(o.address, (function (id) {
					return function (res) {
						// coordinates returned need to be swapped
						var marker = L.marker([res.center[1], res.center[0]], {
            						icon: L.mapbox.marker.icon({
              							'marker-symbol': 'circle',
              							'marker-size': 'medium',
              							'marker-color': '#555555',
            						})
          						}).bindLabel('test');
					markers['order_' + id] = marker;
					marker.addTo(map);
					};
				})(o.id));
			}
		}
		next();
	});
}



function fix_positions(orders) {
	//console.log(orders);
	for (var pos = 0, o = orders.children().first(); o.length != 0; o = o.next()) {
		o.attr('position', pos++);
	}
}

function colexp(id) {
	var orders = $('#' + id + '> .orders');
	var span = $('#' + id + '> .driver-header > .folding-symbol');
	if (span.hasClass('collapsed')) {
		span.removeClass('collapsed').addClass('expanded');
		orders.show();
	} else {
		span.removeClass('expanded').addClass('collapsed');
		orders.hide();
	}
}
