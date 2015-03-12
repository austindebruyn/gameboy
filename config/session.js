
var exports = module.exports = {
	
	/**
	 * The session secret key.
	 * @type {String}
	 */
	secret: 'h9fTXu93T6hMss9',

	/**
	 * Express-session settings for the cookie.
	 * @type {Object}
	 */
	cookie: {
		maxAge: 36000000
	},

	/**
	 * Forces the session to be saved back to the session store, even if
	 * the session was never modified during the request.
	 * @type {Boolean}
	 */
	resave: false,

	/**
	 * Forces a session that is "uninitialized" to be saved to the store.
	 * A session is uninitialized when it is new but not modified
	 * @type {Boolean}
	 */
	saveUninitialized: false

};
