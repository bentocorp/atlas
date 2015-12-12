function refresh_status_symbol(order) {
	var id = '#order_' + order.id + ' > .order-status-symbol';
	var symbol = $(id);
	if (symbol.length > 0) {
		switch (order.status.toLowerCase()) {
			case 'pending':
			case 'unassigned': symbol.html('N'); break;
			case 'rejected': symbol.html('&#x2715;'); break;
			case 'modified': symbol.html('!'); break;
			case 'accepted': symbol.html('&#x2691;'); break;
			case 'complete':
				symbol.html('&#x2713;');
				$('#' + order.driverId + '_orders-complete').append($('#order_' + order.id));
				break;
			default:
		}
		symbol.attr('class', 'order-status-symbol').addClass(order.status.toLowerCase());

	} else {
		throw id + ' not found';
	}
}

// TODO - Since orders can now be modified, change parameter order to orderId
function create_menu(items, order, driver) {
	var menu = $('<div>').addClass('actions-menu').addClass('gone').append('<span class="menu-group">Actions</span>').mouseleave(function () { $(this).hide(); });
	menu.attr('id', 'actions-menu_' + order.id);
	for (var i = 0; i < items.length; i++) {
		var el = $('<div>').addClass('menu-item');
		var action = items[i];
		switch (action) {
			case 'view-order':
				el.html('View Order').click(function () {
					Events.order_view(order.id);
				});
				break;
			case 'text':
				el.html('Text ' + order.name).click(function () { });
				break;
			case 'unassign':
				el.html('Unassign').click(function () {
					Events.order_unassign(order.id);
					$('#actions-menu_' + order.id).hide();
				});
				break;
			case 'modify':
				el.html('Modify').click(function () {
					prepare_modify_form(order.id);
					$('#actions-menu_' + order.id).hide();
				});
				break;
			case 'delete-order':
				el.html('Cancel Order').click(function () {
					Events.order_delete(order.id);
					$('#actions-menu_' + order.id).hide();
				});
				break;
			default:
				throw 'Error - menu item ' + action + ' not recognized'
		}
		el.addClass('action-' + action)
          .mouseenter(function () { $(this).toggleClass('menu-select'); })
          .mouseleave(function () { $(this).toggleClass('menu-select'); });
		menu.append(el);
	}
	return menu;
}

function create_order_div(order) {
	/* Make actions menu */
	var gearIcon = $('<img>').addClass('gear-icon').attr('src', 'img/gear.png').hide();
	var menu = create_menu(['view-order', 'text', 'unassign', 'modify', 'delete-order'], order);
	var actions = $('<span>').addClass('actions').append(menu).append(gearIcon);
	gearIcon.click(function () { $(this).hide(); menu.show(); });
	var o = $('<div>').attr('id', 'order_' + order.id).attr('order-id', order.id).addClass('order')
		.append('<span class="order-status-symbol modified hidden"></span>')
		.append('<span class="order-address">' + order.address.street + '</span>')
		.append('<span class="order-name">' + order.name + '</span>').append(actions);
	o.mouseenter(function () {
		gearIcon.show();
		var marker = markers['order_' + order.id];
		if (marker != null) {
			//marker.setZIndexOffset(999);
			marker.setIcon(mkIcon(order.id, 'large'));
		}
	}).mouseleave(function () {
		gearIcon.hide();
		var marker = markers['order_' + order.id];
		if (marker != null) {
			//marker.setZIndexOffset(998);
			marker.setIcon(mkIcon(order.id, 'medium'));
		}
	});
	var status = order.status.toLowerCase();
	if ('complete' == status) {
		menu.children('.action-unassign, .action-modify, .action-delete-order').hide();
		// no drag-and-drop for completed orders
		$('#driver_' + order.driverId + ' > .driver-header > .folding-symbol').removeClass('transparent');
	} else if ('unassigned' == status) {
		menu.children('.action-unassign').hide();
		// dragging allowed but no repositioning (dropping) necessary for unassigned orders
		o.attr('draggable', true).attr('ondragstart', 'Events.dragstart(event);').attr('ondragover', 'Events.dragover(event);').css('cursor', 'pointer');
	} else {
		o.attr('draggable', true).attr('ondragstart', 'Events.dragstart(event);').css('cursor', 'pointer');
		$('#driver_' + order.driverId + ' > .driver-header > .folding-symbol').removeClass('transparent');
		o.attr('ondragover' , 'Events.dragover(event);')
		 .attr('ondragenter', 'Events.order_dragenter(event, "order");')
		 .attr('ondragleave', 'Events.order_dragleave(event, "order");')
		 .attr('ondrop'     , 'Events.order_ondrop(event);');
	}
	return o;
}

