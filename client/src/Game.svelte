<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Phaser from "phaser";
    import MainMenuScene from "./scripts/MainMenuScene";
    import CityScene from "./scripts/CityScene";

    let game: Phaser.Game;

    onMount(() => {
        // Define the Phaser game configuration
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: "game-container",
            fullscreenTarget: "game-container",
            dom: {
                createContainer: true
            },
            pixelArt: true,
            scene: [MainMenuScene, CityScene],
            scale: {
                mode: Phaser.Scale.RESIZE
            },
            physics: {
                default: "arcade",
                arcade: {
                    gravity: { x: 0, y: 0 },
                }
            },
        };

        game = new Phaser.Game(config);

        return () => {
            game.destroy(true);
        };
    });

    onDestroy(() => {
        game.destroy(true);
    });
</script>

<!-- Container for Phaser game -->
<div class="container">
    <div id="game-container"></div>
</div>

<!-- Style the game container if needed -->
<style>
    .container {
        width: 100vw;
        height: 100vh;
    }
    #game-container {
        width: 100%;
        height: 100%;
        position: relative;
    }
</style>