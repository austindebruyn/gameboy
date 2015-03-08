
var express = require('express');
var http = require('http');
var app = express();
var validate = require('validate.js');
var uuid = require('node-uuid');
var Canvas = require('canvas');
var Gameboy = require('gameboy');
var winston = require('winston');


var orm = require('orm');

app.use(require('express-flash')());

app.use(orm.express('mysql://nintendo:A5gH2Kj8!b@localhost/gameboy', {
	define: function (db, models, next) {
		models.user = db.define('user', { username: String });
		next();
	}
}));

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(require('express-session')(require('./config/session')));


var server = app.listen(3000);

app.set('view engine', 'jade');

app.get('/', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');
	res.locals.username = req.body.username;
	return res.render('what');
});

app.get('/solo', function (req, res) {

	req.session.username = 'Austin';
	req.session.user_id = uuid.v4();

	var newRoom = {
		owner: 		req.session.user_id,
		room_id: 	uuid.v4(),
		type: 		'solo'
	};

	rooms.push(newRoom);

	req.session.host = true;
	req.session.room_id = newRoom.room_id;
	return res.render('solo');
});

app.get('/api/user', function (req, res) {
	if (typeof req.session.username === 'undefined') {
		req.statusCode = 403;
		return res.end();
	}
	res.setHeader('Content-type', 'application/json');
	return res.send(JSON.stringify({
		username: req.session.username,
		user_id: req.session.user_id,
		room_id: req.session.room_id,
		host: req.session.host
	}));
});

var rooms = [];
var findRoomById = function (room_id) {
	var room = null;
	rooms.forEach(function (iRoom) { if (iRoom.room_id == room_id) room = iRoom; });
	return room;
}

app.post('/host', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');

	var newRoom = {
		owner: 		req.session.user_id,
		room_id: 	uuid.v4(),
		type: 		'group'
	};

	console.log(req.session.id + ' hosting ' + newRoom.room_id);

	rooms.push(newRoom);

	req.session.room_id = newRoom.room_id;
	req.session.host = false;
	res.locals.username = req.session.username;
	res.locals.room_id = req.session.room_id;
	return res.render('game');
});

app.post('/join', function (req, res) {
	if (typeof req.session.username === 'undefined') return res.redirect('/who-are-you');
	res.locals.username = req.session.username;

	var room_id = req.body.room_id;

	var room = findRoomById(room_id);
	if (room === null) {
		req.flash('err', "That room doesn't exist!");
		return res.redirect('/what');
	}

	req.session.room_id = room_id;
	req.session.host = false;
	res.locals.username = req.session.username;
	res.locals.room_id = req.session.room_id;
	return res.render('game');
});

app.get('/who-are-you', function (req, res) {
	console.log(req.session.username);
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

	req.flash('info', 'You in!');
	req.session.user_id = uuid.v4();
	req.session.username = req.body.username;
	res.locals.username = req.body.username;

	return res.redirect('/');
});

// Start up socket.io listening and dispatching ADD and DELETE requests.
var socketio = require('socket.io');
io = socketio.listen(server);

io.sockets.on('connection', function (socket) {

	var frame = [];
	for (var i = 0; i < 70000; i++) frame.push(i);

	socket.on('error', function (err) {
		console.log('ERRRRRRRRRRR ' + err);
	});

	socket.on('identify', function (data) {

		var room = findRoomById(data.room_id);

		if (room === null) {
			// socket.emit('error', 'Nonexistant room.');
			return;
		}


var mainCanvas = new Canvas(160, 144);

var gb = Gameboy(mainCanvas, ROM, {
	drawEvents: true
});
gb.start();

gb.stopEmulator = 1;
var gbLoop = setInterval(gb.run.bind(gb), 4);

		socket.join(room.room_id);
	
		socket.on('message', function (messageData) {
			console.log(data.user_id + ' ' + data.username + ' ' + messageData.message);
			socket.broadcast.to(room.room_id).emit('message', {
				username: data.username,
				message: messageData.message
			});
		});

		var keys = {
  right: 0,
  left: 1,
  up: 2,
  down: 3,
  a: 4,
  b: 5,
  select: 6,
  start: 7
};

		socket.on('keyup', function (data) {
    		GBASS.JoyPadEvent(keys[data], true);
    		console.log('CALLING JOYPAD UP EVENT ' + data + ' ' + (typeof data));
		});

		socket.on('keydown', function (data) {
    		GBASS.JoyPadEvent(keys[data], false);
    		console.log('CALLING JOYPAD DOWN EVENT ' + data + ' ' + (typeof data));
		});

		gb.on('draw', function() {
			mainCanvas.toBuffer(function (err, buf) {
				if (err) throw err;
				// console.log(buf.size());
				socket.emit('frame', buf);
			});
		});

		socket.on('turnon', function () {
			socket.broadcast.to(room.room_id).emit('turnon');
		});

		socket.on('turnoff', function () {
			socket.broadcast.to(room.room_id).emit('turnoff');
		});

	});

});
