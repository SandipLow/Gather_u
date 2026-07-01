<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Phaser from "phaser";
    import CityScene from "../scripts/CityScene";
    import { navigate } from "svelte-routing";

    let game: Phaser.Game | null = null;
    let fullscreen = false;
    let playerData: any = null;

    onMount(async () => {
        if (!history.state?.playerData) {
            window.location.href = "/";
            return;
        }

        playerData = history.state.playerData;

        game = new Phaser.Game({
            type: Phaser.AUTO,
            parent: "game-container",

            pixelArt: true,

            width: window.innerWidth,
            height: window.innerHeight-70,

            render: {
                antialias: false,
                roundPixels: true,
            },

            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },

            scene: [CityScene],

            physics: {
                default: "arcade",
                arcade: {
                    gravity: {
                        x: 0,
                        y: 0,
                    },
                },
            },
        });

        game.scene.start("CityScene", playerData);

        window.addEventListener("resize", resizeGame);
        document.addEventListener("fullscreenchange", resizeGame);
    });

    function resizeGame() {

        setTimeout(() => {
            game?.scale.setGameSize(
                window.innerWidth,
                window.innerHeight - 70
            );
        }, 200);
    }

    async function toggleFullscreen() {
        const container = document.querySelector(".page");

        if (!document.fullscreenElement) {
            await container?.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    }

    onDestroy(() => {
        game?.destroy(true);
        game = null;

        window.removeEventListener("resize", resizeGame);
        document.removeEventListener("fullscreenchange", resizeGame);
    });
</script>

<div class="page">
    <header>
        <button on:click={() => navigate("/")}> ← Menu </button>

        <div class="player">
            <div class="avatar">
                {playerData?.name?.charAt(0).toUpperCase()}
            </div>

            <div>
                <b
                    >{playerData?.name || "Player"} in {playerData?.world
                        ?.name || "Unknown World"}</b
                >

                <small>
                    💰 {playerData?.wealth ?? 0}
                </small>
            </div>
        </div>

        <button on:click={toggleFullscreen}>
            {fullscreen ? "Exit" : "Fullscreen"}
        </button>
    </header>

    <div id="game-wrapper">
        <div id="game-container"></div>
    </div>
</div>

<style>
    .page {
        width:100%;
        height:100vh;
        display:flex;
        flex-direction:column;
        background:#020617;
        overflow:hidden;
    }

    header {
        height:70px;
        flex-shrink:0;
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:0 25px;
        background:rgba(15,23,42,.95);
        border-bottom:1px solid rgba(0,255,255,.2);
        z-index:10;
    }

    .player {
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
    }

    .player small {
        display: block;
        color: #38bdf8;
    }

    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #06b6d4, #8b5cf6);
        font-weight: bold;
    }

    button {
        padding: 10px 20px;
        border: 0;
        border-radius: 10px;
        background: linear-gradient(90deg, #06b6d4, #8b5cf6);
        color: white;
        font-weight: bold;
        cursor: pointer;
    }

    #game-wrapper {
        position:relative;
        flex:1;
        width:100%;
        overflow:hidden;
    }

    #game-container {
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
    }
</style>
