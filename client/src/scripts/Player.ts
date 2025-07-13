import { sprites } from "./assets";

export class Player extends Phaser.GameObjects.GameObject {
    private sprite: Phaser.Physics.Arcade.Sprite;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    public scene: Phaser.Scene;
    private playerData: PlayerData;
    private animation: string | null = null;
    private animationPrefix: string;
    private chatInput: Phaser.GameObjects.DOMElement;

    constructor(scene: Phaser.Scene, playerData: PlayerData, handleSendMessage: (message: string) => void) {
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

        // chat input
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
            if (this.scene.game.input.keyboard) {
                this.scene.game.input.keyboard.enabled = false; // Disable Phaser's keyboard input
            }
        });

        // Listen for blur (when the input field loses focus)
        chatInput.addEventListener('blur', () => {
            if (this.scene.game.input.keyboard) {
                this.scene.game.input.keyboard.enabled = true; // Re-enable Phaser's keyboard input
            }
        });

        // Listen for Enter key to send the message
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                const message = chatInput.value.trim();
                if (message) {
                    handleSendMessage(message);
                    chatInput.value = '';
                    chatInput.blur();
                }
            }
        });

        this.chatInput = this.scene.add.dom(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY + 120, chatInput);
        this.chatInput.setOrigin(0.5);
        this.chatInput.setScrollFactor(0);
        this.chatInput.setVisible(false);

        // Make UI controls for mobile
        const size = 10;
        const margin = 10;
        const baseX = this.scene.cameras.main.centerX - this.scene.scale.width/4 + 0.25*this.scene.scale.width/4;
        const baseY = this.scene.cameras.main.centerY;
        const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: 'rgba(51, 51, 51, 0.6)',
            padding: { x: 6, y: 6 },
            align: 'center'
        };

        // Create buttons
        const leftButton = this.scene.add.text(baseX - size - margin, baseY, '◀', buttonStyle).setInteractive();
        const rightButton = this.scene.add.text(baseX + size + margin, baseY, '▶', buttonStyle).setInteractive();
        const upButton = this.scene.add.text(baseX, baseY - size - margin, '▲', buttonStyle).setInteractive();
        const downButton = this.scene.add.text(baseX, baseY + size + margin, '▼', buttonStyle).setInteractive();

        [leftButton, rightButton, upButton, downButton].forEach(btn => {
            btn.setOrigin(0.5);
            btn.setScrollFactor(0);
            btn.setDepth(1000);
        });

        // Touch/hold handling
        leftButton.on('pointerdown', () => this.cursors ? this.cursors.left.isDown = true : null);
        leftButton.on('pointerup', () => this.cursors ? this.cursors.left.isDown = false : null);
        leftButton.on('pointerout', () => this.cursors ? this.cursors.left.isDown = false : null);

        rightButton.on('pointerdown', () => this.cursors ? this.cursors.right.isDown = true : null);
        rightButton.on('pointerup', () => this.cursors ? this.cursors.right.isDown = false : null);
        rightButton.on('pointerout', () => this.cursors ? this.cursors.right.isDown = false : null);

        upButton.on('pointerdown', () => this.cursors ? this.cursors.up.isDown = true : null);
        upButton.on('pointerup', () => this.cursors ? this.cursors.up.isDown = false : null);
        upButton.on('pointerout', () => this.cursors ? this.cursors.up.isDown = false : null);

        downButton.on('pointerdown', () => this.cursors ? this.cursors.down.isDown = true : null);
        downButton.on('pointerup', () => this.cursors ? this.cursors.down.isDown = false : null);
        downButton.on('pointerout', () => this.cursors ? this.cursors.down.isDown = false : null);
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

    renderChatInput() {
        if (this.chatInput.visible) return;
        this.chatInput.setVisible(true);
    }

    hideChatInput() {
        if (!this.chatInput.visible) return;
        this.chatInput.setVisible(false);
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
