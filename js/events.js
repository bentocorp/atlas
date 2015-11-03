// uuid-esque generator for request ids used to coordinate push notifications
// received from houston via node
// http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function genid_rfc4122() {
	'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
	$.getJSON(HOUSTON_URL + '/api/order/assign', { token: token, orderId: orderId, driverId: driverId, afterId: null }, function (res) {
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
	$.getJSON(HOUSTON_URL + '/api/order/assign', { token: token, orderId: orderId, driverId: driverId, afterId: afterId }, function (res) {
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
		$('body').addClass('cursor-wait');
			$.getJSON(HOUSTON_URL + '/api/order/assign', { token: token, orderId: orderId, driverId: driverId, afterId: null }, function (res) {
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

	this.order_unassign = function (order) {
		$('body').addClass('cursor-wait');
			$.getJSON(HOUSTON_URL + '/api/order/assign', { token: token, orderId: order.id, driverId: null, afterId: null }, function (res) {
				$('body').removeClass('cursor-wait');
				if (res.code != 0) {
					println('Error - ' + res.msg);
				} else {
					//Order.move(orderId, driverId, null);			
			}
		});
		$('#order_'+order.id).removeClass('order-drag-enter');
		_cnt = null;
	}

	this.order_delete = function (order) {
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

	this.order_view = function (order) {
		console.log(order);
		$('#show-order-title').text('Order ' + order.id);
		var address = order.address;
		var info = order.name + "\n" + order.phone + "\n\n" + address.street + "\n" + address.city + " " +
			address.region + " " + address.zipCode + "\n" + address.country;
		switch (order['@class']) {
			case 'String':
				info = info + "\n\n" + order.item;
				break;
		    case 'Bento':
		    	var bento = order.item;
		    	for (var i = 0; i < bento.length; i++) {
		    		var box = bento[i];
		    		info += "\n\nBENTO BOX " + (i+1) + "\n-----------\n";
		    		var dishes = box.items;
		    		for (var j = 0; j < dishes.length; j++) {
		    			var dish = dishes[j];
		    			info += dish.type + ': (' + dish.label + ') ' + dish.name + "\n";
		    		}
		    		info += "\n\n";
		    	}
		    	break;
			default:
				println('Error - Trying to render order of unsupported type' + order['@class']);
				return;
		}
		$('#show-order-textarea').val(info);
		var first = order.name.split(" ")[0];
		var dyfault = 'Hey ' + first + '! Your Bento server is about 20 minutes away. Thanks for being patient and enjoy your Bento!';
		$('#sms-textarea').val(dyfault);
		$('#show-order-feedback').val('');
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
			$.getJSON(HOUSTON_URL + '/api/flushdb', { }, function (res) {
				if (res.code != 0) {
					throw res.msg;
				} else {
					box.val(box.val() + 'Done\nResyncing drivers\n');
					$.getJSON(HOUSTON_URL + '/api/syncDrivers', { }, function (res) {
						if (res.code != 0) {
							throw res.msg;
						} else {
							box.val(box.val() + 'Done\nResyncing orders\n');
							$.getJSON(HOUSTON_URL + '/api/syncOrders', { }, function (res) {
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
		$.getJSON(HOUSTON_URL + '/api/sms/send', { orderId: orderId, msg: msg }, function (res) {
			if (res.code != 0) {
				$('#show-order-feedback').html(res.msg);
			} else {
				$('#show-order-feedback').html('Success!');
			}
		});
	};

})();
