<script lang="ts">
    import { onMount } from "svelte";
    import Phaser from "phaser";
    import { animationFrames, sprites } from "../scripts/assets";
    import { findWorldByName, createWorld } from "../lib/api";
    import { navigate } from "svelte-routing";
    import { authState } from "../lib/auth.svelte";

    let game: Phaser.Game;
    let scene: PlayScene | null = null;

    const spriteOptions = Object.keys(sprites);

    let playerData = {
        name: "New Player",
        spritesheet: `${spriteOptions[0]}_0`,
        world_id: -1,
        wealth: 100,
        checkpoint: { x: 200, y: 300 },
    };

    let spriteIndex = 0;
    let variant = 0;

    let worldSearch = "";
    let worlds: any[] = [];
    let selectedWorld: any = null;

    let showWorldModal = false;
    let newWorldName = "";

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
                            frames: this.anims.generateFrameNumbers(
                                sheet,
                                frames[anim],
                            ),
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

    async function searchWorld() {
        if (!worldSearch.trim()) {
            worlds = [];
            return;
        }

        worlds = await findWorldByName(worldSearch);
    }

    function selectWorld(world: any) {
        selectedWorld = world;

        playerData.world_id = world.id;

        worlds = [];
        worldSearch = world.name;
    }

    async function saveWorld() {
        if (!newWorldName.trim()) return;

        const world = await authState.createWorld(newWorldName);

        selectWorld(world);

        newWorldName = "";
        showWorldModal = false;
    }

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

     function createPlayer() {
        authState.createPlayer(playerData)
            .then((playerData) => {
                console.log("Player created successfully:", playerData);
                // Navigate to the main menu or game page
                navigate("/");
            })
            .catch((error) => {
                console.error("Error creating player:", error);
                alert("Failed to create player. Please try again.");
            });
    }
</script>

<main>
    <h1>⚔ CREATE CHARACTER ⚔</h1>

    <section class="panel">
        <div class="preview">
            <div id="playerShow"></div>

            <h2>
                {playerData.name}
            </h2>
        </div>

        <div class="controls">
            <label>PLAYER NAME</label>

            <input bind:value={playerData.name} />

            <label>WORLD</label>

            <div class="worldSearch">
                <input
                    placeholder="Search world..."
                    bind:value={worldSearch}
                    on:input={searchWorld}
                />

                <button
                    class="newWorld"
                    on:click={() => (showWorldModal = true)}
                >
                    Create New +
                </button>
            </div>

            {#if worlds.length}
                <div class="worldList">
                    {#each worlds as world}
                        <button
                            class="worldOption"
                            on:click={() => selectWorld(world)}
                        >
                            🌍 {world.name} [{world.id}]
                            ({world.playersCount} players)
                        </button>
                    {/each}
                </div>
            {/if}

            {#if selectedWorld}
                <div class="selected">
                    Selected:
                    <b>{selectedWorld.name}</b>
                </div>
            {/if}

            <label>CHARACTER</label>

            <div class="selector">
                <button on:click={() => changeSprite(-1)}> ◀ </button>

                <span>
                    {spriteOptions[spriteIndex]}
                </span>

                <button on:click={() => changeSprite(1)}> ▶ </button>
            </div>

            <label>VARIANT</label>

            <div class="selector">
                <button on:click={() => changeVariant(-1)}> ◀ </button>

                <span>
                    {variant}
                </span>

                <button on:click={() => changeVariant(1)}> ▶ </button>
            </div>

            <div class="stats">
                💰 Starting Wealth:
                <b>$100</b>

                <br />

                📍 Spawn:
                <b>200,300</b>
            </div>

            <button class="create" on:click={createPlayer}>
                CREATE PLAYER
            </button>
        </div>
    </section>

    {#if showWorldModal}
        <div class="overlay">
            <div class="modal">
                <h2>Create World</h2>

                <input placeholder="World name" bind:value={newWorldName} />

                <button class="create" on:click={saveWorld}> Create </button>

                <button on:click={() => (showWorldModal = false)}>
                    Cancel
                </button>
            </div>
        </div>
    {/if}
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

    .worldSearch {
        display: flex;
        gap: 10px;
    }

    .newWorld {
        background: #f59e0b;
        color: white;
    }

    .worldList {
        margin-top: 10px;
        background: #111827;
        border-radius: 10px;
    }

    .worldOption {
        width: 100%;
        background: #1e293b;
        color: white;
        text-align: left;
    }

    .selected {
        margin-top: 10px;
        padding: 10px;
        background: #14532d;
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

    .stats {
        margin-top: 20px;
        padding: 15px;
        background: #111827;
        border-radius: 10px;
    }

    .create {
        width: 100%;
        margin-top: 20px;
        background: linear-gradient(90deg, #22c55e, #06b6d4);
        color: white;
        font-weight: bold;
    }

    .overlay {
        position: fixed;
        inset: 0;
        background: #0008;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal {
        width: 350px;
        padding: 30px;
        background: #0f172a;
        border-radius: 20px;
        border: 1px solid #00ffff;
    }

    .modal button:last-child {
        margin-top: 10px;
        background: #ef4444;
        color: white;
    }
</style>
