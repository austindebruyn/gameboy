
/**
 * A class to model the gameboy module.
 */
function GBC () {
	this.game = null;
	this.power = false;
	blackOutCanvas();
}

/**
 * 
 * Loads a game cartridge into our virtual gameboy.
 * @param  {string} name 
 * @param  {string} ROM  Binary string
 * @return {undefined}
 */
GBC.prototype.load = function (game) {
	if (this.power) throw new Error('Turn the GBC off before loading a new game!');

	this.game = game;
};

/**
 * Returns whether or not there's a game loaded.
 * @return {boolean} 
 */
GBC.prototype.loaded = function () {
	return (this.game != null);
};

/**
 * Removes the game cartridge.
 * @return {undefined} 
 */
GBC.prototype.remove = function () {
	this.game = null;
};

/**
 * Toggles the power on the gameboy. If no game is loaded, nothing will happen.
 * @return {boolean} Whether or not the gbc is on or off.
 */
GBC.prototype.turnOn = function () {
	if (!this.loaded()) return false;
	if (this.power) return true;
	this.power = true;

	start(document.getElementById("mainCanvas"), this.game.ROM);

	return this.power;
};

/**
 * Turns the gameboy off.
 * @return {undefined}
 */
GBC.prototype.turnOff = function () {
	if (!this.power) return false;
	this.power = false;
	pause();
	blackOutCanvas();
};

GBC.prototype.getFB = function () {
	if (typeof gameboyCore === 'undefined') return null;
	return gameboyCore.frameBuffer;
}