function render_order(order) {
	var o = create_order_div(order);
	var existing = $('#order_' + order.id);
	var status = order.status.toLowerCase();
	if (existing.length > 0) {
		existing.replaceWith(o);
	} else if ('complete' == status) {
		var c = $('#' + order.driverId + '_orders-complete');
		if (c.length > 0) {
			c.append(o);
		} else {
			throw order.driverId + '_orders-complete not found for order ' + order.id;
		}
	} else if ('unassigned' == status) {
		$('#0_orders-pending').append(o);
	} else {
		var after = $('#' + order.driverId + '_orders-pending').children(':last');
		if (!after.hasClass('order-dummy')) {
			throw "Error - can't insert new order in " + order.driverId + '_orders-pending because dummy order was not found';
		}
		o.insertBefore(after);
		$("#" + order.driverId + "_orders").show();
		$('#driver_' + order.driverId + ' > .driver-header > .folding-symbol').removeClass('collapsed').addClass('expanded');
	}
	refresh_status_symbol(order);
	// draw order on map if not complete
	var driver = g.drivers[order.driverId];
	if ('complete' != status && ((driver != null && driver.status=='ONLINE') || order.driverId <= 0)) {
		addOrderToMap(order);
	}
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
	var menu = $('<div>').addClass('actions-menu').addClass('hidden');
	var actions = $('<span>').addClass('actions').append(menu).append(gearIcon);
	var driverHeader = $('<div>').addClass('driver-header')
	  	.append(fold)
	  	.append('<span class="status-symbol ' + status + '"></span>')
	  	.append('<span driver-id="'+driver.id+'" class="driver-name" ondragover="Events.dragover(event);" ondragenter="Events.driver_dragenter(event);" ondragleave="Events.driver_dragleave(event);" ondrop="Events.driver_ondrop(event);">' + driver.name + '</span>')
	  	.append(actions);
	driverHeader.mouseenter(function () { 
		gearIcon.toggle();
		var marker = markers['driver_' + driver.id];
		if (marker != null) {
			marker.setIcon(L.icon({
        		iconUrl: 'img/circle-12-yellow.svg',
            	iconSize: [24, 24],
        	}));
		}
	}).mouseleave(function () {
		gearIcon.toggle();
		var marker = markers['driver_' + driver.id];
		if (marker != null) {
			marker.setIcon(L.icon({
        		iconUrl: 'img/circle-12.svg',
            	iconSize: [18, 18],
        	}));
		}
	});
	// orders
	var _mkOrderStatusHeader = function (divId, text) {
		var label = (text == 'Complete') ? 'Show' : 'Hide';
		var hide = $('<span>').addClass('hide').html(label).click(function () {
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
		.append('<div id="' + driver.id + '_orders-complete" style="display: none;"></div>');
	// Initialize order container with a dummy order (for drag and drop)
	orders.children('#' + driver.id + '_orders-pending').append(
	  '<div id="dummy_'+ driver.id + '" class="order order-dummy" priority="-1" ondragover="Events.dragover(event);" ondragenter="Events.order_dragenter(event);" ondragleave="Events.order_dragleave(event);" ondrop="Events.dummy_ondrop(event);"></div>'
	);

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

var token;
var clientId;

function clear() {
	g.drivers = { };
	g['orders'] = { };
	$('#0_orders-pending, #online-drivers, #offline-drivers').html('');
	map.eachLayer(function (layer) {
		if (layer instanceof L.Marker) {
			map.removeLayer(layer);
		}
	});
	markers = { };
}


function init() {
	busy(true);
	clear();
	// First, get drivers
	$.getJSON(HOUSTON_URL + '/api/driver/getAll', { token: token }).done(function (res) {
    	if (res.code != 0) {
       		println('Error fetching driver data from houston - ' + res.msg);
       	} else {
       		var drivers = res.ret;
       		println('Retrieved ' + drivers.length + ' drivers');
       		// Then get orders
       		$.getJSON(HOUSTON_URL + '/api/order/getAll', { token: token }, function (res) {
				if (res.code != 0) {
					println('Error fetching orders from houston - ' + res.msg);
				} else {
					var orders = res.ret;
					var orderCnt = 0;
       				for (var i = 0; i < drivers.length; i++) {
       					var driver = drivers[i];
       					render_driver(driver);
       					g.drivers[parseInt(driver.id)] = driver;
       					// Track each driver
       					soc.emit('get', '/api/track?clientId=d-' + driver.id + '&token=' + token, function (str) {
       						var res = JSON.parse(str);
       						if (res.code != 0) {
       							println('Error tracking ' + res.ret.clientId + ' - ' + res.msg);
       						} else {
       							// console.log('Tracking ' + res.ret.clientId);
       						}
       					});
 						var q = driver.orderQueue;
       					for (var j = 0; j < q.length; j++) {
       						var order = orders[q[j]];
       						//order.priority = j; // XXX: This will be used by the front-end to help with reprioritizing orders
       						if (order == null) {
       							println('Error - order ' + q[j] + ' not found for driver ' + driver.id);
       						} else {
       							orderCnt++;
       							g['orders'][order.id] = order;
       							if (order.driverId != driver.id) {
       								println('Error - corrupted data? Rendering order ' + order.id + ' for driver ' + driver.id + ' but the order is assigned to ' + order.driverId);
       							}
       							render_order(order);
								delete orders[order.id];
       						}
       					}
       				}
       				// render the remaining orders
					for (var key in orders) {
						if (orders.hasOwnProperty(key)) {
							orderCnt++;
							var status = orders[key].status.toLowerCase();
							if (status != 'unassigned' && status != 'complete') {
								println('Error - corrupted data? Order ' + key + ' has status ' + status + ' but was not rendered with driver ' + orders[key].driverId);
							} else {
								g['orders'][key] = orders[key];
								render_order(orders[key]);
							}
						}
					}
					println('Fetched ' + orderCnt + ' orders')
					// UTC timestamp
					readyTs = new Date().getTime();
					busy(false);
				}
			});
       	}
    }).fail(function (jqxhr, textStatus, error) {
		println('ERROR - Problem connecting to ' + HOUSTON_URL);
	});
}

var soc;
var readyTs = -1;

function logout() {
	clear();
	soc.disconnect();
	println('Logged out');
	$('#settings').hide();
	$('#credentials').show();
}

function connect() {
    if (soc != null && !soc.disconnected) {
   		println('Connection in progress');
   		return;
    }
    println('Connecting to node at ' + NODE_URL);
    
    soc = io.connect(NODE_URL, { timeout: 5000 /* 5 seconds */, 'forceNew': true, });
    
    soc.on('error', function (e) {
    	println(e);
    });

    soc.on('disconnect', function () {
    	println('Disconnected');
    });

    soc.on('connect', function () {
    	println('Connection established');
        println('Authenticating');
        soc.emit('get', '/api/authenticate?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&type=admin', function (data) {
        	var res = JSON.parse(data);
        	if (res.code != 0) {
        		println('Error authenticating - ' + res.msg);
        	} else {
        		token = res.ret['token'];
        		clientId = res.ret['uid'];
        		println(token);
        		$('#credentials').hide();
        		$('#login-message').html('Logged in as ' + username);
        		$('#settings').show();
        		init();
        	}
        });
    });
	
    soc.on('stat', function (data) {
    	var push = JSON.parse(data);
    	//console.log(push);
    	var clientId = parseInt(push.clientId.split("-")[1]);
    	var driver = $('#driver_' + clientId);
    	if (g.drivers[clientId] == null) {
    		// This can happen if we receive push notifications before we finish processing data from Houston
    		console.log('Error - g.drivers[' + clientId + '] == null');
    		return;
    	}
    	if (push.status == 'connected') {
    		g.drivers[clientId].status='ONLINE';
    		$('#online-drivers').append(driver);
    		driver.children('.driver-header').children('.status-symbol').removeClass('offline').addClass('online');
    	} else if (push.status == 'disconnected') {
    		g.drivers[clientId].status='OFFLINE';
    		$('#offline-drivers').append(driver);
    		driver.children('.driver-header').children('.status-symbol').removeClass('online').addClass('offline');
    		if (markers['driver_' + clientId] != null) {
    			map.removeLayer(markers['driver_' + clientId]);
    			delete markers['driver_' + clientId];
    		}
    	}
    });


    soc.on('loc', function (data) {
        var e = JSON.parse(data);
        var clientId = parseInt(e.clientId.split("-")[1]);
        //console.log(e);
        //console.log(g.drivers);
        if (g.drivers[clientId] == null || g.drivers[clientId].status.toLowerCase()=='offline') {
        	// node is always writing to atlas. communication failure to Houston will make us enter this block
        	console.log(clientId);
        	console.log(g.drivers[clientId]);
        	return;
        }
        var msg = "Location update for client " + clientId + ": (" + e.lat + ", " + e.lng + ")";
        //println(msg);
        var p = [e.lat, e.lng];
        console.log(g.drivers[clientId].name + " @ " + p);
        if (markers['driver_' + clientId] == null) {
          console.log('Adding to map');
          markers['driver_'+clientId] = L.marker(p, {
            icon: L.icon({
               iconUrl: 'img/circle-12.svg',
               iconSize: [18, 18],
            })
          }).bindLabel(g.drivers[clientId].name);
          var m = markers['driver_' + clientId];
          m.on('mouseover', function () {
        	drawRoute(clientId);
          });
          m.on('mouseout', function () {
          	hideRoute(clientId);
          });
          markers['driver_' + clientId].setZIndexOffset(999);
          markers['driver_' + clientId].addTo(map);
        } else {
          markers['driver_' + clientId].setLatLng(L.latLng(e.lat, e.lng));
        }
      });

    soc.on('push', function (data) {
        var push = JSON.parse(data);console.log(push);
        var subject = push.subject.toLowerCase();
        
        var i = rids.indexOf(push.rid); // rids from events.js
        console.log('push.rid=' + push.rid + ', i=' + i); console.log(rids);
        if (i >= 0) {
        	rids.splice(i, 1);
        	if (rids.length <= 0) {
        		//busy(false); Make sure not to conflict with init()
        	}
        }
        // Ignore out-dated push notifications
        /*
        if (push.timestamp < readyTs) {
        	// because each server may have a slightly different view of time, this will not always be accurate
        	// and so it is also important that order functions such as assignment are also idempotent
        	// Note some servers may be ahead as 2 minutes
        	console.log('Out-dated push for readyTs=' + readyTs);
        	console.log(push);
        	return;
        }
        */
        switch (subject) {
        	case 'sse_update':
        		var sse = push.body;
        		console.log('SSE=' + sse);
        		$('#sse').html('SSE: ' + sse + 'm');
        		break;
        	case 'order_action':
        		var action = push.body;console.log(action);
        		var type = action.type.toLowerCase();
        		var order = action.order;
        		if (type == 'create') {
        			if (order.driverId && order.driverId >= 0 && g.drivers[order.driverId] == null) {
        				throw 'Error - the order was assigned to a driver that does not exist';
        			}
        			if (order.driverId != null && order.driverId > 0) {
        				var driver = g.drivers[order.driverId];
        				if (driver != null) {
							driver.orderQueue.push(order.id);
        				} else {
        					println('Error - new order assigned to non-existent driver ' + order.driverId);
        				}
        			}
        			render_order(order);
        			g.orders[order.id] = order;
        		} else if (type == 'assign') {
        			Order.move(order.id, action.driverId, action.after);
        			if (order.driverId != null && order.driverId > 0) {
        			    g.orders[order.id] = order;
        				if (i >= 0) {
        					Events.order_view(order.id);
        				}
        			}
        			console.log(">>"+g.orders[order.id].status);
        			refresh_status_symbol(order);
        			recolor(order);
        		} else if (type == 'delete') {
        			Order.delete(order.id);
        		} else if (type == 'modify' && i < 0) {
        			Events.updateOrder(order.id, order);
        			println('Order ' + order.id + ' updated');
                    fade($('#order_' + order.id), 500, [255, 255, 153, 1.0]);
        		}
        		break;
        	case 'order_status':
        		var body = push.body;
        		console.log(body.orderId + ', ' + body.status);
        		var order = g.orders[body.orderId];
        		if (order == undefined) {
        			console.log(g.orders);
        		}
        		order.status = body.status;
        		refresh_status_symbol(order);
        		if (order.status.toLowerCase() == 'complete') {
        			// If complete, remove order marker from map and remove order from driver's queue
        			var orderMarker = markers['order_' + order.id];
        			if (orderMarker != null) {
        				map.removeLayer(orderMarker);
        			}
        			delete markers['order_' + order.id];
        			var driver = g.drivers[order.driverId];
        			var orderQueue = driver.orderQueue;
        			var j = orderQueue.indexOf(order.id);
        			if (j < 0) {
        				var msg = "Error - order " + order.id + " marked as complete for driver " + order.driverId + " but not found in queue";
        				println(msg);
        				console.log(msg); console.log(order); console.log(driver);
        			} else {
        				orderQueue.splice(j, 1);
        			}
        			$('#order_' + order.id + '> .actions > .actions-menu > .action-unassign').hide();
        			$('#order_' + order.id + '> .actions > .actions-menu > .action-delete-order').hide();
        			$('#order_' + order.id + '> .actions > .actions-menu > .action-modify').hide();
        		} else {
        			recolor(order);
        		}
        		break;
        	default:
        		println('Unsupported subject ' + subject);
        }
    });

}
