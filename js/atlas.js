




var atlas = {
	event_handlers: {
		dragdrop : {
			ondragstart: function (e) {
				// For now, only orders are draggable
				e.dataTransfer.setData('order-id' , $(e.target).attr('id'));
				var current_driver = $(e.target).closest('.driver-container').attr('id');
			
				console.log('setting current_driver='+current_driver);
				e.dataTransfer.setData('current-driver', current_driver);
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
					
					var orderId = e.dataTransfer.getData('order-id').split('_')[1];
					var current_driver = e.dataTransfer.getData('current-driver');
					var o = orders[orderId];
					var target = $(e.target);
					var test = target.closest('.driver-container').attr('id');
					console.log(current_driver);
					console.log(test);
					if (o.status == 'rejected' || (o.status == 'unassigned' && current_driver != test)) {
						o.status='unassigned';
						var order = $('#' + e.dataTransfer.getData('order-id')), // The order being moved
					    driverId = target.closest('.driver-container').attr('id');
						Order.push(order, driverId);
						target.closest('.driver-header').css('background-color', 'transparent');
						Order.assign(orderId, driverId.split('_')[1]);
						order.css('color', '#444444').css('font-weight', 'normal');
					}
				},
			},
		},
	},
};


/**
 * Each order is assigned an integer priority
 * - only pending orders can be rearranged
 */
function insert_order(order, driverId, priority) {
	var p = $('#' + driverId + '_orders-pending');
	if (p.length <= 0) {
		throw driverId + '_orders-pending not found for order ' + order.id;
	}
	var after = null;
	p.children().each(function (i) {
		var el = $(this);
		var p = parseInt(el.attr('priority'));
		if (after != null && p != -1) {
			// We've found the insertion point and so increment the priority of all
			// subsequent orders by 1
			el.attr('priority', p + 1);
		} else if (priority < p) {
			after = el;
			el.attr('priority', p + 1);
		} else if (p == -1) {
			after = el;
		}
	});
	if (after == null) {
		throw 'Insertion point not found for ' + order.attr('id') + ' with priority ' + priority + ' in ' + driverId + '_orders-pending';
	}
	order.insertBefore(after);
	order.attr('priority', priority);
	$('#driver_' + driverId + ' > .driver-header > .folding-symbol').removeClass('transparent');
}

function refresh_status_symbol(order) {
	var id = '#order_' + order.id + ' > .order-status-symbol';
	var symbol = $(id);
	if (symbol.length > 0) {
		switch (order.status.toLowerCase()) {
			case 'unassigned': symbol.html('N'); break;
			case 'rejected': symbol.html('&#x2715;'); break;
			case 'modified': symbol.html('!'); break;
			case 'accepted': symbol.html('&#x2691;'); break;
			case 'complete': symbol.html('&#x2713;'); break;
			default:
		}
		symbol.attr('class', 'order-status-symbol').addClass(order.status.toLowerCase());

	} else {
		throw id + ' not found';
	}
}

function render_order(order) {
	if ($('#order_' + order.id).length > 0) {
		return;
	}
	var gearIcon = $('<img>').addClass('gear-icon').attr('src', 'img/gear.png').hide();
	var settings = $('<span>').css('display', 'table-cell').css('vertical-align', 'middle').css('text-align', 'right').append(gearIcon);
	var o = $('<div>').attr('id', 'order_' + order.id).addClass('order')
		.append('<span class="order-status-symbol modified hidden"></span>')
		.append('<span class="order-address">' + order.address.street + '</span>')
		.append('<span class="order-name">' + order.name + '</span>').append(settings);
	o.mouseenter(function () { gearIcon.toggle(); }).mouseleave(function () { gearIcon.toggle(); });
	var status = order.status.toLowerCase();
	if ('complete' == status) {
		var c = $('#' + order.driverId + '_orders-complete');
		if (c.length > 0) {
			c.append(o);
		} else {
			throw order.driverId + '_orders-complete not found for order ' + order.id;
		}
	} else if ('unassigned' == status) {
		o.attr('draggable', true);
		$('#0_orders-pending').append(o);
	} else {
		o.attr('draggable', true);
		insert_order(o, order.driverId, order.priority);
	}
	refresh_status_symbol(order);
	/* drag-and-drop */
	o.attr('ondragover', 'Events.dragover(event);').attr('ondragstart', 'Events.dragstart(event);').attr('ondragenter', 'Events.order_dragenter(event);')
		.attr('ondragleave', 'Events.order_dragleave(event);');
}

