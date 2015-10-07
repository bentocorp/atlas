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
	$.getJSON(houston_url + '/api/order/assign', { orderId: orderId, driverId: driverId, afterId: -1 }, function (res) {
		$('body').removeClass('cursor-wait');
		if (res.code != 0) {
			println('Error - ' + res.msg);
		} else {
			//Order.move(orderId, driverId, -1);			
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
	$.getJSON(houston_url + '/api/order/assign', { orderId: orderId, driverId: driverId, afterId: afterId }, function (res) {
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
			$.getJSON(houston_url + '/api/order/assign', { orderId: orderId, driverId: driverId, afterId: -1 }, function (res) {
				$('body').removeClass('cursor-wait');
				if (res.code != 0) {
					println('Error - ' + res.msg);
				} else {
					//Order.move(orderId, driverId, -1);			
			}
		});
		$(e.target).removeClass('order-drag-enter');
		_cnt = null;
	}

	this.order_unassign = function (order) {
		$('body').addClass('cursor-wait');
			$.getJSON(houston_url + '/api/order/assign', { orderId: order.id, driverId: -1, afterId: -1 }, function (res) {
				$('body').removeClass('cursor-wait');
				if (res.code != 0) {
					println('Error - ' + res.msg);
				} else {
					//Order.move(orderId, driverId, -1);			
			}
		});
		$('#order_'+order.id).removeClass('order-drag-enter');
		_cnt = null;
	}

})();
