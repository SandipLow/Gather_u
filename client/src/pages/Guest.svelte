<script lang="ts">
    import { onMount, setContext } from "svelte";
    import Phaser from "phaser";
    import { animationFrames, sprites } from "../scripts/assets";
    import { createGuestPlayer } from "../lib/api";
    import { navigate } from "svelte-routing";
    import { writable } from "svelte/store";

    let game: Phaser.Game;
    let scene: PlayScene | null = null;

    const spriteOptions = Object.keys(sprites);

    let playerData = {
        name: "Guest",
        spritesheet: `${spriteOptions[0]}_0`,
    };

    let spriteIndex = 0;
    let variant = 0;
    let error = "";

    const gameStore = writable({
        token: '',
        player: null,
        world: null,
    } as any);
    setContext('game', gameStore);

    class PlayScene extends Phaser.Scene {
        player!: Phaser.GameObjects.Sprite;

        constructor() {
            super("PlayScene");
        }

        preload() {
            for (const key in sprites) {
                this.load.spritesheet(key, sprites[key], {
                    frameWidth: 16,
                    frameHeight: 16,
                });
            }
        }

        create() {
            this.createAnimations();
            this.player = this.add.sprite(32, 32, spriteOptions[0]);
            this.player.setScale(3);
            this.updatePlayer();
            scene = this;
        }

        createAnimations() {
            for (const sheet in sprites) {
                animationFrames.forEach((frames, variant) => {
                    for (const anim in frames) {
                        const key = `${sheet}_${variant}_${anim}`;
                        if (this.anims.exists(key)) continue;
                        this.anims.create({
                            key,
                            frames: this.anims.generateFrameNumbers(sheet, frames[anim]),
                            frameRate: 10,
                            repeat: -1,
                        });
                    }
                });
            }
        }

        updatePlayer() {
            if (!this.player) return;
            const [sheet, variant] = playerData.spritesheet.split("_");
            this.player.setTexture(sheet);
            this.player.anims.play(`${sheet}_${variant}_walk-down`, true);
        }
    }

    onMount(() => {
        game = new Phaser.Game({
            type: Phaser.AUTO,
            width: 64,
            height: 64,
            parent: "playerShow",
            pixelArt: true,
            transparent: true,
            scene: PlayScene,
        });

        return () => game.destroy(true);
    });

    function changeSprite(dir: number) {
        spriteIndex += dir;
        if (spriteIndex < 0) spriteIndex = spriteOptions.length - 1;
        if (spriteIndex >= spriteOptions.length) spriteIndex = 0;
        updateSelection();
    }

    function changeVariant(dir: number) {
        variant += dir;
        if (variant < 0) variant = 7;
        if (variant > 7) variant = 0;
        updateSelection();
    }

    function updateSelection() {
        playerData.spritesheet = `${spriteOptions[spriteIndex]}_${variant}`;
        scene?.updatePlayer();
    }

    async function joinAsGuest() {
        if (!playerData.name.trim()) {
            error = "Please enter a name.";
            return;
        }

        try {
            const { player, token } = await createGuestPlayer(playerData.name, playerData.spritesheet);

            // Navigate to the game page with the player data in the state
            navigate("/game", {
                state: {
                    playerData: player,
                    token
                }
            });

        } catch (err: any) {
            error = err.message;
        }
    }
</script>

<main>
    <h1>⚔ JOIN AS GUEST ⚔</h1>

    <section class="panel">
        <div class="preview">
            <div id="playerShow"></div>
            <h2>{playerData.name}</h2>
        </div>

        <div class="controls">
            <label>PLAYER NAME</label>
            <input bind:value={playerData.name} />

            <label>CHARACTER</label>
            <div class="selector">
                <button on:click={() => changeSprite(-1)}>◀</button>
                <span>{spriteOptions[spriteIndex]}</span>
                <button on:click={() => changeSprite(1)}>▶</button>
            </div>

            <label>VARIANT</label>
            <div class="selector">
                <button on:click={() => changeVariant(-1)}>◀</button>
                <span>{variant}</span>
                <button on:click={() => changeVariant(1)}>▶</button>
            </div>

            <button class="create" on:click={joinAsGuest}>JOIN WORLD</button>
            {#if error}
                <p class="error">{error}</p>
            {/if}
        </div>
    </section>
</main>

<style>
    main {
        min-height: 100vh;
        padding: 40px;
        color: white;
        font-family: Inter, system-ui;
        background: radial-gradient(circle at top, #1e293b, #020617);
    }
    h1 {
        text-align: center;
        color: #00ffff;
    }
    .panel {
        max-width: 750px;
        margin: 50px auto;
        display: flex;
        gap: 40px;
        padding: 35px;
        background: #0f172add;
        border: 1px solid #00ffff;
        border-radius: 20px;
    }
    #playerShow {
        width: 128px;
        height: 128px;
        background: #000;
    }
    .controls {
        flex: 1;
    }
    label {
        display: block;
        margin-top: 15px;
        color: #38bdf8;
    }
    input {
        width: 100%;
        padding: 12px;
        background: #020617;
        color: white;
        border: 1px solid #334155;
        border-radius: 10px;
    }
    .selector {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
    }
    button {
        padding: 12px 18px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
    }
    .selector button {
        background: #8b5cf6;
        color: white;
    }
    .create {
        width: 100%;
        margin-top: 20px;
        background: linear-gradient(90deg, #22c55e, #06b6d4);
        color: white;
        font-weight: bold;
    }
    .error {
        color: #fc8181;
        text-align: center;
        margin-top: 1rem;
    }
</style>