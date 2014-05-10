# voxel-keys

Events for key bindings (voxel.js plugin)

Use with [voxel-plugins](https://github.com/deathcap/voxel-plugins):

    var keys = game.plugins.get('voxel-keys');

    keys.down.on('left', function() {
        console.log('the key corresponding to the left keybinding was pressed');
    });

Supports either [kb-bindings](https://github.com/deathcap/kb-bindings) or
[game-shell](https://github.com/mikolalysenko/game-shell).

Three event emitters are available on the plugin instance: `down`, `up`, and `changed`.
All emit events corresponding to the name of the keybinding (not the key name itself,
but the descriptive name, for example "left" for "A", if using FPS-style WASD movement controls).
The events are only emitted when the state changes from up to down, or down to up
(*not* continuously while pressed, unlike the DOM keypress event).

When used with game-shell, an additional API is available to add default keybindings:

    keys.registerKey('left', 'A');

will bind `left` to `A` if there is no existing binding for `left`. Without game-shell,
default keybindings are instead defined statically with the `keybindings` option to voxel-engine.

## License

MIT

