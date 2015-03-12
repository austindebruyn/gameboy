
/**
 * Parse base64 BLOB object using URL API to return an
 * image source.
 *
 * This function is written by rauchg, reproduced here
 * under an MIT license.
 *  - https://github.com/rauchg/weplay-web /client/blob.js
 * 
 * @param  {BLOB} imageData Binary streamed PNG data.
 * @return {String} 
 */
function blobToImage(imageData) {

	if (Blob && 'undefined' != typeof URL) {
		var blob = new Blob([imageData], {type: 'image/png'});
		return URL.createObjectURL(blob);
	} else if (imageData.base64) {
		return 'data:image/png;base64,' + imageData.data;
	} else {
		return 'about:blank';
	}
}

/**
 * Hooks up all sorts of client-managing functions.
 * @return {[type]} [description]
 */
document.onready =  function () {

	// Recompute canvas dimensions.
	var LCD = $('img#lcd');
	var LCDResize = function () {
		LCD.css('height', '' + (140 * (LCD[0].width / 166)) + 'px');
	};
	LCD.on('resize', LCDResize);
	LCDResize();

	var socket = io.connect();
	// Before we can enter the chatroom and keypress socket channels,
	// we need to figure out what our server-assigned user/room id is.
	// First we'll fetch a JSON with some info so we can have some
	// context to use in our new socket connection.
	var SocketData = {};

	$.ajax({
		url: '/api/user'
	}).done(function (data) {

		SocketData.user_id = data.user_id;
		SocketData.username = data.username;
		SocketData.room_id = data.room_id;

		// Now that we have some info, let's beam it back so the server
		// can associate our HTTP/Cookie session with our WebSocket session.
		socket.emit('identify', data);

		// Whenever we get a new frame event, convert the binary data into
		// a base64 URL parameter we can assign to our canvas-spoofing img
		// element.
		var previous;
		socket.on('frame', function (buf) {
			if (typeof previous !== 'undefined') URL.revokeObjectURL(previous);
			LCD[0].src = previous = blobToImage(buf);
		});
	});

	socket.on('error', function (message) {
		console.log('Socket.io error: ' + message);
	});

	socket.on('message', function (data) {
		chatbox.addLine(data.username, data.message, data.color);
	});

	socket.on('power', function () {
		$('.switch').toggleClass('on');
	});

	socket.on('speed', function (speed) {
		$('select#speed').val(speed);
	});
	
	var keys = {
		39: 0, // left
		37: 1, // right
		38: 2, // up
		40: 3, // down
		88: 4, // A
		90: 5, // B
		16: 6, // start
		13: 7  // select
	};

	var keyHandle = function (event, down) {
		if (chatbox.hasFocus()) return;
		var gbKey = keys[event.keyCode];
		if (typeof gbKey !== 'undefined') {
			socket.emit(down ? 'keydown' : 'keyup', gbKey);
			event.preventDefault();
		}
	};

	$(document).on("keydown", function (event) { keyHandle(event, true); });
	$(document).on("keyup", function (event) { keyHandle(event, false); });

	$('.switch').click(function () {
		socket.emit('power');
		$('.switch').toggleClass('on');
	});

	$('select#speed').change(function () {
		var speed = $('select#speed').val();
		socket.emit('speed', speed);
	});

	$('input[name=chat-input-line]').keypress(function (evt) {
		if (evt.which === 13) {
			var text = evt.target.value;
			evt.target.value = '';

			if (text.length > 0) {
				chatbox.addLine(SocketData.username, text);
				socket.emit('message', {
					message: text
				});
			}
		}
	});
};
