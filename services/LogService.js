
var winston = require('winston');
var util = require('util');

/**
 * This service provides logging features, where debug information can be
 * printed to the console and a file. Here were configure a Winston logging
 * instance with the right levels.
 * @type {Object}
 */
var exports = module.exports = {

	boot: function () {

		var config = require('../config/log');

		/**
		 * RFC 5424 log levels.
		 * @type {Object}
		 */
		var LOG_LEVELS = {
			levels: {
				debug: 0,
				chat: 1,
				info: 2,
				note: 3,
				warn: 4,
				err: 5
			},
			colors: {
				debug: 'grey',
				chat: 'cyan',
				info: 'white',
				note: 'green',
				warn: 'yellow',
				err: 'red'
			}
		};

		// Instantiate a winston logger from the options provided.
		var logger = new (winston.Logger)({
			levels: LOG_LEVELS.levels,
			transports: [
				new (winston.transports.DailyRotateFile)({
					name: 'info-file',
					filename: 'logs/log',
					level: config.lowest.file,
					json: false
				}),
				new (winston.transports.Console)({
					colorize: true,
					level: config.lowest.console
				})
			]
		});

		// Inject our colors into the base module - needed because Winston has
		// support for sharing levels across loggers.
		winston.addColors(LOG_LEVELS.colors);

		var logService = Object.create(null);
		// Proxy every exported function, because I don't like the way winston handles
		// formatting and specifying a log level.
		logService.debug 	= function () { logger.debug(util.format.apply(util, arguments)); };
		logService.chat 	= function () { logger.chat(util.format.apply(util, arguments)); };
		logService.info 	= function () { logger.info(util.format.apply(util, arguments)); };
		logService.note 	= function () { logger.note(util.format.apply(util, arguments)); };
		logService.warn 	= function () { logger.warn(util.format.apply(util, arguments)); };
		logService.err 		= function () { logger.err(util.format.apply(util, arguments)); };

		return logService;
	}

};
