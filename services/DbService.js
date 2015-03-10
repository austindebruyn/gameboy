
var Sequelize = require('sequelize');

/**
 * This service is responsible for opening up our model store, initializing
 * drivers, and doing some ORM stuff.
 * @type {[type]}
 */
var exports = module.exports = {

	boot: function () {

		var dbConfig = require('../config/db');

		var sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
			logging: false
		});

		var Game = sequelize.define('Game', {
			id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
			title: Sequelize.STRING,
			filename: Sequelize.STRING
		});

		sequelize.sync();

		Game.create({
			username: 'austin'
		});

		return {
			Game: Game
		};
	}

};
