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
        this.position = (playerData as any).position ? { ...(playerData as any).position } : { ...playerData.checkpoint };
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
        });

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
    private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;
    private direction: string = 'down';
    private animation: string | null = null;
    isDriving = false

    constructor(
        scene: Phaser.Scene,
        playerData: PlayerData,
        cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
    ) {
        super(scene, playerData);
        this.cursors = cursors;

        if (scene.input.keyboard) {
            this.wasd = scene.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D
            }) as any;
        }

        const startPos = (playerData as any).position || playerData.checkpoint;
        this.sprite = scene.physics.add.sprite(
            startPos.x,
            startPos.y,
            playerData.spritesheet.split('_')[0],
        );
        this.sprite.body?.setSize(10, 16);
        this.sprite.body?.setOffset(3, 0);
        this.sprite.setDepth(2);

        scene.add.existing(this);
    }

    update() {
        super.update();
        this.sprite.setVelocity(0);

        const left = (this.cursors?.left.isDown || this.wasd?.A.isDown) ?? false;
        const right = (this.cursors?.right.isDown || this.wasd?.D.isDown) ?? false;
        const up = (this.cursors?.up.isDown || this.wasd?.W.isDown) ?? false;
        const down = (this.cursors?.down.isDown || this.wasd?.S.isDown) ?? false;

        if (!this.isDriving) {
            if (left) {
                this.sprite.setVelocityX(-100);
                this.#playAnim('walk-left');
                this.direction = 'left';
            } else if (right) {
                this.sprite.setVelocityX(100);
                this.#playAnim('walk-right');
                this.direction = 'right';
            } else if (up) {
                this.sprite.setVelocityY(-100);
                this.#playAnim('walk-up');
                this.direction = 'up';
            } else if (down) {
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
    public isDriving: boolean = false;

    constructor(scene: Phaser.Scene, playerData: any) {
        super(scene, playerData);
        if (playerData.position) {
            this.position = { x: playerData.position.x, y: playerData.position.y };
        }
        if (playerData.isDriving) {
            this.isDriving = true;
        }
        this.#load();
        if (playerData.animation && this.sprite && !this.isDriving) {
            this.sprite.anims?.play(this.animationPrefix + playerData.animation, true);
        }
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

        if (this.isDriving) {
            this.sprite.setVisible(false);
            this.sprite.anims?.stop();
            return;
        }

        this.sprite.setVisible(true);

        if (animation) {
            this.sprite.anims?.play(this.animationPrefix + animation, true);
        } else {
            this.sprite.anims?.stop();
        }
    }

    checkProximity(target: Player | { x: number; y: number } | number, targetY?: number): boolean {
        let tx = 0;
        let ty = 0;

        if (typeof target === 'number') {
            tx = target;
            ty = targetY ?? 0;
        } else if ('getSprite' in target) {
            const spr = (target as Player).getSprite();
            tx = spr ? spr.x : (target as Player).getPosition().x;
            ty = spr ? spr.y : (target as Player).getPosition().y;
        } else if ('x' in target && 'y' in target) {
            tx = target.x;
            ty = target.y;
        }

        const distance = Phaser.Math.Distance.Between(
            this.position.x, this.position.y,
            tx, ty,
        );

        if (distance < 500) {
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
        this.sprite.body?.setSize(10, 16);
        this.sprite.body?.setOffset(3, 0);
        this.sprite.setDepth(2);

        if (this.isDriving) {
            this.sprite.setVisible(false);
        }

        // Re-attach colliders for loaded sprite
        const cityScene = this.scene as any;
        if (cityScene.housesLayer) this.scene.physics.add.collider(this.sprite, cityScene.housesLayer);
        if (cityScene.treesLayer) this.scene.physics.add.collider(this.sprite, cityScene.treesLayer);
        if (cityScene.player?.getSprite()) this.scene.physics.add.collider(cityScene.player.getSprite(), this.sprite);
        if (cityScene.cars) {
            for (const car of cityScene.cars.values()) {
                const carSprite = car.getSprite();
                if (carSprite) this.scene.physics.add.collider(this.sprite, carSprite);
            }
        }
    }

    #unload() {
        if (!this.sprite) return;
        this.sprite.destroy();
        this.sprite = undefined;
    }
}
