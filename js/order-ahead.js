function set_routific_info(job) {
  console.log(job);
  $('#order-ahead-date-picker').val(job.date);
  $('#order-ahead-shift').val(job.shift);
  if (job.jobId == null) {
    $('#routific-info').html('No data for date=' + job.date + ', shift=' + job.shift_string);
  } else {
    var unserved = job.output.num_unserved;
    var html  = 'Latest: ' + String(job.time) + ', ';
    if (unserved != null && unserved > 0) {
        html += 'FAILED (See report for details)';
    } else {
        html += 'SUCCESS ';
        var fleetSize  = Object.keys(job.output.solution).length; // # of drivers submitted for routing
        if (fleetSize == job.minVehicles) {
          html += 'with ' + fleetSize + ' drivers';
        } else {
          html += '(' + job.minVehicles + ' minimum)';
        }
    }
    $('#routific-info').html(html);
  }
}

function report() {
  var date  = $('#order-ahead-date-picker').val();
  var shift = $('#order-ahead-shift option:selected').val();
  var w = window.open(HOUSTON_URL + '/api/routific/report?token=' + token + '&date=' + date + '&shift=' + shift);
  if (w) {
    w.focus();
  } else {
    alert('Please allow popups');
  }
}

function setDriverShift(driverId, shiftTypeValue) {
  $.getJSON(HOUSTON_URL + '/api/driver/setShiftType', { token: token, driverId: driverId, shiftType: shiftTypeValue }).done(function (res) {
    if(res.code != 0) {
      println('Error - ' + res.msg);
    } else {
    }
  }).error(function( jqxhr, textStatus, error ) {
    console.log('ajax error');
    });
}

var routific = new (function () {

  /* assign */
  this.assign = function () {
    var date  = $('#order-ahead-date-picker').val();
    var shift = $('#order-ahead-shift option:selected').val();
    $.getJSON(HOUSTON_URL + '/api/routific/assign', { token: token, date: date, shift: shift }).done(function (res) {
      if(res.code != 0) {
        $('#order-ahead-msg').html('Error');
        println('Houston error - ' + res.msg);
      } else {
        $('#order-ahead-msg').html('Success');
      }
    }).error(function( jqxhr, textStatus, error ) {
      var msg = 'routific.assign(): Network error - ' + error + ' - ' + textStatus;
      println(msg);
    });
  };

  /* routing */
	
  // Flag to prevent multiple routing requests
	var pending = false;

	this.route = function () {
		if (pending) {
      println('Please wait. Routing in progress.');
			return;
		}
		
    pending = true;

    var secondsElapsed =  0;
    var maxWaitTime    = 60; // seconds
    
    // Show elapsed time
    var tick = function () {
      console.log('Tick');
      if (pending && secondsElapsed < maxWaitTime) {
        $('#order-ahead-msg').html('Please wait... (' + secondsElapsed + ')');
        secondsElapsed++;
        setTimeout(tick, 1000);
      }
    }
    // Start the timer
    tick();

    var jobId = null;
    var date  = $('#order-ahead-date-picker').val();
    var shift = $('#order-ahead-shift option:selected').val();

    $.getJSON(HOUSTON_URL + '/api/routific/route', { token: token, date: date, shift: shift }).done(function (res) {
      if (res.code != 0) {
        println('Error - ' + res.msg);
        $('#order-ahead-msg').html('Error');
        pending = false;
      } else {
        jobId = res.ret;
        println('Got job ' + jobId);
        
        // Recursive function to periodically check if the job has finished
        var check = function() {
          console.log('checking');
          if (pending) {
            if (secondsElapsed >= maxWaitTime) {
              $('#order-ahead-msg').html('Error - Timeout fetching results for job ' + jobId);
              pending = false;
              return;
            }
            $.getJSON(HOUSTON_URL + '/api/routific/checkAndPersist', { token: token, jobId: jobId }).done(function (res) {
              if (res.code != 0) {
                println('Error - ' + res.msg);
                $('#order-ahead-msg').html('Error');
                pending = false;
              } else {
                if (res.ret.status.toLowerCase() != 'finished') {
                  // If not finished, wait 1 second then check again
                  setTimeout(check, 1000);
                } else {
                  pending = false;
                  var job = res.ret;
                  set_routific_info(job);
                }
              }
            });
          } else {
            var msg = 'pending=false';
            println(msg);
            $('#order-ahead-msg').html('Error');
          }
        }

        // First check
        check();
      }
    }).error(function( jqxhr, textStatus, error ) {
      var msg = 'routific.route(): Network error - ' + error + ' - ' + textStatus;
      println(msg);
      console.log(msg);
    });
	}
})();

function get_OA_orders() {
	var date  = $('#order-ahead-date-picker').val();
	if (date == '') {
		$('#order-ahead-msg').html('Please enter a date.').attr('class', 'order-ahead-error');
		return;
	}
	var shift = $('#order-ahead-shift option:selected').val();
	$.getJSON(HOUSTON_URL + '/api/routific/getOrderAheadOrders', { token: token, date: date, shift: shift }).done(function (res) {
    	if (res.code != 0) {
          $('#order-ahead-msg').html('Error').attr('class', 'order-ahead-error');
       		println('Error - ' + res.msg);
       	} else {
       		
          // Remove all unassigned OA orders currently displayed
       		$.each($('#order-ahead-0_orders-pending').children(), function (index, div) {
       			var orderId = $(div).attr('order-id');
       			if (g.orders[orderId]) {
       				// Sanity check - Make sure the order is unassigned
              var status = g.orders[orderId].status.toLowerCase();
       				if (status != 'unassigned') {
       					println('Error - ' + orderId + ' is not unassigned (' + status + ')');
       				}
       				// Remove the order marker
              var marker = markers['order_' + orderId];
              map.removeLayer(marker);
              delete markers['order_' + orderId];
              // Remove the div
              div.remove();
              delete g.orders[orderId];
       			} else {
       				println('Warning - Corrupted data? Order ' + orderId + " doesn't exist in global orders object");
       			}
       		});

          // Finally, render the new orders
          var orders = res.ret;
       		$('#order-ahead-msg').html('Got ' + orders.length + ' unassigned orders').attr('class', '');
          for (var i = 0; i < orders.length; i++) {
            var order = orders[i];
            g['orders'][order.id] = order;
            render_order(order);
          }
       	}
    }).error( function(jqxhr, textStatus, error) {
    	println("get_OA_orders() - error - " + error);
    });

  $('#routific-info').html('Fetching Routific info...');
  
  $.getJSON(HOUSTON_URL + '/api/routific/getMostRecentJob', { token: token, date: date, shift: shift }).done(function (res) {
    if (res.code != 0) {
      $('#routific-info').html('Error');
      println(res.msg);
    } else {
      var job = res.ret;
      console.log(job);
      set_routific_info(job);
    }
  }).error( function(jqxhr, textStatus, error) {
    println('get_OA_orders(): Network error - ' + error + ' - ' + textStatus);
  });
}