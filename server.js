
var PORT 		= 3000;
var util 		= require('util');
var express 	= require('express');
var http 		= require('http');
var validate 	= require('validate.js');
var bodyParser 	= require('body-parser');
var uuid 		= require('node-uuid');
var multer  	= require('multer');

// Express bootstrapping!
var app 		= express();
app.use(require('express-flash')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(require('express-session')(require('./config/session')));
app.use(require('connect-busboy')({}));

app.set('view engine', 'jade');

// Set up the view configuration.
var viewConfig 	= require('./config/views');
app.locals.include_google_analytics = viewConfig.include_google_analytics;

// Now inject dependencies and boot the services.
global.log 		= require('./services/LogService').boot();
var db 			= require('./services/DbService').boot();
var rooms 		= require('./services/RoomService').boot();
var games		= require('./services/GameService').boot(db);
var socketio	= require('./services/SocketIOService');

// Open up routes.
app.get('/', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');
	res.locals.username = req.body.username;

	games.all(function (games) {
		res.locals.games = games;
		log.debug('Serving index for session %s.', req.session.username);
		return res.render('index');
	});
});

app.get('/legal', function (req, res) {
	return res.render('legal');
});

app.get('/api/user', function (req, res) {
	if (typeof req.session.username === 'undefined') {
		req.statusCode = 403;
		return res.end();
	}
	res.setHeader('Content-type', 'application/json');

	log.debug('Serving user info JSON for session user %s.', req.session.username);

	return res.send(JSON.stringify({
		username: req.session.username,
		user_id: req.session.user_id,
		room_id: req.session.room_id
	}));
});

app.get('/api/games/destroy', function (req, res) {
	//var id = req.body.game_id;
	var id = req.query.id;
	log.info('Handling request to destroy game %d.', id);

	games.destroy(id, function (number) {
		if (number < 1) {
			log.err('Only %d games were deleted... query messed up?', number);
			res.send({ success: false });
			return res.end();
		}
		res.send({ success: true });
		return res.end();
	});
});

app.post('/api/games/create', function (req, res) {
	if (typeof req.session.username === 'undefined') {
		req.statusCode = 403;
		return res.end();
	}

    req.busboy.on('file', function (fieldname, file, filename) {

		if (fieldname !== 'rom') return res.render('404');

		log.note('Handling file upload for %s=%s.', fieldname, filename);

		var rules = {
			fileSize: {
				minimum: 1,
				maximum: 1024 * 1024 * 16
			}
		};

		var input = {};
		var errors = validate(rules, { fileSize: file.size });

		if (errors) {
			for (var i in errors) { req.flash('err', errors[i]); };
				return res.redirect('/')
		}

		games.create({
			filename: filename,
			file: file,
			username: req.session.username
		}, function (err) {
			if (err) {
				log.err(err);
				req.flash('err', 'Something went wrong while trying to store that!');
				return res.redirect('/');
			}

			req.flash('success', 'Got it! That game is now playable.');
			return res.redirect('/');
		});
    });

    req.pipe(req.busboy);
});

app.get('/~:name', function (req, res) {
	
	if (typeof req.session.username === 'undefined') {
		req.statusCode = 403;
		return res.end();
	}

	var room_id = req.params.name;

	var rules = {
		name: {
			presence: true,
			format: {
				pattern: /^[\w\-]+$/,
				message: 'was not correct!'
			}
		}
	};

	log.info('User %s attempting to join room %s.', req.session.username, room_id);

	var errors = validate({ name: room_id }, rules);

	if (errors) {
		for (var i in errors) { req.flash('err', errors[i]); };
			return res.redirect('/')
	}

	var room = rooms.find(room_id);
	if (room === null) {
		req.flash('err', "That room doesn't exist!");
		return res.redirect('/');
	}

	req.session.room_id = room_id;
	res.locals.username = req.session.username;
	res.locals.room_id = req.session.room_id;

	log.debug('Serving join game for session user %s.', req.session.username);
	return res.render('game');
});

app.post('/host', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');

	var romId = req.body.rom;

	log.info('User %s requesting to host game by id %d.', req.session.body, romId);

	games.find(romId, function (game) {
		if (!game) {
			log.err('User %s attempted to host a nonexistant game by id %d.', req.session.username, romId);
			req.flash('err', "That game doesn't exist!");
			return res.redirect('/');
		}

		var newRoom = rooms.open(req.session.user_id, game, 'group');

		log.note('User %s hosting new room %s with ROM %s.', req.session.id, newRoom.room_id, game.title);

		return res.redirect('/~' + newRoom.room_id);
	});
});

app.post('/join', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');
	res.locals.username = req.session.username;

	var room_id = req.body.room_id;
	return res.redirect('/~' + room_id);
});

app.get('/who-are-you', function (req, res) {
	if (typeof req.session.username !== 'undefined') return res.redirect('/');
	return res.render('who-are-you');
});

app.post('/who-are-you', function (req, res) {
	if (typeof req.session.username !== 'undefined') return res.redirect('/');

	var rules = {
		username: {
			presence: true,
			format: {
				pattern: /^[\w]+$/,
				message: 'should be just letters and numbers!'
			},
			length: {
				minimum: 3,
				maximum: 20,
				message: 'has to be between 3 and 20 characters!'
			}
		}
	};

	var errors = validate({ username: req.body.username }, rules);

	if (errors) {
		for (var i in errors) { req.flash('err', errors[i]); };
			return res.redirect('/who-are-you')
	}

	req.flash('success', 'You in!');
	req.session.user_id = uuid.v4();
	req.session.username = req.body.username;
	res.locals.username = req.body.username;

	log.debug('Serving post who-are-you for session user %s.', req.session.username);
	return res.redirect('/');
});

app.use(function (req, res, next) {
	res.status(404);

	if (req.accepts('html'))
		return res.render('404');
	if (req.accepts('json'))
		return res.send({ error: 'Not found' });
	
	res.type('txt').send('Not found');
});

var server 	= app.listen(PORT);
var socketio = socketio.boot(server, rooms);
log.note('Server listening on port %d.', PORT);
