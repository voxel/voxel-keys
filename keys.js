'use strict';

var vkey = require('vkey');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var toArray = require('toarray');

module.exports = function(game, opts) {
  return new KeysPlugin(game, opts);
};
module.exports.pluginInfo = {
  clientOnly: true // TODO: server-based keybindings? send keys to server, have it tell client what to do?
};

function KeysPlugin(game, opts) {
  this.game = game;
  if (this.game.shell && this.game.shell.bindings) {
    this.getBindingsNames = this.getBindingsNamesGS;
  } else if (this.game.buttons && this.game.buttons.bindings) {
    this.getBindingsNames = this.getBindingsNamesKB;
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

// cleanup key name - based on https://github.com/mikolalysenko/game-shell/blob/master/shell.js
// and also in voxel-engine TODO: refactor with those
var filtered_vkey = function(k) {
  if(k.charAt(0) === '<' && k.charAt(k.length-1) === '>') {
    k = k.substring(1, k.length-1)
  }
  k = k.replace(/\s/g, "-")
  return k
}

KeysPlugin.prototype.registerKey = function(name, defaultKey) {
  if (!this.game.shell) return; // no-op; requires static assignment

  // if no key is bound for this name, bind it (allow customization -
  // this call only provides a default if none is present)
  if (!(name in this.game.shell.bindings)) {
    this.game.shell.bind(name, defaultKey);
  }
};

KeysPlugin.prototype.unregisterKey = function(name) {
  if (!this.game.shell) return;

  this.game.shell.unbind(name); // TODO: only remove default key? something else might use this binding?
};

// get bound name of pressed key from event, or undefined if none

// for kb-bindings
KeysPlugin.prototype.getBindingsNamesKB = function(code) {
  var key = vkey[code];
  if (key === undefined) return undefined;

  var bindingName = this.game.buttons.bindings[key];

  return toarray(bindingName);
};

// for game-shell
KeysPlugin.prototype.getBindingsNamesGS = function(code) {
  var found = [];
  var key = vkey[code];
  if (key === undefined) return undefined;

  key = filtered_vkey(key);

  // TODO: optimize inverse lookup, cache?
  for (var bindingName in this.game.shell.bindings) {
    if (this.game.shell.bindings[bindingName].indexOf(key) !== -1) {
      found.push(bindingName);
    }
  }
  return found;
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
    var bindings = this.getBindingsNames(code);
    for (var i = 0; i < bindings.length; i += 1) {
      var binding = bindings[i];

      this.down.emit(binding, ev);
      this.changed.emit(binding, ev);
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
    var bindings = this.getBindingsNames(code);
    for (var i = 0; i < bindings.length; i += 1) {
      var binding = bindings[i];

      this.up.emit(binding, ev);
      this.changed.emit(binding, ev);
    }
  }

  this.states[code] = 0;
};

