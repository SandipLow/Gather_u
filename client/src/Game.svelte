<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Phaser from "phaser";
    import MainMenuScene from "./scripts/MainMenuScene";
    import CityScene from "./scripts/CityScene";

    let game: Phaser.Game;

    onMount(() => {
        // Define the Phaser game configuration
        const config = {
            type: Phaser.AUTO,
            parent: "game-container",
            pixelArt: true,
            scene: [MainMenuScene, CityScene],
            width: 320,
            height: 240,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 800,
                height: 600,
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
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    #game-container {
        width: 100%;
        height: 100%;
    }
</style>