
var socketio = require('socket.io');

/**
 * This service is responsible for managing the socket.io connections to
 * clients. This should hook into the necessary repositories to identify users
 * and ensure that everyone is behaving themselves client-side.
 * @type {[type]}
 */
var exports = module.exports = {

	boot: function (server, rooms) {
		
		io = socketio.listen(server);
		log.debug('Socket.io listening.');

		io.sockets.on('connection', function (socket) {

			var room;
			log.debug('New socket.io connection, waiting for identification...');

			// Log all errors, but do not kick the client.
			socket.on('error', function (err) {
				log.err('Socket error: %s.', err);
			});

			socket.on('disconnect', function () {
				log.info('Socket disconnection.');

				if (typeof room !== 'undefined')
					if (--room.clientCount < 1) rooms.close(room);
			});

			// After the socket identifies itself, we can associate them with a particular
			// room and user. Now we can start pushing frame updates and other game room-related
			// events.
			socket.on('identify', function (data) {

				room = rooms.find(data.room_id);
				if (room === null) {
					log.warn('Error during socket identification: no such room %s.', data.room_id);
					return;
				}

				// Assign colors and increment the number of players in this room.
				var color = (room.clientCount++) % 6;

				if (room.emulation.running) socket.emit('power');
				socket.emit('speed', room.emulation.speed);

				var framePush = setInterval(function() {
					if (room.emulation.running && room.emulation.canvas)
						room.emulation.canvas.toBuffer(function (err, buf) {
							if (err) throw err;
							socket.emit('frame', buf);
						});
				}, 20);

				room.onclose = function () { clearInterval(framePush); };

				// Enter this socket into the channel of messages that should be sent for all
				// clients in this game room.
				socket.join(room.room_id);

				// Use this to guard against keydown spamming.
				var DownKeys = {};
				for (var i = 0; i < 8; i++) DownKeys[i] = false;

				// On keyup events, verify that the user has permission and invoke the GB.
				socket.on('keyup', function (data) {
					DownKeys[i] = false;
					console.log('keyup ' + data);
					room.emulation.gb.JoyPadEvent(data, false);
					room.touch();
				});

				// On keydown events, verify that the user has permission and invoke the GB.
				socket.on('keydown', function (data) {
					if (DownKeys[i]) return;
					DownKeys[i] = true;
					console.log('keydown ' + data);
					room.emulation.gb.JoyPadEvent(data, true);
					room.touch();
				});

				// On keydown events, verify that the user has permission and invoke the GB.
				socket.on('speed', function (speed) {
					speed = Number(speed);
					if ([1, 2, 3, 4, 5].indexOf(speed) >= 0) {
						log.debug('[%s][room:%s]: Set speed to %s.', data.username, room.room_id, speed);
						room.emulation.speed = speed;
						if (room.emulation.running); {
							room.emulation.stop();
							room.emulation.start();
						}
						socket.broadcast.to(room.room_id).emit('speed', speed);
						room.touch();
					} else {
						log.debug('[%s][room:%s]: Tried to set speed to %s.', data.username, room.room_id, speed);
					}
				});

				// On power switch events, start or stop the emulation.
				socket.on('power', function () {
					if (room.emulation.running)
						room.emulation.stop();
					else
						room.emulation.start();
					log.debug('[%s][room:%s]: Turned the GB %s.', data.username, room.room_id, room.emulation.running ? 'on' : 'off');
					socket.broadcast.to(room.room_id).emit('power');
					room.touch();
				});

				// On message events, verify that the user has permission and broadcast the message.
				socket.on('message', function (messageData) {

					log.chat('[%s][room:%s]: %s', data.username, room.room_id, messageData.message);
					socket.broadcast.to(room.room_id).emit('message', {
						username: data.username,
						color: color,
						message: messageData.message
					});
					room.touch();
				});

			});

		});
	}

}