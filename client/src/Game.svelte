<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Phaser from "phaser";
    import MainMenuScene from "./scripts/MainMenuScene";
    import CityScene from "./scripts/CityScene";

    let game: Phaser.Game;
    let fullScreenButton: HTMLButtonElement;

    const handleFullScreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen()
            fullScreenButton.innerText = "Exit Full Screen"; // Change button text when entering full screen
        } else {
            document.exitFullscreen();
            fullScreenButton.innerText = "Full Screen"; // Change button text when exiting full screen
        }
    };

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
            roundPixels: false,
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
        fullScreenButton = document.getElementById("full-screen-btn") as HTMLButtonElement;

        // Add event listener for full screen button
        fullScreenButton.addEventListener("click", handleFullScreen);

        return () => {
            game.destroy(true);
            fullScreenButton.removeEventListener("click", handleFullScreen);
            fullScreenButton.innerText = "Full Screen"; // Reset button text
        };
    });

    onDestroy(() => {
        game.destroy(true);
        fullScreenButton.removeEventListener("click", handleFullScreen);
        fullScreenButton.innerText = "Full Screen"; // Reset button text
    });
</script>

<!-- Container for Phaser game -->
<div class="container">
    <div id="game-container"></div>
    <button id="full-screen-btn">Full Screen</button>
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
    #full-screen-btn {
        position: absolute;
        bottom: 10px;
        right: 10px;
        z-index: 1000;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
    #full-screen-btn:hover {
        background-color: #0056b3;
    }
</style>