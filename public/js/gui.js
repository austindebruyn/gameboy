
var authorized = function () {
	hide('module-register');
	hide('module-login', function () {
		show('module-host');
		show('module-join');
	});
};

var playing = function () {
	hide('module-host');
	hide('module-join', function () {
		show('module-gbc');
		show('module-chat');
	})
};

var unauthorized = function () {
		hide('module-gbc');
		hide('module-chat');
		hide('module-header', function () {
			show('module-login');
		});
};

var hide = function (id, callback) {
	var element = $('#' + id);
	element.removeClass('enabled');
	setTimeout(function () {
		element.css('display', 'none');
		if (callback) callback();
	}, 400);
};

var show = function (id, callback) {
	var element = $('#' + id);
	element.css('display', '');
	element.addClass('enabled');
	if (callback) setTimeout(callback, 400);
}

