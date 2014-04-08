'use strict';

var vkey = require('vkey');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

module.exports = function(game, opts) {
  return new KeysPlugin(game, opts);
};
module.exports.pluginInfo = {
  clientOnly: true // TODO: server-based keybindings? send keys to server, have it tell client what to do?
};

function KeysPlugin(game, opts) {
  this.game = game;
  if (!this.game.buttons || !this.game.buttons.bindings) throw new Error('voxel-keys requires game.buttons as kb-bindings with game.buttons.bindings'); // TODO: game-shell

  this.states = {};

  this.down = new EventEmitter();
  this.up = new EventEmitter();
  this.changed = new EventEmitter();

  this.enable();
}

// get bound name of pressed key from event, or undefined if none
KeysPlugin.prototype.getBindingName = function(code) {
  var key = vkey[code];
  if (key === undefined) return undefined;

  var bindingName = this.game.buttons.bindings[key]; // TODO: game-shell, inverse lookup

  return bindingName;
};

KeysPlugin.prototype.enable = function() {
  var self = this;

  // TODO: compatibility with game-shell, .pointerLock property instead of events
  this.game.interact.on('attain', this.onAttain = function() {
    self.activate(true);
  });
  this.game.interact.on('release', this.onRelease = function() {
    self.activate(false);
  });
};

KeysPlugin.prototype.disable = function() {
  this.activate(false);
  this.game.interact.removeListener('attain', this.onAttain);
  this.game.interact.removeListener('release', this.onRelease);
};

KeysPlugin.prototype.activate = function(flag) {
  if (flag) {
    document.body.addEventListener('keydown', this.onKeyDown = this.keyDown.bind(this));
    document.body.addEventListener('keyup', this.onKeyUp = this.keyUp.bind(this));
  } else {
    document.body.removeEventListener('keydown', this.onKeyDown);
    document.body.removeEventListener('keyup', this.onKeyUp);
    this.states = {};
  }
};


KeysPlugin.prototype.keyDown = function(ev) {
  var code = ev.keyCode; // TODO: keyCode is deprecated in favor of (unimplemented) key, according to https://developer.mozilla.org/en-US/docs/Web/Reference/Events/keydown

  // released -> pressed
  if (!this.states[code]) {
    var binding = this.getBindingName(code);
    if (binding) {
      this.down.emit(binding);
      this.changed.emit(binding);
    }
  }

  this.states[code] += 1;
};

KeysPlugin.prototype.keyUp = function(ev) {
  var code = ev.keyCode;

  // pressed -> released
  if (this.states[code] !== 0) {
    var binding = this.getBindingName(code);
    if (binding) {
      this.up.emit(binding);
      this.changed.emit(binding);
    }
  }

  this.states[code] = 0;
};

