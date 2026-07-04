<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Phaser from "phaser";
    import CityScene from "../scripts/CityScene";
    import { navigate } from "svelte-routing";
    import WebSocketClient from "../lib/websocket";

    let game: Phaser.Game | null = null;
    let fullscreen = false;
    let playerData: any = null;
    let socket: WebSocketClient | null = null;
    let connectionStatus = "Connecting...";
    let connectionColor = "#facc15";
    let latency = "--";

    $: pingColor =
        latency === "--"
            ? "#9ca3af"
            : parseInt(latency) < 80
            ? "#22c55e"
            : parseInt(latency) < 150
            ? "#f59e0b"
            : "#ef4444";

    function resizeGame() {
        setTimeout(() => {
            game?.scale.setGameSize(window.innerWidth, window.innerHeight - 40);
        }, 200);
    }

    async function toggleFullscreen() {
        const container = document.querySelector(".page");

        if (!document.fullscreenElement) {
            await container?.requestFullscreen();
            fullscreen = true;
        } else {
            await document.exitFullscreen();
            fullscreen = false;
        }

        resizeGame();
    }

    onMount(async () => {
        try {
            if (!history.state?.playerData) {
                window.location.href = "/";
                return;
            }

            playerData = history.state.playerData;
            socket = await WebSocketClient.create(playerData.id);

            if (!socket) {
                console.error("WebSocket connection failed");
                setTimeout(() => {
                    window.location.href = "/";
                }, 2000);
                return;
            }

            socket.onOpen = () => {
                connectionStatus = "Connected";
                connectionColor = "#22c55e";
            };

            socket.onPong = (ping: number) => {
                latency = `${ping} ms`;
            };

            socket.onReconnect = () => {
                connectionStatus = "Reconnecting...";
                connectionColor = "#f59e0b";
                latency = "--";

                game?.scene.start("CityScene", { playerData, socket });
            };

            socket.onClose = () => {
                connectionStatus = "Disconnected";
                connectionColor = "#ef4444";
                latency = "--";
            };

            socket.onError = () => {
                connectionStatus = "Connection Error";
                connectionColor = "#ef4444";
                latency = "--";
            };

            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent: "game-container",

                pixelArt: true,

                width: window.innerWidth,
                height: window.innerHeight - 40,

                render: {
                    antialias: false,
                    roundPixels: true,
                },

                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },

                dom: {
                    createContainer: true,
                },

                scene: [],

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

            game.events.on("ready", () => {
                game?.scene.add("CityScene", CityScene, true, {
                    playerData,
                    socket,
                });
            });

            window.addEventListener("resize", resizeGame);
            document.addEventListener("fullscreenchange", resizeGame);
        } catch (error) {
            console.error("Error In Game Initialization", error);
            setTimeout(() => {
                window.location.href = "/";
            }, 2000);
        }
    });
    

    onDestroy(() => {
        socket?.close();
        game?.destroy(true);

        game = null;

        window.removeEventListener("resize", resizeGame);
        document.removeEventListener("fullscreenchange", resizeGame);
    });
</script>

<div class="page">
    <header>
        <button on:click={() => navigate("/")}> ← Menu </button>

        <div class="info">
            <div class="player">
                <div class="avatar">
                    {playerData?.name?.charAt(0).toUpperCase()}
                </div>

                <div>
                    <b>
                        {playerData?.name} · {playerData?.world?.name}
                    </b>

                    <small>
                        💰 {playerData?.wealth ?? 0}
                    </small>
                </div>
            </div>

            <div class="network">
                <span class="status" style="--status:{connectionColor}">
                    ● {connectionStatus}
                </span>

                <span style="color: {pingColor}">
                    📶 {latency}
                </span>
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
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #020617;
        overflow: hidden;
        font-family: "Arial", sans-serif;
        font-size: 14px;
    }

    header {
        height: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 25px;
        background: rgba(15, 23, 42, 0.95);
        border-bottom: 1px solid rgba(0, 255, 255, 0.2);
        z-index: 10;
    }

    .info {
        display: flex;
        align-items: center;
        gap: 24px;
    }

    .network {
        display: flex;
        gap: 14px;
        align-items: center;
        color: #d1d5db;
        font-size: 13px;
    }

    .status {
        color: var(--status);
        font-weight: bold;
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
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #06b6d4, #8b5cf6);
        font-weight: bold;
    }

    button {
        padding: 8px 12px;
        border: 0;
        border-radius: 10px;
        background: linear-gradient(90deg, #06b6d4, #8b5cf6);
        color: white;
        font-weight: bold;
        cursor: pointer;
    }

    #game-wrapper {
        position: relative;
        flex: 1;
        width: 100%;
        overflow: hidden;
    }

    #game-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }
</style>
