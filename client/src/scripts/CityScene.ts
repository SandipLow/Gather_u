import Phaser from 'phaser';
import { OtherPlayer, Player } from './Player';
import { sprites } from './assets';
import { connectToWebSocket } from '../lib/websocket';

export default class CityScene extends Phaser.Scene {
    private player: Player | null = null;
    private otherPlayers: { [key: string]: OtherPlayer } = {};
    private map: Phaser.Tilemaps.Tilemap | null = null;
    private socket: WebSocket | null = null;
    private playerData!: PlayerData;
    private overlay!: Phaser.GameObjects.Graphics;
    private overlayMask!: Phaser.GameObjects.Graphics;
    private nears: Set<OtherPlayer> = new Set();

    constructor() {
        super('CityScene');
    }

    init(playerData: PlayerData) {
        this.playerData = playerData;
    }

    preload() {
        // Preload tilemap and tileset
        this.load.image('tiles', 'assets/city/tileset.png');
        this.load.tilemapTiledJSON('city_map', 'assets/city/map.json');

        // Preload all character sprites
        for (const sprite in sprites) {
            this.load.spritesheet(sprite, sprites[sprite].path, { frameWidth: 16, frameHeight: 16 });
        }
    }

    create() {
        // Load the tilemap
        this.map = this.make.tilemap({ key: 'city_map', tileWidth: 16, tileHeight: 16 });
        const tileset = this.map.addTilesetImage('tileset', 'tiles');

        if (!tileset) {
            console.error("Failed to load tileset");
            return;
        }

        const base_layer = this.map.createLayer('base_layer', tileset, 0, 0);
        const grass_flowers = this.map.createLayer('grass_flowers', tileset, 0, 0);
        const houses = this.map.createLayer('houses', tileset, 0, 0);
        const trees = this.map.createLayer('trees', tileset, 0, 0);

        if (!base_layer || !grass_flowers || !houses || !trees) {
            console.error("Failed to create layer");
            return;
        }

        houses.setCollisionByProperty({ collides: true });
        trees.setCollisionByProperty({ collides: true });


        // Connect to the server
        this.socket = connectToWebSocket();

        this.socket.onopen = () => {
            console.log('Connected to server');

            if (this.socket && this.playerData) {
                this.socket.send(JSON.stringify({ type: 'enter_world', payload: { player_id: this.playerData.id } }));
            }

        }

        this.socket.onmessage = (event) => {
            const { type, payload } = JSON.parse(event.data.toString());

            // Listen for player enter world events
            if (type === 'enter_world') {
                const { player } = payload;
                this.addOtherPlayer(player);
            }

            // Listen for player movement events
            else if (type === 'move') {
                const { player_id, data: { x, y, animation, timestamp } } = payload;
                if (this.otherPlayers[player_id]) {
                    this.otherPlayers[player_id].update(animation, x, y, timestamp);
                }
            }

            // Listen for player leave world events
            else if (type === 'leave_world') {
                const { player_id } = payload;
                if (this.otherPlayers[player_id]) {
                    this.otherPlayers[player_id].destroy();
                    delete this.otherPlayers[player_id];
                }
            }

            else if (type === 'talk') {
                const { from, message } = payload;
                if (this.otherPlayers[from]) {
                    this.otherPlayers[from].showChatMessage(message);
                }
            }
        }

        // Create player
        this.player = new Player(this, this.playerData, this.handleMessage.bind(this));

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
        this.overlay.setDepth(1000);  // Ensure it's above everything
        this.overlay.setScrollFactor(0);  // Lock to screen

        this.overlayMask = this.add.graphics();
        this.overlayMask.setVisible(false);

    }

    update() {
        // Clear overlay and overlay mask each frame
        this.overlay.clear();
        this.overlay.clearMask();
        this.overlayMask.clear();

        if (this.player) {
            this.player.update(this.socket);

            for (const playerId in this.otherPlayers) {
                const otherPlayer = this.otherPlayers[playerId];
                const isNear = otherPlayer.checkProximity(this.player);

                if (isNear) {
                    this.nears.add(otherPlayer);
                }
                else {
                    this.nears.delete(otherPlayer);
                }
            }
        }

        if (this.nears.size > 0) {
            this.overlay.fillStyle(0x000000, 0.7);
            this.overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

            for (const otherPlayer of this.nears) {
                this.overlayMask.fillStyle(0xffffff, 1);
                this.overlayMask.fillCircle(
                    otherPlayer.position.x,
                    otherPlayer.position.y,
                    50
                );
            }

            const mask = this.overlayMask.createGeometryMask();
            mask.invertAlpha = true;
            this.overlay.setMask(mask);

            this.player?.renderChatInput();
        }

        else {
            this.player?.hideChatInput();
        }

    }

    addOtherPlayer(playerData: any) {
        this.otherPlayers[playerData.id] = new OtherPlayer(this, playerData);
    }

    handleMessage(msg: string) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'talk',
                payload: { from: this.playerData.id, players: Array.from(this.nears).map(plr=> plr.getPlayerData().id), message: msg }
            }));
        }
    }
}

