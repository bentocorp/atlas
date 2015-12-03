function fade(el, ms, rgba) {
	
	var T = 100; // ms
	
	var animate = function () {
		setTimeout(function () {

			var curr = el.data('rgba');

			// Compute new alpha value
			var alpha = curr[3] - el.data('step-size');
			curr[3] = alpha < 0 ? 0 : alpha;
			el.data('rgba', curr);

			el.css('background-color', 'rgba(' + curr.join(',') + ')');
			// If not fully transparent, keep going
			if (curr[3] > 0) {
				animate();
			} else {
				el.data('animating', false);
			}
		}, T);
	};
	
	el.data('rgba', rgba);
	el.data('step-size', T/ms);
	el.css('background-color', 'rgba(' + rgba.join(',') + ')');

	if (!el.data('animating')) {
		el.data('animating', true);
		animate();
	}
}
