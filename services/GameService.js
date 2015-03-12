
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

/**
 * This module is responsible for managing the uploaded and stored games.
 * @type {[type]}
 */
var exports = module.exports = {
	
	/**
	 * Boot and teturn an object with CRUD methods.
	 * @param  {[type]} db [description]
	 * @return {[type]}    [description]
	 */
	boot: function (db) {

		return {
			/**
			 * Inserts a new record of a Game and associated binary into the
			 * database.
			 * @param  {object}   data     file name, size, uploader
			 * @param  {callback} callback 
			 * @return {undefined}            
			 */
			create: function (data, callback) {

				var file = data.file;

				log.info('file size: %d %d %d', file.size, data.filesize, data.size);

				var shaSum = crypto.createHash('sha1');
				shaSum.update(data.username + '-' + data.filename + '-' + (new Date()).toString());
				var storedName = shaSum.digest('hex');
				var fullPath = path.normalize(__dirname + '/../data/uploads/') + storedName;

				log.info('Beginning to store game file %s uploaded by %s as %s.', data.filename, data.username, storedName);

				fstream = fs.createWriteStream(fullPath);

				fstream.on('close', function () {
					db.Game.create({
						filename: 	storedName,
						title: 		data.filename,
						uploader: 	data.username
					}).then(function () {


						callback(null);
					});
				});

				fstream.on('error', callback);

				// Start uploading the file into our data store.
				file.pipe(fstream);
			},

			/**
			 * Returns all games in the database.
			 * @param  {Function} callback 
			 * @return {undefined}            
			 */
			all: function (callback) {
				db.Game.findAll().then(function (games) {
					callback(games);
				});
			},

			/**
			 * Searches for an individual game identified by the parameters.
			 * @param  {Object}   params   
			 * @param  {Function} callback 
			 * @return {undefined}            
			 */
			find: function (id, callback) {
				db.Game.find({ where: { id: id } }).then(callback);
			},

			/**
			 * Destroys the given game.
			 * @param  {[type]}   params   [description]
			 * @param  {Function} callback [description]
			 * @return {[type]}            [description]
			 */
			destroy: function (id, callback) {
				db.Game.find({ where: { id: id }}).then(function (game) {
					if (!game) return callback(0);

					var storedName = game.filename;
					var fullPath = path.normalize(__dirname + '/../data/uploads/') + storedName;
					log.info('About to unlink file %s.', fullPath);
					fs.unlink(fullPath, function (err) {
						if (err) {
							log.err(err);
							return callback(0);
						}

						db.Game.destroy({ where: { id: id } }).then(callback);
					});
				});
			}
		};
	}

};