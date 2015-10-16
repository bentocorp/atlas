/* Singleton */
var Order = new (function () {
	this.delete = function (orderId) {
		var order = g.orders[orderId];
		var driverId = order.driverId;
		if (driverId != null && driverId > 0) {
			println("Error - Unassign order " + orderId + " first before deleting!");
			return;
		}
		delete g.orders[orderId];
		var marker = markers['order_' + orderId];
		map.removeLayer(markers['order_' + orderId]);
		delete markers['order_' + orderId];
		$('#order_' + orderId).remove();
	};
	this.move = function (orderId, driverId, afterId) {
		orderId = String(orderId); driverId = (driverId == null) ? -1 : parseInt(driverId);
		//don't do this because afterId can be null
		//afterId = String(afterId);
		var order = g.orders[orderId];
		if (order == null) {
			throw 'Error - order ' + orderId + ' does not exist';
		}
		var o = $('#order_' + orderId);
		if (o.length <= 0) {
			throw 'Error - order ' + orderId + "can't be found";
		}
		var cd, cq, cp = -1; // current driver, current order queue, current priority
		if (order.driverId != null && order.driverId > 0) {
			cd = g.drivers[order.driverId]; // current driver
			if (cd == null) {
				throw 'Error - corrupt data? Order ' + orderId + ' currently assigned to driver ' + order.driverId + ' but driver does not exist';
			}
			cq = cd.orderQueue;
			cp = cq.indexOf(orderId);
			if (cp < 0) {
				throw 'Error - corrupt data? Order ' + orderId + ' currently assigned to driver ' + order.driverId + ' but not in queue';
			}
		}
		if (driverId == null || driverId < 0) {
			// {{ important that execution doesn't fail in here
			order.driverId = -1;
			if (cp >= 0) {
				cq.splice(cp, 1);
			}
			// remove?
			$('#0_orders-pending').append(o);
			o.attr('ondragover', '').attr('ondragenter', '').attr('ondragleave', '').attr('ondrop', '');
			// XXXX <<<<<<< place this logic in the push notification handler!
			order.status="UNASSIGNED";
			refresh_status_symbol(order);
			$('#order_' + order.id + '> .actions > .actions-menu > .action-unassign').hide();
			// XXXXX >>>>>>>>>>>>
			//if ($('#' + cd.id + '_orders-pending').children().length < 2) {
			//	$('#driver_' + cd.id + ' > .driver-header > .folding-symbol').removeClass('expanded').addClass('collapsed').addClass('transparent');
			//}
			// }}
		} else {
			var driver = g.drivers[driverId];
			if (driver == null) {
				throw 'Error - driver ' + driverId + ' does not exist';
			}
			var after = null,
				nq = driver.orderQueue,
			    np = -1;
			if (afterId == null || afterId == "" || afterId < 0) {
				// insert at end
				after = $('#' + driverId + '_orders-pending').children(':last');
				np = nq.length;
			} else {
				after = $('#order_' + afterId);
				if (after.length <= 0) {
					throw 'Error - after order ' + afterId + ' not found';
				}
				np = nq.indexOf(afterId);
				if (np < 0) {
					throw 'Error - corrupt data? Order ' + afterId + ' does not exist in queue of driver ' + driverId;
				}
			}
			// {{ important that nothing fails in here
			order.driverId = driverId;
			if (cp >= 0) {
				cq.splice(cp, 1);
			}
			nq.splice(np, 0, orderId);
			o.insertBefore(after);
			// enable drop
			o.attr('ondragover' , 'Events.dragover(event);')
		     .attr('ondragenter', 'Events.order_dragenter(event, "order");')
		     .attr('ondragleave', 'Events.order_dragleave(event, "order");')
		     .attr('ondrop'     , 'Events.order_ondrop(event);');
			$('#driver_' + driverId + ' > .driver-header > .folding-symbol').removeClass('collapsed').addClass('expanded').removeClass('transparent');
			$('#' + driverId + '_orders').show();
			$('#order_' + order.id + '> .actions > .actions-menu > .action-unassign').show();
			// }}
		}
	};
})();