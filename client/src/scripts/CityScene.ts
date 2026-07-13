import Phaser from 'phaser';
import { OtherPlayer, Player } from './Player';
import { sprites } from './assets';
import WebSocketClient from '../lib/websocket';
import { getPlayerData } from '../lib/api';
import type SFUClient from '../lib/sfu';

export default class CityScene extends Phaser.Scene {
    private player: Player | null = null;
    private moveBuffer = new Map<string, {
        prev: { x: number; y: number; animation: string; timestamp: number };
        next: { x: number; y: number; animation: string; timestamp: number };
    }>();
    private otherPlayers = new Map<string, OtherPlayer>();
    private map: Phaser.Tilemaps.Tilemap | null = null;
    private socket: WebSocketClient | null = null;
    private playerData!: PlayerData;
    private sfu: SFUClient | null = null;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private overlayMask: Phaser.GameObjects.Graphics | null = null;
    private nears: Set<OtherPlayer> = new Set();
    private wasNear = false;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
    private chatInput: Phaser.GameObjects.DOMElement | null = null;
    private leftButton: Phaser.GameObjects.TileSprite | null = null;
    private rightButton: Phaser.GameObjects.TileSprite | null = null;
    private upButton: Phaser.GameObjects.TileSprite | null = null;
    private downButton: Phaser.GameObjects.TileSprite | null = null;
    private isSceneAlive = true;

    constructor() {
        super('CityScene');
    }

    init({playerData, socket, sfu}: { playerData: PlayerData; socket: WebSocketClient, sfu: SFUClient }) {
        this.playerData = playerData;
        this.socket = socket;
        this.sfu = sfu;
    }

    preload() {
        // Preload tilemap and tileset
        this.load.image('tiles', 'assets/city/tileset.png');
        this.load.tilemapTiledJSON('city_map', 'assets/city/map.json');

        // Preload all character sprites
        for (const sprite in sprites) {
            this.load.spritesheet(sprite, sprites[sprite], { frameWidth: 16, frameHeight: 16 });
        }

        // preload button UI
        this.load.spritesheet('buttons_ui', 'assets/ui/Orange Button Icons.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.isSceneAlive = true;

        this.textures.get("tiles").setFilter(Phaser.Textures.FilterMode.NEAREST);
        
        // Load the tilemap
        this.map = this.make.tilemap({ key: 'city_map' });
        const tileset = this.map.addTilesetImage('tileset', 'tiles');

        if (!tileset) {
            console.error("Failed to load tileset");
            return;
        }

        const base_layer = this.map.createLayer('base_layer', tileset, 0, 0);
        const grass_flowers = this.map.createLayer('grass_flowers', tileset, 0, 0);
        const houses = this.map.createLayer('houses', tileset, 0, 0);
        const trees = this.map.createLayer('trees_poles', tileset, 0, 0);

        if (!base_layer || !grass_flowers || !houses || !trees) {
            console.error("Failed to create layer");
            return;
        }

        houses.setCollisionByProperty({ collides: true });
        trees.setCollisionByProperty({ collides: true });


        // Bind the WebSocket events to the scene's methods
        if (this.socket) {
            this.socket.onEnter = this.#handleEnter.bind(this);
            this.socket.onLeave = this.#handleLeave.bind(this);
            this.socket.onMove = this.#handleMove.bind(this);
            this.socket.onTalk = this.#handleTalk.bind(this);
        }

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#handleShutdown, this);
        this.events.once(Phaser.Scenes.Events.DESTROY, this.#handleShutdown, this);


        // Create player
        this.cursors = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
        this.player = new Player(this, this.playerData, this.cursors);

        // Set camera to follow player
        this.cameras.main.startFollow(this.player.getSprite());
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setZoom(2);
        this.cameras.main.roundPixels = true;

        // Setup collisions
        this.physics.add.collider(this.player.getSprite(), houses);
        this.physics.add.collider(this.player.getSprite(), trees);

        // Layer Depths
        const depths = [
            base_layer,
            grass_flowers,
            this.player.getSprite(),
            houses,
            trees
        ]

        depths.forEach((depth, i) => {
            if (depth) {
                depth.setDepth(i);
            }
        });

        // overlay
        this.overlay = this.add.graphics();
        this.overlay.setDepth(100);  // Ensure it's above everything
        this.overlay.setScrollFactor(0);  // Lock to screen

        this.overlayMask = this.add.graphics();
        this.overlayMask.setVisible(false);

        // Render UI elements
        const chatInput = document.createElement('input');
        chatInput.type = 'text';
        chatInput.placeholder = 'Type a message...';
        chatInput.style.width = '100px';
        chatInput.style.fontSize = '10px';
        chatInput.style.zIndex = '1000';
        chatInput.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        chatInput.style.border = '1px solid #000';
        chatInput.style.padding = '5px';

        // Listen for focus on the chat input field
        chatInput.addEventListener('focus', () => {
            if (this.game.input.keyboard) {
                this.game.input.keyboard.enabled = false; // Disable Phaser's keyboard input
            }
        });

        // Listen for blur (when the input field loses focus)
        chatInput.addEventListener('blur', () => {
            if (this.game.input.keyboard) {
                this.game.input.keyboard.enabled = true; // Re-enable Phaser's keyboard input
            }
        });

        // Listen for Enter key to send the message
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                const message = chatInput.value.trim();
                if (message) {
                    this.#handleMessage(message);
                    chatInput.value = '';
                    chatInput.blur();
                }
            }
        });

