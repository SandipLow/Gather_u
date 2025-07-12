import { sprites } from "./assets";

interface PlayerData {
    id: string;
    name: string;
    wealth: number;
    checkpoint: { x: number, y: number };
    spritesheet: string;
}

export class Player extends Phaser.GameObjects.GameObject {
    private sprite: Phaser.Physics.Arcade.Sprite;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    public scene: Phaser.Scene;
    private playerData: PlayerData;
    private animationPrefix: string;

    constructor(scene: Phaser.Scene, playerData: PlayerData) {
        super(scene, 'Player');

        // Store the scene and player data
        this.scene = scene;
        this.playerData = playerData;
        this.animationPrefix = this.playerData.id + '-';

        // Create a sprite for the player with the chosen texture
        this.sprite = scene.physics.add.sprite(playerData.checkpoint.x, playerData.checkpoint.y, playerData.spritesheet);
        this.sprite.body?.setSize(10, 16)
        this.sprite.body?.setOffset(3, 0)

        // Define animations
        this.createAnimations();

        // Setup keyboard input
        this.cursors = scene.input.keyboard ? scene.input.keyboard.createCursorKeys() : null;

        // Add player sprite to the scene
        scene.add.existing(this);
    }

    // Dynamically create animations for the chosen sprite
    createAnimations() {
        const selectedSpriteSheet = sprites[this.playerData.spritesheet];

        // Use player ID as a prefix for animation keys to avoid conflicts
        for (const key in selectedSpriteSheet.animation_frames) {
            this.scene.anims.create({
                key: this.animationPrefix + key,  // Add prefix to animation key
                frames: this.scene.anims.generateFrameNumbers(this.playerData.spritesheet, selectedSpriteSheet.animation_frames[key]),
                frameRate: 10,
                repeat: -1
            });
        }
    }

    // Update method for movement and animations
    update(socket: WebSocket | null) {

        if (!this.cursors) return;

        this.sprite.setVelocity(0);
        let animation = null;

        if (this.cursors.left.isDown) {
            this.sprite.setVelocityX(-100);
            this.sprite.anims.play(this.animationPrefix + 'walk-left', true);
            animation = 'walk-left';
        }
        else if (this.cursors.right.isDown) {
            this.sprite.setVelocityX(100);
            this.sprite.anims.play(this.animationPrefix + 'walk-right', true);
            animation = 'walk-right';
        }
        else if (this.cursors.up.isDown) {
            this.sprite.setVelocityY(-100);
            this.sprite.anims.play(this.animationPrefix + 'walk-up', true);
            animation = 'walk-up';
        }
        else if (this.cursors.down.isDown) {
            this.sprite.setVelocityY(100);
            this.sprite.anims.play(this.animationPrefix + 'walk-down', true);
            animation = 'walk-down';
        }
        else {
            this.sprite.anims.stop();
        }

        // Send the new position to the server
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'move',
                payload: {
                    player_id: this.playerData.id,
                    data: {
                        x: this.sprite.x,
                        y: this.sprite.y,
                        animation,
                        timestamp: Date.now()
                    }
                }
            }));
        }
    }

    getSprite() {
        return this.sprite;
    }

    destroy() {
        this.sprite.destroy();
        super.destroy();
    }
}

export class OtherPlayer extends Phaser.GameObjects.GameObject {
    private sprite?: Phaser.Physics.Arcade.Sprite;
    public scene: Phaser.Scene;
    private playerData: PlayerData;
    private animationPrefix: string;
    public lasttimestamp: number = 0;
    public position: Phaser.Math.Vector2;


    constructor(scene: Phaser.Scene, playerData: PlayerData) {
        super(scene, 'Player');

        // Store the scene
        this.scene = scene;

        // Store the player data
        this.playerData = playerData;

        // Create a unique prefix for animations based on player ID
        this.animationPrefix = this.playerData.id + '-';

        // Set the initial position based on the player's checkpoint
        this.position = new Phaser.Math.Vector2(playerData.checkpoint.x, playerData.checkpoint.y);

        // Define animations
        this.createAnimations();

        // Add player sprite to the scene
        scene.add.existing(this);
    }

    // Dynamically create animations for the chosen sprite
    createAnimations() {
        const selectedSpriteSheet = sprites[this.playerData.spritesheet];

        // Use player ID as a prefix for animation keys to avoid conflicts
        for (const key in selectedSpriteSheet.animation_frames) {
            this.scene.anims.create({
                key: this.animationPrefix + key,  // Add prefix to animation key
                frames: this.scene.anims.generateFrameNumbers(this.playerData.spritesheet, selectedSpriteSheet.animation_frames[key]),
                frameRate: 10,
                repeat: -1
            });
        }
    }

    update(animation: string | null, x: number, y: number, timestamp: number) {
        if (timestamp < this.lasttimestamp) return;

        this.lasttimestamp = timestamp;
        this.position.set(x, y);

        if (!this.sprite) return;

        this.sprite.x = x;
        this.sprite.y = y;

        if (animation) {
            this.sprite.anims.play(this.animationPrefix + animation, true);
        }
        else {
            this.sprite.anims.stop();
        }
    }

    checkProximity(player: Player) {
        const distance = Phaser.Math.Distance.Between(
            this.position.x,
            this.position.y,
            player.getSprite().x,
            player.getSprite().y
        );

        if (distance < 200) {
            // If within proximity, ensure the sprite is loaded
            this.#load();
        }
        else {
            // If too far, unload the sprite
            this.#unload();
        }

        return distance < 40;
    }

    getName() {
        return this.playerData.name;
    }

    #load() {
        if (this.sprite) return;

        this.sprite = this.scene.physics.add.sprite(
            this.position.x, 
            this.position.y, 
            this.playerData.spritesheet
        );
    }

    #unload() {
        if (!this.sprite) return;

        this.sprite.destroy();
        this.sprite = undefined;
    }
}
