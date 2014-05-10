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
  if (this.game.shell && this.game.shell.bindings) {
    this.getBindingName = this.getBindingNameGS;
  } else if (this.game.buttons && this.game.buttons.bindings) {
    this.getBindingName = this.getBindingNameKB;
  } else {
    throw new Error('voxel-keys requires either kb-bindings or game-shell');
  }

  this.states = {};
  this.isActive = false;

  this.preventDefaultKeys = opts.preventDefaultKeys !== undefined ? opts.preventDefaultKeys : true;
  this.preventDefaultContext = opts.preventDefaultContext !== undefined ? opts.preventDefaultContext : true;

  this.down = new EventEmitter();
  this.up = new EventEmitter();
  this.changed = new EventEmitter();

  this.enable();
}

// get bound name of pressed key from event, or undefined if none

// for kb-bindings
KeysPlugin.prototype.getBindingNameKB = function(code) {
  var key = vkey[code];
  if (key === undefined) return undefined;

  var bindingName = this.game.buttons.bindings[key];

  return bindingName;
};

// for game-shell
KeysPlugin.prototype.getBindingNameGS = function(code) {
  var key = vkey[code];
  if (key === undefined) return undefined;

  // TODO: optimize inverse lookup, cache?
  for (var bindingName in this.game.shell.bindings) {
    if (this.game.shell.bindings[bindingName].indexOf(key) !== -1) {
      return bindingName;
    }
  }
};

KeysPlugin.prototype.enable = function() {
  var self = this;

  if (this.game.shell) {
    // when game-shell, always listen and check .pointerLock property
    self.activate(true);
  } else if (this.game.interact) {
    // voxel-engine interact module, controls pointer lock
    this.game.interact.on('attain', this.onAttain = function() {
      self.activate(true);
    });
    this.game.interact.on('release', this.onRelease = function() {
      self.activate(false);
    });
  } else {
    throw new Error('voxel-keys could not enable, have neither game.shell nor game.interact');
  }

  if (this.preventDefaultContext) {
    document.body.addEventListener('contextmenu', this.onContextMenu = function(ev) {
      ev.preventDefault();
    });
  }
};

KeysPlugin.prototype.disable = function() {
  if (this.preventDefaultContext) document.body.removeEventListener('contextMenu', this.onContextMenu);
  this.activate(false);
  if (!this.game.shell && this.game.interact) {
    this.game.interact.removeListener('attain', this.onAttain);
    this.game.interact.removeListener('release', this.onRelease);
  }
};

KeysPlugin.prototype.activate = function(flag) {
  if (this.isActive ^ flag) {
    if (flag) {
      document.body.addEventListener('keydown', this.onKeyDown = this.keyDown.bind(this));
      document.body.addEventListener('keyup', this.onKeyUp = this.keyUp.bind(this));
    } else {
      document.body.removeEventListener('keydown', this.onKeyDown);
      document.body.removeEventListener('keyup', this.onKeyUp);
      this.states = {};
    }
    this.isActive = flag;
  }
};


KeysPlugin.prototype.keyDown = function(ev) {
  if (this.game.shell && !this.game.shell.pointerLock) return; // game-shell pointer lock not acquired

  if (this.preventDefaultKeys) ev.preventDefault();

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
  if (this.game.shell && !this.game.shell.pointerLock) return;

  if (this.preventDefaultKeys) ev.preventDefault();

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

