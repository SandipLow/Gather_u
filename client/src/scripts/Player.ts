import Phaser from 'phaser';
import { animationFrames } from "./assets";

abstract class BasePlayer extends Phaser.GameObjects.GameObject {
    public scene: Phaser.Scene;
    protected playerData: PlayerData;
    protected position: { x: number; y: number };
    protected animationPrefix: string;
    protected chatBubble?: Phaser.GameObjects.Text;
    public lasttimestamp: number = 0;

    constructor(scene: Phaser.Scene, playerData: PlayerData) {
        super(scene, 'Player');
        this.scene = scene;
        this.playerData = playerData;
        this.position = playerData.checkpoint;
        this.animationPrefix = playerData.id + '-';

        this.createAnimations();
        this.createChatBubble();
    }

    private createAnimations() {
        const [sheet, variant] = this.playerData.spritesheet.split('_');
        const frames = animationFrames[parseInt(variant ?? '0')];

        for (const key in frames) {
            if (this.scene.anims.exists(this.animationPrefix + key)) continue;

            this.scene.anims.create({
                key: this.animationPrefix + key,
                frames: this.scene.anims.generateFrameNumbers(sheet, frames[key]),
                frameRate: 10,
                repeat: -1,
            });
        }
    }

    private createChatBubble() {
        this.chatBubble = this.scene.add.text(0, 0, '', {
            fontSize: '12px',
            color: '#fff',
            backgroundColor: '#000',
            padding: { x: 5, y: 2 },
            align: 'center',
        })

        this.chatBubble.setOrigin(0.5);
        this.chatBubble.setDepth(1000);
        this.chatBubble.setVisible(false);
    }

    update(animation?: string | null, x?: number, y?: number, timestamp?: number) {
        // allow subclasses to pass optional networked position/animation params
        this.chatBubble?.setPosition(this.position.x, this.position.y - 20);
    }

    showChatMessage(message: string) {
        this.chatBubble?.setText(message);
        this.chatBubble?.setVisible(true);

        this.scene.time.delayedCall(3000, () => this.chatBubble?.setVisible(false));
    }

    getPosition() { return this.position; }
    getPlayerData() { return this.playerData; }

    abstract getSprite(): Phaser.Physics.Arcade.Sprite | undefined;
}


export class Player extends BasePlayer {
    private sprite: Phaser.Physics.Arcade.Sprite;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    private direction:string = 'down';
    private animation: string | null = null;

    constructor(
        scene: Phaser.Scene,
        playerData: PlayerData,
        cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
    ) {
        super(scene, playerData);
        this.cursors = cursors;

        this.sprite = scene.physics.add.sprite(
            playerData.checkpoint.x,
            playerData.checkpoint.y,
            playerData.spritesheet.split('_')[0],
        );
        this.sprite.body?.setSize(10, 16);
        this.sprite.body?.setOffset(3, 0);

        scene.add.existing(this);
    }

    update() {
        super.update();
        this.sprite.setVelocity(0);

        if (this.cursors) {
            if (this.cursors.left.isDown) {
                this.sprite.setVelocityX(-100);
                this.#playAnim('walk-left');
                this.direction = 'left';
            } else if (this.cursors.right.isDown) {
                this.sprite.setVelocityX(100);
                this.#playAnim('walk-right');
                this.direction = 'right';
            } else if (this.cursors.up.isDown) {
                this.sprite.setVelocityY(-100);
                this.#playAnim('walk-up');
                this.direction = 'up';
            } else if (this.cursors.down.isDown) {
                this.sprite.setVelocityY(100);
                this.#playAnim('walk-down');
                this.direction = 'down';
            } else {
                this.#playAnim('idle-' + this.direction);
            }
        }

        this.position = { x: this.sprite.x, y: this.sprite.y };
    }

    #playAnim(key: string) {
        this.sprite.anims.play(this.animationPrefix + key, true);
        this.animation = key;
    }

    getSprite()     { return this.sprite; }
    getAnimation()  { return this.animation; }

    destroy() {
        this.sprite.destroy();
        super.destroy();
    }
}


export class OtherPlayer extends BasePlayer {
    private sprite?: Phaser.Physics.Arcade.Sprite;

    constructor(scene: Phaser.Scene, playerData: PlayerData) {
        super(scene, playerData);
        this.#load();
        scene.add.existing(this);
    }

    update(animation: string | null, x: number, y: number, timestamp: number) {
        super.update();

        if (timestamp < this.lasttimestamp) return;
        this.lasttimestamp = timestamp;
        this.position = { x, y };

        if (!this.sprite) return;

        this.sprite.x = x;
        this.sprite.y = y;

        if (animation) {
            this.sprite.anims.play(this.animationPrefix + animation, true);
        } else {
            this.sprite.anims.stop();
        }
    }

    checkProximity(player: Player): boolean {
        const distance = Phaser.Math.Distance.Between(
            this.position.x, this.position.y,
            player.getSprite().x, player.getSprite().y,
        );

        if (distance < 240) {
            this.#load();
        } else {
            this.#unload();
        }

        return distance < 40;
    }

    getSprite() { return this.sprite; }

    destroy() {
        this.#unload();
        super.destroy();
    }

    #load() {
        if (this.sprite) return;
        this.sprite = this.scene.physics.add.sprite(
            this.position.x,
            this.position.y,
            this.playerData.spritesheet.split('_')[0],
        );
    }

    #unload() {
        if (!this.sprite) return;
        this.sprite.destroy();
        this.sprite = undefined;
    }
}