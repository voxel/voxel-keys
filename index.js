'use strict';

var vkey = require('vkey');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

module.exports = function(game, opts) {
  return new KeysPlugin(game, opts);
};

function KeysPlugin(game, opts) {
  this.states = {};

  this.down = new EventEmitter();
  this.up = new EventEmitter();
  this.changed = new EventEmitter(); // TODO

  this.enable();
}

KeysPlugin.prototype.enable = function() {
  document.body.addEventListener('keydown', this.onKeyDown = this.keyDown.bind(this));
  document.body.addEventListener('keyup', this.onKeyUp = this.keyUp.bind(this));
};

KeysPlugin.prototype.disable = function() {
  document.body.removeEventListener('keydown', this.onKeyDown);
  document.body.removeEventListener('keyup', this.onKeyUp);
};

KeysPlugin.prototype.keyDown = function(ev) {
  var key = vkey[ev.keyCode]; // TODO: keyCode is deprecated in favor of (unimplemented) key, according to https://developer.mozilla.org/en-US/docs/Web/Reference/Events/keydown

  if (this.states[key] === 0) {
    this.down.emit(key); // TODO: emit binding not key
  }

  this.states[key] += 1; // TODO: use bindings for state instead of key?
};

KeysPlugin.prototype.keyUp = function(ev) {
  var key = vkey[ev.keyCode];

  if (this.states[key] !== 0) {
    this.up.emit(key);
  }

  this.states[key] = 0;
};

