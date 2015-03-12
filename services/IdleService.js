
/**
 * The idle check function should be run periodically for each Room resource.
 * It will check the most recently touched timestamp, and if it is too long
 * ago, this will close the room.
 * @return {[type]} [description]
 */
var idleCheck = function (rooms, config) {

	config = config || {timeout: 30000};
	
	var timestamp = Date.now();

	rooms.forEach(function (room) {
		var timeSinceLastActivity = timestamp - room.lastTimestamp;
		if (timeSinceLastActivity >= config.timeout) {
			log.warn('Room %s has not been touched in %d milliseconds, closing...', room.room_id, timeSinceLastActivity);
			rooms.close(room);
		}
	});
};

/**
 * This module is responsible for kicking idle rooms after some timeout
 * period with no activity. This service prevents memory leaks when people
 * disconnect quickly without signalling. Open rooms that have received no
 * button presses or chat messages will be closed and the resources freed.
 * @type {Object}
 */
var exports = module.exports = {

	/**
	 * Boot and return an object that can be shutdown.
	 * @return {[type]} [description]
	 */
	boot: function (rooms) {

		var roomConfig = require('../config/rooms');
		var interval = setInterval(idleCheck.bind(this, rooms, roomConfig), 2000);

		return {

			/**
			 * Exposes the actual interval that runs every timeout cycle and
			 * checks rooms.
			 * @type {Object}
			 */
			interval: interval,

			/**
			 * Stops the idle service.
			 * @return {undefined} 
			 */
			stop: function () {
				clearInterval(interval);
			}
		};
	}

}
