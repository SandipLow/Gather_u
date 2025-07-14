import { sprites } from "./assets";

export class Player extends Phaser.GameObjects.GameObject {
    private sprite: Phaser.Physics.Arcade.Sprite;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
    public scene: Phaser.Scene;
    private playerData: PlayerData;
    private animation: string | null = null;
    private animationPrefix: string;

    constructor(scene: Phaser.Scene, playerData: PlayerData, cursors: Phaser.Types.Input.Keyboard.CursorKeys | null) {
        super(scene, 'Player');

        // Store the scene and player data and initialize cursors
        this.scene = scene;
        this.playerData = playerData;
        this.animationPrefix = this.playerData.id + '-';
        this.cursors = cursors;

        // Create a sprite for the player with the chosen texture
        this.sprite = scene.physics.add.sprite(playerData.checkpoint.x, playerData.checkpoint.y, playerData.spritesheet);
        this.sprite.body?.setSize(10, 16)
        this.sprite.body?.setOffset(3, 0)

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

    // Update method for movement and animations
    update(socket: WebSocket | null) {

        this.sprite.setVelocity(0);

        if (this.cursors) {
            if (this.cursors.left.isDown) {
                this.sprite.setVelocityX(-100);
                this.sprite.anims.play(this.animationPrefix + 'walk-left', true);
                this.animation = 'walk-left';
            }
            else if (this.cursors.right.isDown) {
                this.sprite.setVelocityX(100);
                this.sprite.anims.play(this.animationPrefix + 'walk-right', true);
                this.animation = 'walk-right';
            }
            else if (this.cursors.up.isDown) {
                this.sprite.setVelocityY(-100);
                this.sprite.anims.play(this.animationPrefix + 'walk-up', true);
                this.animation = 'walk-up';
            }
            else if (this.cursors.down.isDown) {
                this.sprite.setVelocityY(100);
                this.sprite.anims.play(this.animationPrefix + 'walk-down', true);
                this.animation = 'walk-down';
            }
            else {
                this.sprite.anims.stop();
                this.animation = null;
            }
        };


        // Send the new position to the server
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'move',
                payload: {
                    player_id: this.playerData.id,
                    data: {
                        x: this.sprite.x,
                        y: this.sprite.y,
                        animation: this.animation?? null,
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

        // load the player sprite
        this.#load();

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

        if (distance < 240) {
            // If within proximity, ensure the sprite is loaded
            this.#load();
        }
        else {
            // If too far, unload the sprite
            this.#unload();
        }

        return distance < 40;
    }

    getPlayerData() {
        return this.playerData;
    }

    showChatMessage(message: string) {
        if (!this.sprite) return;

        const chatBubble = this.scene.add.text(this.sprite.x, this.sprite.y - 20, message, {
            fontSize: '12px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 2 },
            align: 'center',
        });

        chatBubble.setOrigin(0.5);
        chatBubble.setDepth(1000)
        this.scene.time.delayedCall(3000, () => {
            chatBubble.destroy();
        });
    }

    destroy() {
        this.#unload();
        super.destroy();
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
