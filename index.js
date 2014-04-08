'use strict';

module.exports = function(game, opts) {
  return new KeysPlugin(game, opts);
};

function KeysPlugin(game, opts) {
  this.enable();
}

KeysPlugin.prototype.enable = function() {
};

KeysPlugin.prototype.disable = function() {
};
