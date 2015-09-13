var Events = new (function () {
	// XXX: drag-and-drop is f#!&ed up in html5
	this.dragstart = function (e) {
		// For now, only orders are draggable
		e.dataTransfer.setData('order-div-id' , $(e.target).attr('id'));
	};
	this.dragover = function (e) {
		e.preventDefault();
		return false;
	};
	var _toggleOrder = function (e) {
		//if ()
	};
	this.order_dragenter = function (e) {
		e.preventDefault();
		$(e.target).toggleClass('drag-enter');
		
	};
	this.order_dragleave = function (e) {
		var target = $(e.target);
		if (target.hasClass('order')) {
			target.removeClass('drag-enter');
		}
	}
})();