        // Chat input DOM element
        this.chatInput = this.add.dom(0, 0, chatInput);
        this.chatInput.setOrigin(0.5);
        this.chatInput.setScrollFactor(0);
        this.chatInput.setVisible(false);

        // Create Directional UI buttons
        this.leftButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 105).setInteractive().setAlpha(0.6);
        this.rightButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 90).setInteractive().setAlpha(0.6);
        this.upButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 75).setInteractive().setAlpha(0.6);
        this.downButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 60).setInteractive().setAlpha(0.6);

        [this.leftButton, this.rightButton, this.upButton, this.downButton].forEach(btn => {
            btn.setOrigin(0.5);
            btn.setScrollFactor(0);
            btn.setDepth(1000);
        });

        if (this.sys.game.device.os.desktop) {
            // Hide buttons on desktop
            this.leftButton.setVisible(false);
            this.rightButton.setVisible(false);
            this.upButton.setVisible(false);
            this.downButton.setVisible(false);
        }
        else {
            // Show buttons on mobile
            this.leftButton.setVisible(true);
            this.rightButton.setVisible(true);
            this.upButton.setVisible(true);
            this.downButton.setVisible(true);

            // Touch/hold handling
            this.leftButton.on('pointerdown', () => {
                this.cursors ? this.cursors.left.isDown = true : null
                this.leftButton?.setTexture('buttons_ui', 107);
            });
            this.leftButton.on('pointerup', () => {
                this.cursors ? this.cursors.left.isDown = false : null
                this.leftButton?.setTexture('buttons_ui', 105);
            });
            this.leftButton.on('pointerout', () => {
                this.cursors ? this.cursors.left.isDown = false : null
                this.leftButton?.setTexture('buttons_ui', 105);
            });

            this.rightButton.on('pointerdown', () => {
                this.cursors ? this.cursors.right.isDown = true : null
                this.rightButton?.setTexture('buttons_ui', 92);
            });
            this.rightButton.on('pointerup', () => {
                this.cursors ? this.cursors.right.isDown = false : null
                this.rightButton?.setTexture('buttons_ui', 90);
            });
            this.rightButton.on('pointerout', () => {
                this.cursors ? this.cursors.right.isDown = false : null
                this.rightButton?.setTexture('buttons_ui', 90);
            });

            this.upButton.on('pointerdown', () => {
                this.cursors ? this.cursors.up.isDown = true : null
                this.upButton?.setTexture('buttons_ui', 77);
            });
            this.upButton.on('pointerup', () => {
                this.cursors ? this.cursors.up.isDown = false : null
                this.upButton?.setTexture('buttons_ui', 75);
            });
            this.upButton.on('pointerout', () => {
                this.cursors ? this.cursors.up.isDown = false : null
                this.upButton?.setTexture('buttons_ui', 75);
            });

            this.downButton.on('pointerdown', () => {
                this.cursors ? this.cursors.down.isDown = true : null
                this.downButton?.setTexture('buttons_ui', 62);
            });
            this.downButton.on('pointerup', () => {
                this.cursors ? this.cursors.down.isDown = false : null
                this.downButton?.setTexture('buttons_ui', 60);
            });
            this.downButton.on('pointerout', () => {
                this.cursors ? this.cursors.down.isDown = false : null
                this.downButton?.setTexture('buttons_ui', 60);
            });
        }

        this.#adjustUIElements();

        this.scale.on('resize', () => {
            this.#adjustUIElements();
        });

    }

    update() {
        if (!this.isSceneAlive) return;

        this.overlay?.clear();
        this.overlay?.clearMask();
        this.overlayMask?.clear();

        if (this.player) {
            this.player.update();

            for (const [playerId, otherPlayer] of this.otherPlayers) {
                const wasNear = this.nears.has(otherPlayer);
                const isNear = otherPlayer.checkProximity(this.player);

                if (isNear === wasNear) continue;

                if (isNear) {
                    this.nears.add(otherPlayer);
                    this.sfu?.requestRemoteStream(playerId);
                } else {
                    this.nears.delete(otherPlayer);
                    this.sfu?.removeRemoteStream(playerId);
                }
            }
        }

        // Interpolate other players every frame
        this.#tickInterpolation();

        if (this.nears.size > 0) {
            this.overlay?.fillStyle(0x000000, 0.7);
            this.overlay?.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

            for (const otherPlayer of this.nears) {
                this.overlayMask?.fillStyle(0xffffff, 1);
                this.overlayMask?.fillCircle(
                    otherPlayer.getPosition().x,
                    otherPlayer.getPosition().y,
                    50
                );
            }

            const mask = this.overlayMask?.createGeometryMask();
            if (mask) {
                mask.invertAlpha = true;
                this.overlay?.setMask(mask);
            }
            this.#showChatInput();
        } else {
            this.#hideChatInput();
        }

        // update lasttimestamp so throttle actually works
        const now = Date.now();
        if (this.player && this.socket && now - this.player.lasttimestamp >= 100) {
            this.player.lasttimestamp = now;
            this.socket?.sendMove(
                this.player.getPosition().x,
                this.player.getPosition().y,
                this.player.getAnimation() || '',
                now
            );
        }
    }
    

    __handlingEnter = new Set<string>()

    #handleEnter(playerId: string, position?: { x: number, y: number }) {
        if (!this.isSceneAlive) return;

        if (this.__handlingEnter.has(playerId)) return;
        this.__handlingEnter.add(playerId);

        getPlayerData(playerId)
            .then((playerData) => {
                if (!this.isSceneAlive) return;

                this.addOtherPlayer({
                    ...playerData,
                    position: position || playerData.checkpoint
                });
            })
            .catch((error) => {
                console.error(`Failed to fetch player data for ${playerId}:`, error);
            })
            .finally(() => {
                this.__handlingEnter.delete(playerId);
            });
    }

    #handleLeave(playerId: string) {
        if (!this.isSceneAlive) return;

        if (this.otherPlayers.has(playerId)) {
            this.otherPlayers.get(playerId)!.destroy();
            this.otherPlayers.delete(playerId);
            this.moveBuffer.delete(playerId); // ← clean up buffer
        }
    }

    #handleMove(playerId: string, x: number, y: number, animation: string, timestamp: number) {
        if (!this.isSceneAlive) return;

        if (!this.otherPlayers.has(playerId)) {
            console.warn(`Received move for unknown player ${playerId}`);
            this.#handleEnter(playerId, { x, y }); // ← try to fetch and add them
            return;
        }

        const receivedAt = Date.now(); // ← when WE received it, not when they sent it
        const existing = this.moveBuffer.get(playerId);

        this.moveBuffer.set(playerId, {
            prev: existing?.next ?? { x, y, animation, timestamp: receivedAt },
            next: { x, y, animation, timestamp: receivedAt } // ← use local time
        });
    }

    #handleTalk(playerId: string, message: string) {
        if (!this.isSceneAlive) return;

        if (this.otherPlayers.has(playerId)) {
            this.otherPlayers.get(playerId)!.showChatMessage(message);
        }
    }

    #showChatInput() {
        if (this.chatInput?.visible) return;
        this.chatInput?.setVisible(true);
    }

    #hideChatInput() {
        if (!this.chatInput?.visible) return;
        this.chatInput?.setVisible(false);
    }

    addOtherPlayer(playerData: any) {
        if (!this.isSceneAlive) return;

        if (this.otherPlayers.has(playerData.id)) {
            console.warn(`Player ${playerData.id} already exists. Updating data.`);
            this.otherPlayers.get(playerData.id)?.destroy();
            this.otherPlayers.delete(playerData.id);
        }
        this.otherPlayers.set(playerData.id, new OtherPlayer(this, playerData));
    }

    #handleMessage(msg: string) {
        this.socket?.sendTalk(Array.from(this.nears).map(plr => plr.getPlayerData().id), msg);
        this.player?.showChatMessage(msg);
    }

    #adjustUIElements() {
        const origin = {
            x: this.cameras.main.centerX - 0.25 * this.scale.width,
            y: this.cameras.main.centerY - 0.25 * this.scale.height
        }

        const unit = {
            x: 0.01 * this.scale.width / 2,
            y: 0.01 * this.scale.height / 2
        }

        const getPosition = (x: number, y: number) => {
            return {
                x: origin.x + x * unit.x,
                y: origin.y + y * unit.y
            };
        }

        const chatInputPosition = getPosition(50, 80);
        this.chatInput?.setPosition(chatInputPosition.x, chatInputPosition.y);

        const { x: baseX, y: baseY } = getPosition(15, 50);
        const size = 10;
        const margin = 16;

        this.leftButton?.setPosition(baseX - size - margin, baseY);
        this.rightButton?.setPosition(baseX + size + margin, baseY);
        this.upButton?.setPosition(baseX, baseY - size - margin);
        this.downButton?.setPosition(baseX, baseY + size + margin);

        [this.leftButton, this.rightButton, this.upButton, this.downButton].forEach(btn => {
            btn?.setOrigin(0.5);
            btn?.setScrollFactor(0);
            btn?.setDepth(1000);
        });
    }

    private INTERP_DURATION = 120; // ms

    #tickInterpolation() {
        if (!this.isSceneAlive) return;

        const now = Date.now();
        for (const [playerId, { prev, next }] of this.moveBuffer) {
            const player = this.otherPlayers.get(playerId);
            if (!player) continue;

            // Interpolate over a fixed window from when next arrived
            const t = Math.min((now - next.timestamp) / this.INTERP_DURATION, 1);

            const x = prev.x + (next.x - prev.x) * t;
            const y = prev.y + (next.y - prev.y) * t;

            player.update(next.animation, x, y, now);
        }
    }

    #handleShutdown() {
        this.isSceneAlive = false;

        if (this.socket) {
            this.socket.onEnter = () => {};
            this.socket.onLeave = () => {};
            this.socket.onMove = () => {};
            this.socket.onTalk = () => {};

            this.socket.close();
        }

        for (const otherPlayer of this.otherPlayers.values()) {
            otherPlayer.destroy();
        }

        this.otherPlayers.clear();
        this.moveBuffer.clear();
        this.nears.clear();
        this.player?.destroy();
        this.player = null;
    }
}

