
var fs = require('fs');
var uuid = require('node-uuid');
var Canvas = require('canvas');
var Gameboy = require('gameboy');

/**
 * This service guards the room resources, handling the CRUD operations
 * needed and making sure we can close rooms appropriately.
 * @type {[type]}
 */
var exports = module.exports = {

	/**
	 * Boot and return an object with CRUD
	 * @return {[type]} [description]
	 */
	boot: function () {

		// List of room objects.
		var RoomArray = {};

		// Set up a random array of room names.
		var genCounter = 0;
		var words = [[],[],[]];
		var data = fs.readFileSync('./data/static/room-names', { encoding: 'utf8' });
		var lines = data.split('\n');

		if (lines.length !== 3) throw new Error('room-names has wrong format!');
		for (var i = 0; i < 3; i++) {
			lines[i].split(/[,\s\n]+/).forEach(function (word) {
				words[i].push(word);
			});
		}

		var random = function (low, high) { return Math.floor(Math.random() * (high - low) + low); }
		var genRoomName = function () {
			var newRoomName;
			while (!newRoomName || RoomArray[newRoomName]) {
				var w1 = words[0][random(0, words[0].length)];
				var w2 = words[1][random(0, words[1].length)];
				var w3 = words[2][random(0, words[2].length)];
				newRoomName = w1 + '-' + w2 + '-' + w3;
			}
			return newRoomName;
		};

		// Room prototype object.
		var Room = function (owner, type) {
			this.owner = owner;
			this.room_id = genRoomName();
			this.type = (type === undefined) ? 'group' : 'solo';
			this.clientCount = 0;

			var ROM = new Buffer(require('../public/games/pokemon.js')(), 'base64');

			// Create a new instance of an emulation.
			var mainCanvas = new Canvas(160, 144);
			var gb = Gameboy(mainCanvas, ROM, {});
			gb.start();
			gb.stopEmulator = 1;
			log.info('Created new canvas and gameboy emulator.');

			this.emulation = {
				running: false,
				canvas: mainCanvas,
				gb: gb,
				speed: 3,
				start: function (speed) {
					if (this.running) return;
					if (typeof speed === 'number') this.speed = speed;
					var ticks = [16, 8, 4, 2, 1][this.speed - 1];
					this.gbLoop = setInterval(gb.run.bind(gb), ticks);
					this.running = true;
				},
				stop: function () {
					if (!this.running) return;
					clearInterval(this.gbLoop);
					this.running = false;
				},
				destroy: function () {
					this.stop();
					this.gb.JoyPadEvent = function() {}; // Clear event handlers.
					this.gb = null;
					this.canvas = null;
				}
			}
		};

		return {
			open: function (owner_id, type) {
				var room = new Room(owner_id, type);
				log.note('Opening new room, id %s.', room.room_id);
				RoomArray[room.room_id] = room;
				return room;
			},
			close: function (room_or_id) {
				if (typeof room_or_id !== 'object')
					room_or_id = this.find(room_or_id);
				if (!(room_or_id instanceof Room)) throw new Error('Cannot close nonexistant room.');

				var room = room_or_id;
				room.emulation.stop();
				room.emulation.destroy();

				if (typeof room.onclose !== 'undefined') room.onclose.apply(room);

				log.note('Closed room %s. Gameboy stopped and canvas marked for GC.', room.room_id);
			},
			find: function (room_id) {
				var room = RoomArray[room_id];
				return (room === undefined) ? null : room;
			}
		};
	}
};
