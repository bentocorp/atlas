/* Singleton */
var Order = new (function () {
	/**
	 * @param order - The order to be inserted (behind after)
	 */
	this.insert = function (orderId, driverId, afterId) {
		// order_insert
		var driver = {
			'order': order.parent().parent().attr('id'),
			'after': after.parent().parent().attr('id'),
		};
		var foldingSymbol = $('#' + driver.after + '> .driver-header > .folding-symbol');
		order.insertBefore(after);
		foldingSymbol.removeClass('transparent').removeClass('collapsed').addClass('expanded');
		fix_positions($('#' + driver['order'] + '> .orders'));
		if (driver['order'] != driver['after']) {
			if ($('#' + driver.order + '> .orders').children().length <= 1) {
				foldingSymbol = $('#' + driver.order + '> .driver-header > .folding-symbol');
				
				foldingSymbol.removeClass('expanded').addClass('collapsed').addClass('transparent');
			}
			fix_positions($('#' + driver['after'] + '> .orders'));
		}
	};

	// Insert order at the end
	this.push = function (o, driverId) {
		var after = $('#'+driverId+"> .orders").children(':last-child');
		atlas.event_handlers.dragdrop.order.add_drop_listeners(o);
		Order.insert(o, after);
	}

	// <div id="order_500" class="order" position="0" draggable="true"></div>
	this.create_order = function (order) {
		var o = $('<div>').attr({
			'class': 'order', 'ondragstart': 'atlas.event_handlers.dragdrop.ondragstart(event);',
			//'ondragover': 'atlas.event_handlers.dragdrop.ondragover(event);'
		});
		if (typeof order === 'undefined') { // For dummy orders
			o.addClass('dummy');
			atlas.event_handlers.dragdrop.order.add_drop_listeners(o);
		} else {
			o.attr('onmouseenter', 'highlight($(this));');
	        o.attr('onmouseleave', 'recolor($(this));');
			o.attr({
				id: 'order_' + order.id, draggable: true, position: order.position,
			}).html(order.address.street);
			// If an order is assigned, it can also function as a drop container
			if (order.state != 'unassigned') {
				atlas.event_handlers.dragdrop.order.add_drop_listeners(o);
			}
		}
		return o;
	}

	this.assign = function (orderId, driverId) {
		console.log('assigning ' + orderId + ' to ' + driverId);
		$.getJSON(houston_url + '/api/assign', {
			'orderId': orderId,
			'driverId': driverId,
		}).done(function (res) { })
		.fail(function (jqxhr, textStatus, error) {
			console.log(error);
		}); 
	}


})();