function render_driver(driver) {
	if ($('#driver_' + driver.id).length > 0) {
		return;
	}
	// driver-container
	var container = $('<div>').attr('id', 'driver_' + driver.id).addClass('driver-container');
	// driver-header
	var fold = $('<span>').addClass('folding-symbol').addClass('collapsed').addClass('transparent').click(function () {
		$('#' + driver.id + '_orders').toggle();
		$(this).toggleClass('collapsed').toggleClass('expanded');
	});
	var status = driver.status.toLowerCase();
	var gearIcon = $('<img>').addClass('gear-icon').attr('src', 'img/gear.png').hide();
	var driverHeader = $('<div>').addClass('driver-header')
	  	.append(fold)
	  	.append('<span class="status-symbol ' + status + '"></span>')
	  	.append('<span class="driver-name">' + driver.name + '</span>')
	  	.append(gearIcon);
	driverHeader.mouseenter(function () { gearIcon.toggle(); }).mouseleave(function () { gearIcon.toggle(); });
	// orders
	var _mkOrderStatusHeader = function (divId, text) {
		var hide = $('<span>').addClass('hide').html('Hide').click(function () {
			$('#' + divId).toggle();
			if ($('#' + divId).is(':visible')) {
				hide.html('Hide');
			} else {
				hide.html('Show');
			}
		});
		return $('<div>').addClass('order-status-header').html(text).append(hide);
	}
	var orders = $('<div>').attr('id', driver.id + '_orders').addClass("orders").hide()
		.append(_mkOrderStatusHeader(driver.id + '_orders-pending', 'Pending'))
		.append('<div id="' + driver.id + '_orders-pending"></div>')
		.append(_mkOrderStatusHeader(driver.id + '_orders-complete', 'Complete'))
		.append('<div id="' + driver.id + '_orders-complete"></div>');
	// Initialize order container with a dummy order (for drag and drop)
	orders.children('#' + driver.id + '_orders-pending').append('<div class="order dummy" priority="-1">');

	// Add driver and order to driver-container
	container.append(driverHeader).append(orders);
	if (status == 'online') {
		$('#online-drivers').append(container);
	} else if (status == 'offline') {
		$('#offline-drivers').append(container);
	} else {
		console.log('Encountered unsupported status while rendering driver ' + driver.id + ' - ' + status);
	}
}

function greet() {
	var msg = 'Bento rocks!';
	console.log(msg);
	println(msg);
}

var g = {
	drivers: { }, orders: { }, markers: { }
}
var node_url = "http://localhost:8081"
//var node_url = "http://bento-dev-nodejs01:8081"
var houston_url = 'http://localhost:9000';
//var houston_url = 'http://bento-dev-houston01:8081'
var token;

