
var PORT 		= 3000;
var util 		= require('util');
var express 	= require('express');
var http 		= require('http');
var validate 	= require('validate.js');
var busboy 		= require('connect-busboy');
var bodyParser 	= require('body-parser');
var uuid 		= require('node-uuid');

// Express bootstrapping!
var app 		= express();
app.use(require('express-flash')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(require('express-session')(require('./config/session')));
app.use(busboy({ immediate: true }));
app.set('view engine', 'jade');

// Now inject dependencies and boot the services.
global.log 		= require('./services/LogService').boot();
var rooms 		= require('./services/RoomService').boot();
var db 			= require('./services/DbService').boot();
var socketio	= require('./services/SocketIOService');

// Open up routes.
app.get('/', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');
	res.locals.username = req.body.username;

	log.debug('Serving index for session %s.', req.session.username);
	return res.render('index');
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

app.post('/games/create', function (req, res) {
	if (req.busboy) {
		req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			console.log(arguments);
		});
		req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
			console.log('field')
			console.log(arguments);
		});
		req.pipe(req.busboy);
	}
});

app.get('/~:name', function (req, res) {
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

	var newRoom = rooms.open(req.session.user_id, 'group');

	log.note('User %s hosting new room %s.', req.session.id, newRoom.room_id);

	return res.redirect('/~' + newRoom.room_id);
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

var server 	= app.listen(PORT);
var socketio = socketio.boot(server, rooms);
log.note('Server listening on port %d.', PORT);
