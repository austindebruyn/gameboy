
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

	// window.gbc = new GBC();

	var socket = io.connect();

	window.SocketData = {};

	$.ajax({
		url: '/api/user'
	}).done(function (data) {
		console.log(data);
		SocketData.user_id = data.user_id;
		SocketData.username = data.username;
		SocketData.room_id = data.room_id;
		SocketData.host = data.host;
		socket.emit('identify', data);

		socket.on('frame', function (buf) {
			console.log('got buffer!');
			$('#hi')[0].src = blobToImage(buf);
		});

		if (SocketData.host) {

			socket.on('keydown', function (key) {
				console.log('RCV KEYDOWN ' + key);
				GameBoyKeyDown(key);
			});

			socket.on('keyup', function (key) {
				console.log('RCV KEYUP ' + key);
				GameBoyKeyUp(key);
			});

			// setInterval(function () {
			// 	// Stream frame upwards.
			// 	var frameBuffer = gbc.getFB(); 
			// 	if (frameBuffer === null) return;
			// 	socket.emit('frame', frameBuffer);
			// 	// console.log('frame up len: ' + frameBuffer.length);
			// }, 5000);

		} else {

			socket.on('turnon', function () {
				gbc.turnOn();
			});

			socket.on('turnoff', function () {
				gbc.turnOff();
			});

			// socket.on('frame', function (frame) {
			// 	console.log('rcv frame len: ' + frame + '.');
			// 	gameboyCore.frameBuffer = frame;
			// 	gameboyCore.dispatchDraw();
			// });
		}
	});

	socket.on('error', function (message) {
		console.log('ERR ' + message);
	});

	socket.on('message', function (data) {
		chatbox.addLine(data.username, data.message);
	});

	window.onresize = initNewCanvasSize;
	window.cout = function (message, color) { console.log(message); };

	var keyZones = [
		["right", [39]],
		["left", [37]],
		["up", [38]],
		["down", [40]],
		["a", [88, 74]],
		["b", [90, 81, 89]],
		["select", [16]],
		["start", [13]]
	];

	function keyDown(event) {
		if (chatbox.hasFocus()) return;
		var keyCode = event.keyCode;
		var keyMapLength = keyZones.length;
		for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
			var keyCheck = keyZones[keyMapIndex];
			var keysMapped = keyCheck[1];
			var keysTotal = keysMapped.length;
			for (var index = 0; index < keysTotal; ++index) {
				if (keysMapped[index] == keyCode) {

					console.log('KEYDOWN ' + keyCheck[0]);

						socket.emit('keydown', keyCheck[0])

					try {
						event.preventDefault();
					}
					catch (error) { }
				}
			}
		}
	}

	function keyUp(event) {
		if (chatbox.hasFocus()) return;
		var keyCode = event.keyCode;
		var keyMapLength = keyZones.length;
		for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
			var keyCheck = keyZones[keyMapIndex];
			var keysMapped = keyCheck[1];
			var keysTotal = keysMapped.length;
			for (var index = 0; index < keysTotal; ++index) {
				if (keysMapped[index] == keyCode) {

					console.log('KEYUP ' + keyCheck[0]);

						socket.emit('keyup', keyCheck[0]);

					try {
						event.preventDefault();
					}
					catch (error) { }
				}
			}
		}
	}

	document.addEventListener("keydown", keyDown);
	document.addEventListener("keyup", keyUp);

	// var PokemonRedROM = base64_decode(decodePokemonRedROM());

	// gbc.load({ name: 'Pokemon Red', ROM: PokemonRedROM });

	// $('.switch').click( function () {
	// 	if (gbc.power) {
	// 		$('.switch').removeClass('on');
	// 		gbc.turnOff();
	// 		socket.emit('turnoff');
	// 	} else {
	// 		if (gbc.loaded()) {
	// 			$('.switch').addClass('on');
	// 			gbc.turnOn();

	// 			socket.emit('turnon');
	// 		}
	// 	}
	// });

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

/**
 * Darkens the canvas that represents the LCD.
 * @return {[type]} [description]
 */
var blackOutCanvas = function () {
	var canvas = document.getElementById("mainCanvas");
	var context = canvas.getContext('2d');
	context.rect(0, 0, canvas.width, canvas.height);
	context.fillStyle = 'black';
	context.fill();
};
