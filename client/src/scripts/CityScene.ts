import Phaser from 'phaser';
import { OtherPlayer, Player } from './Player';
import * as Assets from './assets';
import WebSocketClient from '../lib/websocket';
import { getPlayerData } from '../lib/api';
import type SFUClient from '../lib/sfu';
import Car from "./Car";

export default class CityScene extends Phaser.Scene {
    private player: Player | null = null;
    private moveBuffer = new Map<string, {
        prev: { x: number; y: number; animation: string; timestamp: number };
        next: { x: number; y: number; animation: string; timestamp: number };
    }>();
    private carMoveBuffer = new Map<string, {
        prev: { x: number; y: number; angle: number; timestamp: number };
        next: { x: number; y: number; angle: number; timestamp: number };
    }>();
    private otherPlayers = new Map<string, OtherPlayer>();
    private map: Phaser.Tilemaps.Tilemap | null = null;
    private socket: WebSocketClient | null = null;
    private playerData!: PlayerData;
    private sfu: SFUClient | null = null;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private overlayMask: Phaser.GameObjects.Graphics | null = null;
    private nears: Set<OtherPlayer> = new Set();
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
    private keyE: Phaser.Input.Keyboard.Key | null = null;
    private chatInput: Phaser.GameObjects.DOMElement | null = null;
    private leftButton: Phaser.GameObjects.TileSprite | null = null;
    private rightButton: Phaser.GameObjects.TileSprite | null = null;
    private upButton: Phaser.GameObjects.TileSprite | null = null;
    private downButton: Phaser.GameObjects.TileSprite | null = null;
    private eButton: Phaser.GameObjects.TileSprite | null = null;
    private activePointersByButton: Map<string, number> = new Map();
    private wasNearCar = false;
    private isSceneAlive = true;

    private housesLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private treesLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private cars: Map<string, Car> = new Map();
    private drivingCar: Car | null = null;
    private lastCarMoveTimestamp: number = 0;

    constructor() {
        super('CityScene');
    }

    init({playerData, socket, sfu}: { playerData: PlayerData; socket: WebSocketClient, sfu: SFUClient | null }) {
        this.playerData = playerData;
        this.socket = socket;
        this.sfu = sfu;
    }

    preload() {
        // Preload tilemap and extruded tileset to prevent texture bleeding
        this.load.image('tiles', 'assets/city/tileset_extruded.png');
        this.load.tilemapTiledJSON('city_map', 'assets/city/map.json');

        // Preload all character sprites
        for (const sprite in Assets.sprites) {
            this.load.spritesheet(sprite, Assets.sprites[sprite], { frameWidth: 16, frameHeight: 16 });
        }

        // preload button UI
        this.load.spritesheet('buttons_ui', 'assets/ui/Orange Button Icons.png', { frameWidth: 32, frameHeight: 32 });

        // preload cars sprites
        for (const [CAR_NAME, car] of Object.entries(Assets.cars)) {
            for (const [color, sprite] of Object.entries(car)) {
                this.load.spritesheet(`${CAR_NAME}.${color}`, sprite, { frameWidth: 100, frameHeight: 100 });
            }
        }
    }

