
var fs = require('fs');
var uuid = require('node-uuid');
var Canvas = require('canvas');
var Gameboy = require('gameboy');

/**
 * Spoof this function because it is error-prone.
 * @param  {[type]} parentObj [description]
 * @param  {[type]} address   [description]
 * @param  {[type]} data      [description]
 * @return {[type]}           [description]
 */
Gameboy.prototype.memoryWriteMBCRAM = function (parentObj, address, data) {
	try {
		if (parentObj.MBCRAMBanksEnabled || this.opts.overrideMbc) {
			parentObj.MBCRam[address + parentObj.currMBCRAMBankPosition] = data;
		}
	}
	catch (ex) {}
}

/**
 * This service guards the room resources, handling the CRUD operations
 * needed and making sure we can close rooms appropriately.
 * @type {[type]}
 */
var exports = module.exports = {

	/**
	 * Boot and return an object with CRUD methods.
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
		var Room = function (owner, game, type) {
			this.owner = owner;
			this.room_id = genRoomName();
			this.type = (type === undefined) ? 'group' : 'solo';
			this.clientCount = 0;
			this.lastTimestamp = Date.now();

			var fullRomPath = './data/uploads/' + game.filename;

			log.info('Reading file %s from disk.', fullRomPath);
			var ROM = new Buffer(fs.readFileSync(fullRomPath));

			// Create a new instance of an emulation.
			var mainCanvas = new Canvas(160, 144);
			var gb = new Gameboy(mainCanvas, ROM, {});

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
					var ticks = [64, 16, 8, 4, 2][this.speed - 1];
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
					if (this.gb)
						this.gb.JoyPadEvent = function() {}; // Clear event handlers.
					this.gb = null;
					this.canvas = null;
				}
			}
		};

		/**
		 * Touches the timestamp to keep the room fresh.
		 * @return {[type]} [description]
		 */
		Room.prototype.touch = function () {
			this.lastTimestamp = new Date();
		}

		return {
			/**
			 * Opens a new room with the specified owner, ROM, and type.
			 * @param  {String} owner_id session id of the authoring user
			 * @param  {Object} game 	 a game object to load 
			 * @param  {String} type 	 whether the room is group or solo.
			 * @return {Object}          the newly opened room
			 */
			open: function (owner_id, game, type) {
				var room = new Room(owner_id, game, type);
				log.note('Opening new room, id %s.', room.room_id);
				RoomArray[room.room_id] = room;
				return room;
			},
			/**
			 * Closes the specified room by id. 
			 * @param  {mixed} room_or_id a Room object or an id
			 * @return {undefined}            
			 */
			close: function (room_or_id) {
				if (typeof room_or_id !== 'object')
					room_or_id = this.find(room_or_id);
				if (!(room_or_id instanceof Room)) throw new Error('Cannot close nonexistant room.');

				var room = room_or_id;
				delete RoomArray[room.room_id];
				room.emulation.stop();
				room.emulation.destroy();

				if (typeof room.onclose !== 'undefined') room.onclose.apply(room);

				log.note('Closed room %s. Gameboy stopped and canvas marked for GC.', room.room_id);
			},
			/**
			 * Returns a specific room object by id.
			 * @param  {id}  		room_id 
			 * @return {Object}     null if the room doesn't exist
			 */
			find: function (room_id) {
				var room = RoomArray[room_id];
				return (typeof room === 'undefined') ? null : room;
			},

			/**
			 * Executes a callback for each room in the array.
			 * @param  {Function} callback 
			 * @return {undefined} 
			 */
			forEach: function (callback) {
				for (var room_id in RoomArray) callback(RoomArray[room_id]);
			}
		};
	}
};
