
/**
 * Constructor.
 * @param {[type]} element [description]
 */
function Chat (element) {
	this.element = element;
}

/**
 * Adds a line into the chat box dialogue.
 * @param {[type]} name [description]
 * @param {[type]} text [description]
 */
Chat.prototype.addLine = function (name, text, color) {

	var span = $(document.createElement('span'));
	span.addClass('name');
	if (typeof color === 'number')
		span.addClass(['c_red', 'c_blu', 'c_yel', 'c_gre', 'c_pur', 'c_ora'][color]);
	span.html(name + ': ');

	var div = $(document.createElement('div'));
	div.attr('class', 'chat-log-line');

	div.append(span);
	div.append(text);

	this.element.append(div);
	this.element.scrollTop(this.element[0].scrollHeight);
};

/**
 * Returns whether or not the chatbox input currently has focus.
 * @return {Boolean} 
 */
Chat.prototype.hasFocus = function () {

	return $(document.activeElement)[0] === $('input[name="chat-input-line"]')[0];
};

/**
 * Binds the chatbox to global scope.
 */
$(document).ready(function () {

	window.chatbox = new Chat($('.chat'));

});