function init() {
	g['drivers'] = { };
	g['orders'] = { };
	//$('#online-drivers, #offline-drivers, #new-orders').html('');
	// First, get drivers
	$.getJSON(houston_url + '/api/get_drivers', { }).done(function (res) {
    	if (res.code != 0) {
       		println('Error fetching driver data from houston - ' + res.msg);
       	} else {
       		var drivers = res.ret;
       		println('Retrieved ' + drivers.length + ' drivers');
       		for (var i = 0; i < drivers.length; i++) {
       			var driver = drivers[i];
       			render_driver(driver);
       			g['drivers'][driver.id] = driver;
       			// Track each driver
       			soc.emit('get', '/api/track?uid=atlas01&client_id=' + driver.id + '&token=' + token, function (str) {
       				var res = JSON.parse(str);
       				if (res.code != 0) {
       					println('Error tracking ' + res.ret.clientId + ' - ' + res.msg);
       				} else {
       					// console.log('Tracking ' + res.ret.clientId);
       				}
       			});
       		}
       		// Then get orders
       		$.getJSON(houston_url + '/api/get_orders', { }, function (res) {
				if (res.code != 0) {
					println('Error fetching orders from houston - ' + res.msg);
				} else {
					var orders = res.ret;
					println('Fetched ' + orders.length + ' orders')
					for (var i = 0; i < orders.length; i++) {
						var order = orders[i];
						render_order(order);
						g['orders'][order.id] = order;
						toLatLng(order.address, (function (id) {
							return function (res) {
								var o = g['orders'][id];
								// coordinates returned need to be swapped
								var marker = L.marker([res.center[1], res.center[0]], {
            						icon: L.mapbox.marker.icon({
              							//'marker-symbol': 'circle',
              							'marker-size': 'medium',
              							'marker-color': get_order_color(o.status),
            						})
          						}).bindLabel(o.name);
								markers['order_' + id] = marker;
								marker.addTo(map);
							};
						})(order.id));
					}
				}
			});
       	}
    });
}

var soc;

function connect() {
    println('Connecting to node');
    
    soc = io.connect(node_url, { query: 'uid=atlas01', timeout: 5000 /* 5 seconds */ });
    
    soc.on('error', function (e) {
    	println(e);
    });

    soc.on('disconnect', function () {
    	println('Disconnected');
    });

    soc.on('connect', function () {
    	println('Connection established');
        println('Authenticating');
        soc.emit('get', '/api/authenticate?username=atlas01&password=password', function (data) {
        	var res = JSON.parse(data);
        	if (res.code != 0) {
        		println('Error authenticating - ' + res.msg);
        	} else {
        		token = res.ret['token'];
        		println(token);
        		init();
        	}
        });
    });
	
    soc.on('stat', function (data) {
    	var push = JSON.parse(data);
    	var clientId = push.clientId;
    	var driver = $('#driver_' + clientId);
    	if (push.status == 'connected') {
    		$('#online-drivers').append(driver);
    		driver.children('.driver-header').children('.status-symbol').removeClass('offline').addClass('online');
    		drivers['online'][clientId] = drivers['offline'][clientId];
    		delete drivers['offline'][clientId];
    	} else if (push.status == 'disconnected') {
    		$('#offline-drivers').append(driver);
    		driver.children('.driver-header').children('.status-symbol').removeClass('online').addClass('offline');
    		if (markers['driver_' + clientId] != 'undefined') {
    			markers['driver_' + clientId].remove
    		}
    	}
    });


    soc.on('loc', function (data) {
        var e = JSON.parse(data);
        var clientId = e.clientId;
        //console.log(e);
        if (typeof drivers['online'][clientId] == 'undefined') {

        	return;
        }
        var msg = "Location update for client " + clientId + ": (" + e.lat + ", " + e.lng + ")";
        //println(msg);
        var p = [e.lat, e.lng];
        if (markers['driver_' + clientId] == null) {
          markers['driver_'+clientId] = L.marker(p, {
            icon: L.icon({
            	iconUrl: 'img/car-black.png',
            	iconSize: [32, 32],
            })
          }).bindLabel(clientId);
          markers['driver_' + clientId].addTo(map);
        } else {
        //  console.log('here');
          markers['driver_' + clientId].setLatLng(L.latLng(e.lat, e.lng));
        }
      });

    soc.on('push', function (data) {
        var push = JSON.parse(data);
        var body = JSON.parse(push.body);
      	switch (push.subject) {
      		case 'order_status':
      			var o = orders[body.orderId];
      			var status = body.status.toLowerCase();
      			o.status = status;
      			recolor($('#order_' + o.id));
      			if (status == 'accepted' || status == 'complete') {
      				$('#order_' + o.id).attr('draggable', false);
      			} else {
      				$('#order_' + o.id).attr('draggable', true);
      			}
      			break;
      	}  
    });

}