    private isMobileDevice(): boolean {
        return (
            !this.sys.game.device.os.desktop ||
            this.sys.game.device.input.touch ||
            ('ontouchstart' in window) ||
            (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
            this.scale.width <= 800
        );
    }

    create() {
        this.isSceneAlive = true;

        // Ensure multi-touch pointers are available
        this.input.addPointer(2);

        this.textures.get("tiles").setFilter(Phaser.Textures.FilterMode.NEAREST);
        
        // Load the tilemap with extruded tileset (margin 1, spacing 2) to eliminate tile seam lines
        this.map = this.make.tilemap({ key: 'city_map' });
        const tileset = this.map.addTilesetImage('tileset', 'tiles', 16, 16, 1, 2);

        if (!tileset) {
            console.error("Failed to load tileset");
            return;
        }

        const base_layer = this.map.createLayer('base_layer', tileset, 0, 0);
        const grass_flowers = this.map.createLayer('grass_flowers', tileset, 0, 0);
        this.housesLayer = this.map.createLayer('houses', tileset, 0, 0);
        this.treesLayer = this.map.createLayer('trees_poles', tileset, 0, 0);

        if (!base_layer || !grass_flowers || !this.housesLayer || !this.treesLayer) {
            console.error("Failed to create layer");
            return;
        }

        // Expand cull padding to prevent tile tearing/flickering at screen edges
        base_layer.setCullPadding(6, 6);
        grass_flowers.setCullPadding(6, 6);
        this.housesLayer.setCullPadding(6, 6);
        this.treesLayer.setCullPadding(6, 6);

        this.housesLayer.setCollisionByProperty({ collides: true });
        this.treesLayer.setCollisionByProperty({ collides: true });

        // Create keyboard controls and local Player BEFORE binding socket events
        this.cursors = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
        this.keyE = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E) : null;
        this.player = new Player(this, this.playerData, this.cursors);

        // Set camera to follow player
        this.cameras.main.startFollow(this.player.getSprite(), true);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setZoom(2);

        // Setup collisions for Arcade Player
        this.physics.add.collider(this.player.getSprite(), this.housesLayer);
        this.physics.add.collider(this.player.getSprite(), this.treesLayer);
        this.player.getSprite().setCollideWorldBounds(true);
        this.physics.world.setBounds(0, 0, 1600, 1600);

        // Layer Depths
        base_layer.setDepth(0);
        grass_flowers.setDepth(1);
        this.player.getSprite().setDepth(2);
        this.housesLayer.setDepth(3);
        this.treesLayer.setDepth(4);

        // overlay
        this.overlay = this.add.graphics();
        this.overlay.setDepth(100);  // Ensure it's above everything
        this.overlay.setScrollFactor(0);  // Lock to screen
        this.overlay.setVisible(false);

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

        // UI buttons
        this.leftButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 105).setInteractive().setAlpha(0.75);
        this.rightButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 90).setInteractive().setAlpha(0.75);
        this.upButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 75).setInteractive().setAlpha(0.75);
        this.downButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 60).setInteractive().setAlpha(0.75);
        this.eButton = this.add.tileSprite(0, 0, 32, 32, 'buttons_ui', 0).setInteractive().setAlpha(0.85);

        [this.leftButton, this.rightButton, this.upButton, this.downButton, this.eButton].forEach(btn => {
            btn.setOrigin(0.5);
            btn.setScrollFactor(0);
            btn.setDepth(1000);
        });

        // Robust multi-touch binding for buttons
        this.#bindMultiTouchButton(this.leftButton, 'left', 107, 105, () => {
            if (this.cursors) this.cursors.left.isDown = true;
        }, () => {
            if (this.cursors) this.cursors.left.isDown = false;
        });

        this.#bindMultiTouchButton(this.rightButton, 'right', 92, 90, () => {
            if (this.cursors) this.cursors.right.isDown = true;
        }, () => {
            if (this.cursors) this.cursors.right.isDown = false;
        });

        this.#bindMultiTouchButton(this.upButton, 'up', 77, 75, () => {
            if (this.cursors) this.cursors.up.isDown = true;
        }, () => {
            if (this.cursors) this.cursors.up.isDown = false;
        });

        this.#bindMultiTouchButton(this.downButton, 'down', 62, 60, () => {
            if (this.cursors) this.cursors.down.isDown = true;
        }, () => {
            if (this.cursors) this.cursors.down.isDown = false;
        });

        if (this.eButton) {
            this.eButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                this.activePointersByButton.set('e', pointer.id);
                this.eButton?.setScale(0.9);
                this.#handleEPressed();
            });

            const releaseE = (pointer: Phaser.Input.Pointer) => {
                if (this.activePointersByButton.get('e') === pointer.id) {
                    this.activePointersByButton.delete('e');
                    this.eButton?.setScale(1.0);
                }
            };

            this.eButton.on('pointerup', releaseE);
            this.eButton.on('pointerout', releaseE);
        }

        // Global pointer up fallback to release any stuck touches
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            for (const [key, ptrId] of this.activePointersByButton.entries()) {
                if (ptrId === pointer.id) {
                    this.activePointersByButton.delete(key);
                    if (key === 'left') {
                        if (this.cursors) this.cursors.left.isDown = false;
                        this.leftButton?.setTexture('buttons_ui', 105);
                    } else if (key === 'right') {
                        if (this.cursors) this.cursors.right.isDown = false;
                        this.rightButton?.setTexture('buttons_ui', 90);
                    } else if (key === 'up') {
                        if (this.cursors) this.cursors.up.isDown = false;
                        this.upButton?.setTexture('buttons_ui', 75);
                    } else if (key === 'down') {
                        if (this.cursors) this.cursors.down.isDown = false;
                        this.downButton?.setTexture('buttons_ui', 60);
                    } else if (key === 'e') {
                        this.eButton?.setScale(1.0);
                    }
                }
            }
        });

        this.#adjustUIElements();

        this.scale.on('resize', () => {
            this.#adjustUIElements();
        });

        if (this.socket) {
            this.socket.onInit = this.#handleInit.bind(this);
            this.socket.onEnter = this.#handleEnter.bind(this);
            this.socket.onLeave = this.#handleLeave.bind(this);
            this.socket.onMove = this.#handleMove.bind(this);
            this.socket.onTalk = this.#handleTalk.bind(this);
            this.socket.onEnterCar = this.#handleEnterCar.bind(this);
            this.socket.onLeaveCar = this.#handleLeaveCar.bind(this);
            this.socket.onMoveCar = this.#handleMoveCar.bind(this);
            this.socket.onWsError = this.#handleWsError.bind(this);
        }

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.#handleShutdown, this);
        this.events.once(Phaser.Scenes.Events.DESTROY, this.#handleShutdown, this);
    }

    #bindMultiTouchButton(
        button: Phaser.GameObjects.TileSprite | null,
        key: string,
        activeFrame: number,
        inactiveFrame: number,
        onPress: () => void,
        onRelease: () => void
    ) {
        if (!button) return;

        button.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.activePointersByButton.set(key, pointer.id);
            button.setTexture('buttons_ui', activeFrame);
            onPress();
        });

        const handleRelease = (pointer: Phaser.Input.Pointer) => {
            if (this.activePointersByButton.get(key) === pointer.id) {
                this.activePointersByButton.delete(key);
                button.setTexture('buttons_ui', inactiveFrame);
                onRelease();
            }
        };

        button.on('pointerup', handleRelease);
        button.on('pointerout', handleRelease);
    }

    addCar(
        id: string,
        spriteKey: string,
        x: number = 200,
        y: number = 200,
        direction: string | number = 'down',
        driverId: string | null = null
    ): Car {
        if (this.cars.has(id)) {
            this.cars.get(id)?.destroy();
            this.cars.delete(id);
        }

        const car = new Car(id, this, this.cursors, spriteKey, x, y, direction);
        if (driverId) {
            car.setDriving(driverId);
        }
        this.cars.set(id, car);

        const carSprite = car.getSprite();
        if (carSprite) {
            if (this.housesLayer) this.physics.add.collider(carSprite, this.housesLayer);
            if (this.treesLayer) this.physics.add.collider(carSprite, this.treesLayer);
            if (this.player?.getSprite()) this.physics.add.collider(this.player.getSprite(), carSprite);

            // Colliders with other cars
            for (const [otherId, otherCar] of this.cars) {
                if (otherId === id) continue;
                const otherSprite = otherCar.getSprite();
                if (otherSprite) {
                    this.physics.add.collider(carSprite, otherSprite);
                }
            }

            // Colliders with other players
            for (const otherPlayer of this.otherPlayers.values()) {
                const otherSprite = otherPlayer.getSprite();
                if (otherSprite) {
                    this.physics.add.collider(otherSprite, carSprite);
                }
            }
        }

        return car;
    }

    #handleEPressed() {
        if (this.drivingCar) {
            // Player cannot get down until the vehicle has completely stopped (speed is 0)
            if (Math.abs(this.drivingCar.getSpeed()) <= 1) {
                // Exit car
                const car = this.drivingCar;
                const carId = car.id;
                car.setDriving(null);
                const exitX = car.x;
                const exitY = car.y;
                const exitAngle = car.angle;
                this.drivingCar = null;
                if (this.player) {
                    this.player.isDriving = false;
                    const pSprite = this.player.getSprite();
                    pSprite?.enableBody(true, exitX + 35, exitY, true, true);
                    if (pSprite) {
                        this.cameras.main.startFollow(pSprite, true);
                    }
                }
                this.socket?.sendMoveCar(carId, exitX, exitY, exitAngle);
                this.socket?.sendLeaveCar(carId);
                this.#adjustUIElements();
            }
        } else if (this.player && !this.player.isDriving) {
            // Check proximity to enter
            for (const car of this.cars.values()) {
                if (car.isDriving) continue; // Already driven by someone
                const isNear = car.checkProximity(this.player.getPosition().x, this.player.getPosition().y);
                if (isNear) {
                    this.#requestEnterCar(car);
                    break;
                }
            }
        }
    }

    update(time: number, delta: number) {
        if (!this.isSceneAlive) return;

        // Update driving car physics and follow player
        if (this.drivingCar) {
            this.drivingCar.update(time, delta);
            if (this.player) {
                this.player.getSprite()?.setPosition(this.drivingCar.x, this.drivingCar.y);
            }
        }

        // Toggle entering/exiting car with 'E' key
        const isEPressed = this.keyE ? Phaser.Input.Keyboard.JustDown(this.keyE) : false;
        if (isEPressed) {
            this.#handleEPressed();
        }

        if (this.player && !this.player.isDriving) {
            this.player.update();
        }

        // Check proximity to available car when walking to show/hide mobile 'E' button
        let isNearAvailableCar = false;
        if (this.player && !this.player.isDriving) {
            for (const car of this.cars.values()) {
                if (!car.isDriving && car.checkProximity(this.player.getPosition().x, this.player.getPosition().y)) {
                    isNearAvailableCar = true;
                    break;
                }
            }
        }

        if (isNearAvailableCar !== this.wasNearCar) {
            this.wasNearCar = isNearAvailableCar;
            this.#adjustUIElements();
        }

        // Clean up any stale nears (e.g. disconnected or replaced players)
        for (const nearPlayer of this.nears) {
            const id = nearPlayer.getPlayerData().id;
            const currentOther = this.otherPlayers.get(id);
            if (!currentOther || currentOther !== nearPlayer || currentOther.isDriving || this.player?.isDriving) {
                this.nears.delete(nearPlayer);
                this.sfu?.removeRemoteStream(id);
            }
        }

        // Always check proximity to other players for sprite rendering & voice chat
        const viewerX = this.drivingCar ? this.drivingCar.x : (this.player?.getPosition().x ?? 0);
        const viewerY = this.drivingCar ? this.drivingCar.y : (this.player?.getPosition().y ?? 0);

        for (const [playerId, otherPlayer] of this.otherPlayers) {
            const wasNear = this.nears.has(otherPlayer);
            const isClose = otherPlayer.checkProximity(viewerX, viewerY);
            const isNear = !otherPlayer.isDriving && !this.player?.isDriving && isClose;

            if (isNear === wasNear) continue;

            if (isNear) {
                this.nears.add(otherPlayer);
                this.sfu?.requestRemoteStream(playerId);
            } else {
                this.nears.delete(otherPlayer);
                this.sfu?.removeRemoteStream(playerId);
            }
        }

        // Interpolate other players and remote cars every frame
        this.#tickInterpolation();

        // Render voice chat proximity overlay
        if (this.nears.size > 0 && this.overlay && this.overlayMask) {
            this.overlay.clear();
            this.overlay.clearMask();
            this.overlayMask.clear();

            this.overlay.setVisible(true);
            this.overlay.fillStyle(0x000000, 0.7);
            this.overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

            for (const otherPlayer of this.nears) {
                this.overlayMask.fillStyle(0xffffff, 1);
                this.overlayMask.fillCircle(
                    otherPlayer.getPosition().x,
                    otherPlayer.getPosition().y,
                    50
                );
            }

            if (this.player) {
                this.overlayMask.fillStyle(0xffffff, 1);
                this.overlayMask.fillCircle(
                    this.player.getPosition().x,
                    this.player.getPosition().y,
                    50
                );
            }

            const mask = this.overlayMask.createGeometryMask();
            if (mask) {
                mask.invertAlpha = true;
                this.overlay.setMask(mask);
            }
            this.#showChatInput();
        } else {
            if (this.overlay) {
                this.overlay.clear();
                this.overlay.clearMask();
                this.overlay.setVisible(false);
            }
            if (this.overlayMask) {
                this.overlayMask.clear();
            }
            this.#hideChatInput();
        }

        // update lasttimestamp so throttle actually works
        const now = Date.now();
        if (this.player && this.socket && !this.player.isDriving && now - this.player.lasttimestamp >= 100) {
            this.player.lasttimestamp = now;
            this.socket?.sendMove(
                this.player.getPosition().x,
                this.player.getPosition().y,
                this.player.getAnimation() || '',
                now
            );
        }

        if (this.drivingCar && this.socket && now - this.lastCarMoveTimestamp >= 100) {
            this.lastCarMoveTimestamp = now;
            this.socket.sendMoveCar(
                this.drivingCar.id,
                this.drivingCar.x,
                this.drivingCar.y,
                this.drivingCar.angle
            );
        }
    }
    

    __handlingEnter = new Set<string>();

    #handleInit(data: { self?: any; players?: any[]; cars?: any[] }) {
        if (!this.isSceneAlive) return;

        const { self, players, cars } = data;

        if (self && this.player && self.position) {
            this.player.getSprite()?.setPosition(self.position.x, self.position.y);
            (this.player as any).position = { x: self.position.x, y: self.position.y };
        }

        // Initialize cars with actual data
        if (cars && Array.isArray(cars)) {
            for (const carData of cars) {
                const angle = carData.position?.angle ?? 180;
                const car = this.addCar(
                    carData.id,
                    carData.spriteKey,
                    carData.position?.x ?? 200,
                    carData.position?.y ?? 200,
                    angle,
                    carData.isDriving || null
                );

                if (carData.isDriving && carData.isDriving === this.playerData.id) {
                    this.drivingCar = car;
                    if (this.player) {
                        this.player.isDriving = true;
                        this.player.getSprite()?.disableBody(true, true);
                    }
                    if (car.getSprite()) {
                        this.cameras.main.startFollow(car.getSprite()!, true);
                    }
                    this.#adjustUIElements();
                }
            }
        }

        // Initialize other players with actual data
        if (players && Array.isArray(players)) {
            for (const p of players) {
                this.addOtherPlayer(p);
                if (p.isDriving) {
                    const otherPlayer = this.otherPlayers.get(p.id);
                    if (otherPlayer) {
                        otherPlayer.isDriving = true;
                        otherPlayer.getSprite()?.setVisible(false);
                    }
                }
            }
        }
    }

    #handleEnter(playerDataOrId: any, position?: { x: number, y: number }) {
        if (!this.isSceneAlive) return;

        if (typeof playerDataOrId === 'object' && playerDataOrId !== null) {
            const data = playerDataOrId.player || playerDataOrId;
            this.addOtherPlayer(data);
            return;
        }

        const playerId = playerDataOrId;
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

        for (const nearPlayer of this.nears) {
            if (nearPlayer.getPlayerData().id === playerId) {
                this.nears.delete(nearPlayer);
                this.sfu?.removeRemoteStream(playerId);
            }
        }

        const otherPlayer = this.otherPlayers.get(playerId);
        if (otherPlayer) {
            if (this.nears.has(otherPlayer)) {
                this.nears.delete(otherPlayer);
                this.sfu?.removeRemoteStream(playerId);
            }
            otherPlayer.destroy();
            this.otherPlayers.delete(playerId);
            this.moveBuffer.delete(playerId);
        }

        // If leaving player was driving a car, release the car
        for (const car of this.cars.values()) {
            if (car.isDriving === playerId) {
                car.setDriving(null);
                this.carMoveBuffer.delete(car.id);
            }
        }
    }

    #handleMove(playerId: string, x: number, y: number, animation: string, timestamp: number) {
        if (!this.isSceneAlive) return;

        if (!this.otherPlayers.has(playerId)) {
            console.warn(`Received move for unknown player ${playerId}`);
            this.#handleEnter(playerId, { x, y });
            return;
        }

        const receivedAt = Date.now();
        const existing = this.moveBuffer.get(playerId);

        this.moveBuffer.set(playerId, {
            prev: existing?.next ?? { x, y, animation, timestamp: receivedAt },
            next: { x, y, animation, timestamp: receivedAt }
        });
    }

    #handleTalk(playerId: string, message: string) {
        if (!this.isSceneAlive) return;

        if (this.otherPlayers.has(playerId)) {
            this.otherPlayers.get(playerId)!.showChatMessage(message);
        }
    }

    #pendingEnterCarId: string | null = null;
    #enterCarTimeout: NodeJS.Timeout | null = null;

    #requestEnterCar(car: Car) {
        if (this.#pendingEnterCarId) return;

        this.#pendingEnterCarId = car.id;
        this.socket?.sendEnterCar(car.id);

        // Client wait till confirmation for 2 seconds, if no response, then timeout and it gets respond success, then only car enter is called in client
        this.#enterCarTimeout = setTimeout(() => {
            if (this.#pendingEnterCarId === car.id) {
                console.log("Enter car confirmation timeout (2s) reached. Defaulting to success.");
                this.#finalizeEnterCar(car.id, this.playerData.id);
                this.#pendingEnterCarId = null;
                this.#enterCarTimeout = null;
            }
        }, 2000);
    }

    #finalizeEnterCar(carId: string, playerId: string) {
        if (!this.isSceneAlive) return;

        const car = this.cars.get(carId);
        if (car) {
            car.setDriving(playerId);
        }

        if (playerId === this.playerData.id) {
            if (car) {
                this.drivingCar = car;
                if (this.player) {
                    this.player.isDriving = true;
                    this.player.getSprite()?.disableBody(true, true);

                    for (const nearPlayer of this.nears) {
                        this.sfu?.removeRemoteStream(nearPlayer.getPlayerData().id);
                    }
                    this.nears.clear();
                }

                const carSprite = car.getSprite();
                if (carSprite) {
                    this.cameras.main.startFollow(carSprite, true);
                }
                this.#adjustUIElements();
            }
        } else {
            const otherPlayer = this.otherPlayers.get(playerId);
            if (otherPlayer) {
                otherPlayer.isDriving = true;
                otherPlayer.getSprite()?.setVisible(false);

                if (this.nears.has(otherPlayer)) {
                    this.nears.delete(otherPlayer);
                    this.sfu?.removeRemoteStream(playerId);
                }
            }
        }

        this.moveBuffer.delete(playerId);
    }

    #handleEnterCar(carId: string, playerId: string) {
        if (!this.isSceneAlive) return;

        if (playerId === this.playerData.id && this.#pendingEnterCarId === carId) {
            if (this.#enterCarTimeout) {
                clearTimeout(this.#enterCarTimeout);
                this.#enterCarTimeout = null;
            }
            this.#pendingEnterCarId = null;
        }

        this.#finalizeEnterCar(carId, playerId);
    }

    #handleWsError(message: string) {
        if (!this.isSceneAlive) return;
        if (this.#pendingEnterCarId) {
            console.warn("Enter car request failed:", message);
            if (this.#enterCarTimeout) {
                clearTimeout(this.#enterCarTimeout);
                this.#enterCarTimeout = null;
            }
            this.#pendingEnterCarId = null;
        }
    }

    #handleLeaveCar(carId: string) {
        if (!this.isSceneAlive) return;

        const car = this.cars.get(carId);
        if (car) {
            const driverId = car.isDriving;
            car.setDriving(null);

            if (driverId) {
                if (driverId === this.playerData.id) {
                    this.drivingCar = null;
                    if (this.player) {
                        this.player.isDriving = false;
                        const pSprite = this.player.getSprite();
                        pSprite?.enableBody(true, car.x + 35, car.y, true, true);
                        if (pSprite) {
                            this.cameras.main.startFollow(pSprite, true);
                        }
                    }
                    this.#adjustUIElements();
                } else {
                    const otherPlayer = this.otherPlayers.get(driverId);
                    if (otherPlayer) {
                        otherPlayer.isDriving = false;
                        const sprite = otherPlayer.getSprite();
                        if (sprite) {
                            sprite.setVisible(true);
                            sprite.setPosition(car.x + 35, car.y);
                        }
                    }
                }
            }
        }

        this.carMoveBuffer.delete(carId);
    }

    #handleMoveCar(playerId: string, carId: string, x: number, y: number, angle: number) {
        if (!this.isSceneAlive) return;

        if (!this.otherPlayers.has(playerId)) {
            console.warn(`Received move for unknown player ${playerId}`);
            this.#handleEnter(playerId, { x, y });
            return;
        }

        const car = this.cars.get(carId);
        if (!car || car === this.drivingCar) return;

        if (!car.isDriving) {
            this.#handleEnterCar(carId, playerId);
        }

        const receivedAt = Date.now();
        const existing = this.carMoveBuffer.get(carId);

        this.carMoveBuffer.set(carId, {
            prev: existing?.next ?? { x: car.x, y: car.y, angle: car.angle, timestamp: receivedAt },
            next: { x, y, angle, timestamp: receivedAt }
        });
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
            const existing = this.otherPlayers.get(playerData.id);
            if (existing && this.nears.has(existing)) {
                this.nears.delete(existing);
                this.sfu?.removeRemoteStream(playerData.id);
            }
            existing?.destroy();
            this.otherPlayers.delete(playerData.id);
        }
        const otherPlayer = new OtherPlayer(this, playerData);
        this.otherPlayers.set(playerData.id, otherPlayer);

        const otherSprite = otherPlayer.getSprite();
        if (otherSprite) {
            if (this.housesLayer) this.physics.add.collider(otherSprite, this.housesLayer);
            if (this.treesLayer) this.physics.add.collider(otherSprite, this.treesLayer);
            if (this.player?.getSprite()) this.physics.add.collider(this.player.getSprite(), otherSprite);

            for (const car of this.cars.values()) {
                const carSprite = car.getSprite();
                if (carSprite) {
                    this.physics.add.collider(otherSprite, carSprite);
                }
            }
        }
    }

    #handleMessage(msg: string) {
        this.socket?.sendTalk(Array.from(this.nears).map(plr => plr.getPlayerData().id), msg);
        this.player?.showChatMessage(msg);
    }

    #adjustUIElements() {
        const showMobile = this.isMobileDevice();

        if (!showMobile) {
            this.leftButton?.setVisible(false);
            this.rightButton?.setVisible(false);
            this.upButton?.setVisible(false);
            this.downButton?.setVisible(false);
            this.eButton?.setVisible(false);
            return;
        }

        const zoom = this.cameras.main.zoom || 1;
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const minX = centerX - (this.scale.width / (2 * zoom));
        const maxX = centerX + (this.scale.width / (2 * zoom));
        const minY = centerY - (this.scale.height / (2 * zoom));
        const maxY = centerY + (this.scale.height / (2 * zoom));

        const getPos = (pctX: number, pctY: number) => ({
            x: minX + (maxX - minX) * (pctX / 100),
            y: minY + (maxY - minY) * (pctY / 100)
        });

        const isDriving = !!this.drivingCar;

        if (isDriving) {
            // DRIVING LAYOUT:
            // Left Half: Left & Right keys side by side
            const leftKeyPos = getPos(14, 80);
            const rightKeyPos = getPos(28, 80);

            this.leftButton?.setPosition(leftKeyPos.x, leftKeyPos.y);
            this.rightButton?.setPosition(rightKeyPos.x, rightKeyPos.y);
            this.leftButton?.setVisible(true);
            this.rightButton?.setVisible(true);

            // Right Half: Up & Down keys, and E key above them
            const downPos = getPos(86, 82);
            const upPos = getPos(86, 58);
            const ePos = getPos(86, 34);

            this.downButton?.setPosition(downPos.x, downPos.y);
            this.upButton?.setPosition(upPos.x, upPos.y);
            this.eButton?.setPosition(ePos.x, ePos.y);

            this.downButton?.setVisible(true);
            this.upButton?.setVisible(true);
            this.eButton?.setVisible(true);
        } else {
            // WALKING LAYOUT:
            // D-Pad on bottom-left
            const center = getPos(18, 56);
            const offset = 26; // In game coordinates

            this.leftButton?.setPosition(center.x - offset, center.y);
            this.rightButton?.setPosition(center.x + offset, center.y);
            this.upButton?.setPosition(center.x, center.y - offset);
            this.downButton?.setPosition(center.x, center.y + offset);

            this.leftButton?.setVisible(true);
            this.rightButton?.setVisible(true);
            this.upButton?.setVisible(true);
            this.downButton?.setVisible(true);

            // E Button on bottom-right (only visible when in proximity to an available vehicle)
            const ePos = getPos(84, 76);
            this.eButton?.setPosition(ePos.x, ePos.y);
            this.eButton?.setVisible(this.wasNearCar);
        }

        // Chat input positioning (centered at bottom)
        const chatInputPos = getPos(50, 90);
        this.chatInput?.setPosition(chatInputPos.x, chatInputPos.y);
    }

    private INTERP_DURATION = 120; // ms

    #tickInterpolation() {
        if (!this.isSceneAlive) return;

        const now = Date.now();

        // Interpolate other players
        for (const [playerId, { prev, next }] of this.moveBuffer) {
            const player = this.otherPlayers.get(playerId);
            if (!player) continue;

            // Interpolate over a fixed window from when next arrived
            const t = Math.min((now - next.timestamp) / this.INTERP_DURATION, 1);

            const x = prev.x + (next.x - prev.x) * t;
            const y = prev.y + (next.y - prev.y) * t;

            player.update(next.animation, x, y, now);
        }

        // Interpolate remote cars
        for (const [carId, { prev, next }] of this.carMoveBuffer) {
            const car = this.cars.get(carId);
            if (!car || car === this.drivingCar) continue;

            const t = Math.min((now - next.timestamp) / this.INTERP_DURATION, 1);

            const x = prev.x + (next.x - prev.x) * t;
            const y = prev.y + (next.y - prev.y) * t;

            const angleDiff = Phaser.Math.Angle.ShortestBetween(prev.angle, next.angle);
            const angle = Phaser.Math.Wrap(prev.angle + angleDiff * t, 0, 360);

            car.setPositionAndAngle(x, y, angle);

            if (car.isDriving) {
                const otherPlayer = this.otherPlayers.get(car.isDriving);
                if (otherPlayer) {
                    otherPlayer.getSprite()?.setPosition(x, y);
                }
            }
        }
    }

    #handleShutdown() {
        this.isSceneAlive = false;

        if (this.socket) {
            this.socket.onInit = () => {};
            this.socket.onEnter = () => {};
            this.socket.onLeave = () => {};
            this.socket.onMove = () => {};
            this.socket.onTalk = () => {};
            this.socket.onEnterCar = () => {};
            this.socket.onLeaveCar = () => {};
            this.socket.onMoveCar = () => {};

            this.socket.close();
        }

        for (const otherPlayer of this.otherPlayers.values()) {
            otherPlayer.destroy();
        }

        for (const car of this.cars.values()) {
            car.destroy();
        }

        this.otherPlayers.clear();
        this.cars.clear();
        this.moveBuffer.clear();
        this.carMoveBuffer.clear();
        this.nears.clear();
        this.player?.destroy();
        this.player = null;
    }
}
