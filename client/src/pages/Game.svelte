<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Phaser from "phaser";
    import CityScene from "../scripts/CityScene";
    import { navigate } from "svelte-routing";
    import WebSocketClient from "../lib/websocket";
    import SFUClient from "../lib/sfu";
    import * as api from "../lib/api";

    let game: Phaser.Game | null = null;
    let fullscreen = false;
    let playerData: any = null;
    let socket: WebSocketClient | null = null;
    let stream: MediaStream | null = null;
    let sfu: SFUClient | null = null;
    let remoteStreams = new Map<string, PlayerData & { stream: MediaStream }>(); // playerId -> PlayerData + MediaStream
    let connectionStatus = "Connecting...";
    let connectionColor = "#facc15";
    let latency = "--";

    function attachStream(node: HTMLVideoElement, mediaStream: MediaStream|null) {
        if (!mediaStream) {
            console.warn("No media stream provided for video element");
            return;
        }

        node.srcObject = mediaStream;
        void node.play().catch(console.error);

        return {
            update(nextStream: MediaStream) {
                node.srcObject = nextStream;
                void node.play().catch(console.error);
            },
            destroy() {
                node.srcObject = null;
            },
        };
    }

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

                game?.scene.start("CityScene", { playerData, socket, sfu });
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

            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });

            sfu = new SFUClient(stream, playerData.id);

            sfu.onRemoteStreamAdded = (
                playerId: string,
                stream: MediaStream,
            ) => {
                api.getPlayerData(playerId)
                    .then((playerData) => {
                        remoteStreams.set(playerId, { ...playerData, stream });
                    })
                    .catch((error) => {
                        console.error(
                            `Failed to fetch player data for ${playerId}:`,
                            error,
                        );

                        remoteStreams.set(playerId, { id: "-1", name: "Unknown", wealth: 0, checkpoint: {x: -1, y: -1}, spritesheet: "", stream });
                    })
                    .finally(() => {
                        remoteStreams = new Map(remoteStreams); // Trigger Svelte reactivity
                    });
            };

            sfu.onRemoteStreamRemoved = (playerId: string) => {
                remoteStreams.delete(playerId);

                remoteStreams = new Map(remoteStreams); // Trigger Svelte reactivity
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
                const startScene = () => {
                    game?.scene.add("CityScene", CityScene, true, {
                        playerData,
                        socket,
                        sfu,
                    });
                };

                if (sfu && sfu.isReady && socket) {
                    startScene();
                } else {
                    setTimeout(startScene, 1500);
                }
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
        sfu?.close();
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

    {#if remoteStreams.size > 0}
        <div class="video-dock">
            <div class="video-card">
                <video 
                    use:attachStream={stream} 
                    autoplay 
                    muted 
                    playsinline
                    controls
                ></video>

                <div class="video-label">
                    You
                </div>
            </div>

            {#each Array.from(remoteStreams.entries()) as [playerId, player] (playerId)}
                <div class="video-card">
                    <video 
                        use:attachStream={player.stream} 
                        autoplay 
                        muted 
                        playsinline
                    ></video>

                    <div class="video-label">
                        {player.name}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .page {
        width: 100%;
        height: 100vh;
        position: relative;
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

    .video-dock {
        position: absolute;
        right: 16px;
        bottom: 16px;

        display: flex;
        flex-direction: column;
        gap: 12px;

        max-height: 80vh;
        overflow-y: auto;

        z-index: 1000;
    }

    .video-card {
        position: relative;

        width: 220px;
        aspect-ratio: 16 / 9;

        border-radius: 12px;
        overflow: hidden;

        background: #111827;

        border: 2px solid rgba(6, 182, 212, 0.35);

        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .video-card video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .video-label {
        position: absolute;
        left: 8px;
        bottom: 8px;

        padding: 4px 8px;

        border-radius: 6px;

        background: rgba(0, 0, 0, 0.6);

        color: white;
        font-size: 13px;
    }
</style>
