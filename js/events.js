// uuid-esque generator for request ids used to coordinate push notifications
// received from houston via node
// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function genid_rfc4122() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    	return v.toString(16);
	});
}
var rids = [];
// show busy (spinning) cursor and prevent user actions
function busy(b) {
	if (b) {
		$('#busy-screen').show();
		$('body').addClass('cursor-wait');
	} else {
		$('#busy-screen').hide();
		$('body').removeClass('cursor-wait');
	}
}

var Events = new (function () {
	var self = this;
	this.nodrop = function (e) { };
	// XXX: drag-and-drop is f#!&ed up in html5
	this.dragstart = function (e) {
		// For now, only orders are draggable
		e.dataTransfer.setData('order-id' , $(e.target).attr('order-id'));
	};
	this.dragover = function (e) {
		e.preventDefault();
		return false;
	};
	this.driver_dragenter = function (e) { e.preventDefault();
		$(e.target).parent().addClass('driver-header-drag-enter');
	}
	this.driver_dragleave = function (e) { e.preventDefault();
		$(e.target).parent().removeClass('driver-header-drag-enter');
	}
	var _cnt = null; // counter
	this.order_dragenter  = function (e) {
		var o = $(e.target).closest('.order');
		var id = o.attr('id');
		if ('order_' + e.dataTransfer.getData('order-id') == id) { return; }
		e.preventDefault();
		if (_cnt == null) {
			_cnt = { id: id, val: 0 };
		}
		if (_cnt.id != id) {
			$('#' + _cnt.id).removeClass('order-drag-enter');

			_cnt.id = id; _cnt.val = 0;
		}
		_cnt.val++;
		o.addClass('order-drag-enter');
	};
	this.order_dragleave  = function (e) {
		e.preventDefault();
		var o = $(e.target).closest('.order');
		var id = o.attr('id');
		if (_cnt == null || _cnt.id != id) { return; }
		_cnt.val--;
		if (_cnt.val <= 0) {
			o.removeClass('order-drag-enter');
		}
	};

	this.driver_ondrop = function (e) {
		var orderId = e.dataTransfer.getData('order-id');
	var driverId = $(e.target).attr('driver-id');
	$('body').addClass('cursor-wait');
	var rid = genid_rfc4122();
	console.log("rid="+rid);
	rids.push(rid);
	$.getJSON(HOUSTON_URL + '/api/order/assign', { rid: rid, token: token, orderId: orderId, driverId: driverId, afterId: null }, function (res) {
		$('body').removeClass('cursor-wait');
		if (res.code != 0) {
			println('Error - ' + res.msg);
		} else {
			//Order.move(orderId, driverId, null);			
		}
	});
	var header = $(e.target).parent();
	header.removeClass('driver-header-drag-enter');
	_cnt = null;
	}

	this.order_ondrop = function (e) {
		var orderId = e.dataTransfer.getData('order-id');
	var after = $(e.target).closest('.order');
	after.removeClass('order-drag-enter');
	var afterId = after.attr('order-id');
	_cnt = null;
	if (orderId == afterId || $('#order_' + orderId).next().attr('order-id') == afterId) {
		//console.log('Same priority; ignoring');
		return;
	}
	var driverId = $(e.target).closest('.order').parent().attr('id').split('_')[0];
	$('body').addClass('cursor-wait');
	var rid = genid_rfc4122();
	rids.push(rid);
	$.getJSON(HOUSTON_URL + '/api/order/assign', { rid: rid, token: token, orderId: orderId, driverId: driverId, afterId: afterId }, function (res) {
		$('body').removeClass('cursor-wait');
		if (res.code != 0) {
			println('Error - ' + res.msg);
		} else {
			//Order.move(orderId, driverId, afterId);
		}
	});
	}

	this.dummy_ondrop = function (e) {
		var orderId = e.dataTransfer.getData('order-id');
		var driverId = $(e.target).attr('id').split('_')[1];
		var rid = genid_rfc4122();
		rids.push(rid);
		$('body').addClass('cursor-wait');
			$.getJSON(HOUSTON_URL + '/api/order/assign', { rid: rid, token: token, orderId: orderId, driverId: driverId, afterId: null }, function (res) {
				$('body').removeClass('cursor-wait');
				if (res.code != 0) {
					println('Error - ' + res.msg);
				} else {
					//Order.move(orderId, driverId, null);			
			}
		});
		$(e.target).removeClass('order-drag-enter');
		_cnt = null;
	}

	this.order_unassign = function (orderId) {
		$('body').addClass('cursor-wait');
			$.getJSON(HOUSTON_URL + '/api/order/assign', { token: token, orderId: orderId, driverId: null, afterId: null }, function (res) {
				$('body').removeClass('cursor-wait');
				if (res.code != 0) {
					println('Error - ' + res.msg);
				} else {
					//Order.move(orderId, driverId, null);			
			}
		});
		$('#order_'+orderId).removeClass('order-drag-enter');
		_cnt = null;
	}

	this.order_delete = function (orderId) {
		var order = g.orders[orderId];
		$('body').addClass('cursor-wait');
		// First unassign the order
		$.getJSON(HOUSTON_URL + '/api/order/assign', { token: token, orderId: order.id, driverId: null, afterId: null }, function (res) {
			$('body').removeClass('cursor-wait');
			if (res.code != 0) {
				println('Error - Failed to unassign before deleting - ' + res.msg);
			} else {
				// Then delete
				$('body').addClass('cursor-wait');
				$.getJSON(HOUSTON_URL + '/api/order/delete', { token: token, orderId: order.id }, function (res) {
					$('body').removeClass('cursor-wait');
					if (res.code != 0) {
						println('Error - The order was unassigned but failed to delete - ' + res.msg);
					} else {
						//Order.move(orderId, driverId, null);			
					}
				});
			}
		});
	}

	this.order_view = function (orderId) {
		var order = g.orders[orderId];
		$('#show-order-title').text('Order ' + order.id);
		var address = order.address;
		var info = order.name + "\n" + order.phone + "\n\n" + address.street + "\n" + address.city + " " +
			address.region + " " + address.zipCode + "\n" + address.country;
		switch (order['@class']) {
			case 'String':
				info = info + "\n\n" + order.item;
				break;
		    case 'Bento':
		    	info += "\n\n" + constructBentoOrderString(order);
		    	break;
			default:
				println('Error - Trying to render order of unsupported type' + order['@class']);
				return;
		}
		info = info + "\n\nNotes for driver:\n" + order.notes;
		$('#show-order-textarea').val(info);
		var first = order.name.split(" ")[0];
		var lowerEta = simpleSystemEta;
		var upperEta = simpleSystemEta + 10;
		var dyfault = 'Hi ' + first + ",\nThanks for ordering Bento! Your order should arrive in about " + lowerEta + "-" + upperEta + " minutes. We'll message you once your order is on its way.";
		$('#sms-textarea').val(dyfault);
		$('#show-order-feedback').html('');
		$('#send-sms').attr("onclick", "Events.sendSms('" + order.id + "', $('#sms-textarea').val());");
		$('#show-order').show();
	};

	this.resync = function () {
		var box = $('#dialogue-textarea');
		box.val('');
		try {
			$('body').addClass('cursor-wait');
			box.val(box.val() + 'Starting resync\n');
			$('#fullscreen-dialogue').show();
			box.val(box.val() + 'Flushing redis\n');
			$.getJSON(HOUSTON_URL + '/api/flushdb', { token: token }, function (res) {
				if (res.code != 0) {
					throw res.msg;
				} else {
					box.val(box.val() + 'Done\nResyncing drivers\n');
					$.getJSON(HOUSTON_URL + '/api/syncDrivers', { token: token }, function (res) {
						if (res.code != 0) {
							throw res.msg;
						} else {
							box.val(box.val() + 'Done\nResyncing orders\n');
							$.getJSON(HOUSTON_URL + '/api/syncOrders', { token: token }, function (res) {
								if (res.code != 0) {
									throw res.msg;
								} else {
									box.val(box.val() + 'Done\nRefreshing Atlas');
									init();
									$('body').removeClass('cursor-wait');
									$('#fullscreen-dialogue').hide();
								}
							});
						}
					});
				}
			});
		} catch (err) {
			$('body').removeClass('cursor-wait');
			$('#fullscreen-dialogue').hide();
			println('Error - ' + err);
		}
	};

	this.sendSms = function (orderId, msg) {
		// Temporarily disable the submit button
		$('#send-sms').prop('disabled', true);
		$('#show-order-feedback').html('Please wait');
		$.getJSON(HOUSTON_URL + '/api/sms/send', { orderId: orderId, msg: msg, token: token }, function (res) {
			if (res.code != 0) {
				$('#show-order-feedback').html(res.msg);
			} else {
				$('#show-order-feedback').html('Success!');
			}
		}).fail(function () {
			$('#show-order-feedback').html('Unable to send SMS. Are you connected to the Internet?');
		}).always(function() {
			$('#send-sms').prop('disabled', false);
  		});
	};

	this.updateOrder = function (orderId, order) {
		// Replace
		g.orders[orderId] = order;
		// Remove marker from map
        var marker = markers['order_' + orderId];
        map.removeLayer(marker);
        delete markers['order_' + orderId];
        // Remove order
        render_order(order);
	}

})();

function constructBentoOrderString(order) {
	if (order.orderString != null && order.orderString != "") {
		return order.orderString.replace(/\\n/g, "\n");
	} else {
		var str = "";
		var bento = order.item;
		for (var i = 0; i < bento.length; i++) {
		    var box = bento[i];
		    str += "BENTO BOX " + (i+1) + "\n=========================\n";
		    var dishes = box.items;
		    for (var j = 0; j < dishes.length; j++) {
		    	var dish = dishes[j];
		    	str += dish.type + ':\t(' + dish.label + ')\t' + dish.name + "\n";
		    }
		    str += "\n";
		}
		return str;
	}
}
