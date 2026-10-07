import Phaser from 'phaser'

export interface CarPhysicsParams {
    maxSpeed: number
    reverseSpeed: number
    acceleration: number
    braking: number
    friction: number
    steeringSpeed: number
}

const params: Record<string, CarPhysicsParams> = {
    SUV: {
        maxSpeed: 150,
        reverseSpeed: 60,
        acceleration: 180,
        braking: 250,
        friction: 100,
        steeringSpeed: 120,
    },
    Sedan: {
        maxSpeed: 175,
        reverseSpeed: 65,
        acceleration: 210,
        braking: 280,
        friction: 95,
        steeringSpeed: 135,
    },
    Musclecar: {
        maxSpeed: 210,
        reverseSpeed: 75,
        acceleration: 270,
        braking: 290,
        friction: 80,
        steeringSpeed: 125,
    },
    Sport: {
        maxSpeed: 240,
        reverseSpeed: 85,
        acceleration: 320,
        braking: 360,
        friction: 90,
        steeringSpeed: 155,
    },
    Super: {
        maxSpeed: 290,
        reverseSpeed: 95,
        acceleration: 400,
        braking: 440,
        friction: 85,
        steeringSpeed: 175,
    },
}

export default class Car extends Phaser.GameObjects.GameObject {
    public static readonly TOTAL_ANGLES = 48
    public static readonly ANGLE_STEP = 360 / 48 // 7.5 degrees

    public id: string
    public scene: Phaser.Scene
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null
    private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null
    public spriteKey: string

    private rawAngle: number
    public angle: number
    public x: number
    public y: number

    private sprite?: Phaser.Physics.Arcade.Sprite

    public isDriving: string | null = null

    // Physics
    private speed: number = 0
    private maxSpeed: number
    private reverseSpeed: number
    private acceleration: number
    private braking: number
    private friction: number

    // Steering
    private steeringSpeed: number

    constructor(
        id: string,
        scene: Phaser.Scene,
        cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
        spriteKey: string,
        x: number = 200,
        y: number = 200,
        direction: string | number = 'down'
    ) {
        super(scene, 'Car')

        this.id = id
        this.scene = scene
        this.cursors = cursors ?? (scene.input.keyboard ? scene.input.keyboard.createCursorKeys() : null)
        this.spriteKey = spriteKey

        if (scene.input.keyboard) {
            this.wasd = scene.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D,
            }) as any
        }

        const carType = spriteKey.split('.')[0]
        const p = params[carType] ?? params.SUV

        this.maxSpeed = p.maxSpeed
        this.reverseSpeed = p.reverseSpeed
        this.acceleration = p.acceleration
        this.braking = p.braking
        this.friction = p.friction
        this.steeringSpeed = p.steeringSpeed

        this.x = x
        this.y = y

        const initialAngle =
            typeof direction === "number" ? direction :
            direction === "up" ? 0 :
            direction === "down" ? 180 :
            direction === "left" ? 270 :
            90

        this.rawAngle = initialAngle
        this.angle = Car.snapAngle(initialAngle)

        this.#draw()
        scene.add.existing(this)
    }

    /**
     * Snap any angle in degrees to one of the 48 discrete angle values between 0 and 360 (multiples of 7.5°)
     */
    public static snapAngle(angle: number): number {
        const step = Car.ANGLE_STEP
        const index = Math.round(Phaser.Math.Wrap(angle, 0, 360) / step) % Car.TOTAL_ANGLES
        return index * step
    }

    /**
     * Maps the 48 snapped angle values (0..360°) to the 48 spritesheet frames (0..47)
     * [90°]  -> Frame 0  (Right)
     * [180°] -> Frame 12 (Down)
     * [270°] -> Frame 24 (Left)
     * [0°]   -> Frame 36 (Up)
     */
    #getFrameForAngle(angle: number): number {
        const step = Car.ANGLE_STEP
        const normAngle = Phaser.Math.Wrap(angle - 90, 0, 360)
        const frame = Math.round(normAngle / step) % Car.TOTAL_ANGLES
        return frame
    }

    #draw() {
        const frame = this.#getFrameForAngle(this.angle)
        this.sprite = this.scene.physics.add.sprite(
            this.x,
            this.y,
            this.spriteKey,
            frame
        )
        this.sprite.setDisplaySize(64, 64)
        this.sprite.setOrigin(0.5, 0.5)
        this.sprite.setDepth(2)
        this.sprite.setCollideWorldBounds(true)

        // Ground friction & collision damping
        this.sprite.setDamping(false)
        this.sprite.setDrag(800, 800)
        this.sprite.setBounce(0)
        this.sprite.setImmovable(true)

        // Center collision box
        this.sprite.body?.setSize(48, 48, true)
    }

    public getSprite(): Phaser.Physics.Arcade.Sprite | undefined {
        return this.sprite
    }

    public getSpeed(): number {
        return this.speed
    }

    public setDriving(driverId: string | null) {
        this.isDriving = driverId
        if (this.sprite) {
            this.sprite.setImmovable(!driverId)
            if (!driverId) {
                this.sprite.setVelocity(0, 0)
                this.speed = 0
            }
        }
    }

    public setPositionAndAngle(x: number, y: number, angle: number) {
        this.x = x
        this.y = y
        this.rawAngle = angle
        this.angle = Car.snapAngle(angle)
        if (this.sprite) {
            this.sprite.setPosition(x, y)
            this.sprite.setFrame(this.#getFrameForAngle(this.angle))
        }
    }

    checkProximity(x: number, y: number) {
        const dist = Math.sqrt(
            Math.pow(x - this.x, 2) +
            Math.pow(y - this.y, 2)
        )

        return dist <= 60
    }

    public setCursors(cursors: Phaser.Types.Input.Keyboard.CursorKeys | null) {
        this.cursors = cursors
    }

    override update(time: number, delta: number) {
        if (!this.isDriving) {
            if (this.sprite) {
                this.sprite.setVelocity(0, 0)
                this.x = this.sprite.x
                this.y = this.sprite.y
                this.sprite.setImmovable(true)
            }
            this.speed = 0
            return
        }

        // delta is in milliseconds
        const dt = delta / 1000

        const forward = (this.cursors?.up.isDown || this.wasd?.W.isDown) ?? false
        const backward = (this.cursors?.down.isDown || this.wasd?.S.isDown) ?? false
        const left = (this.cursors?.left.isDown || this.wasd?.A.isDown) ?? false
        const right = (this.cursors?.right.isDown || this.wasd?.D.isDown) ?? false

        // --------------------------------
        // ACCELERATION / BRAKING
        // --------------------------------

        if (forward) {
            this.speed += this.acceleration * dt
        } else if (backward) {
            this.speed -= this.braking * dt
        } else {
            // Natural friction
            if (this.speed > 0) {
                this.speed -= this.friction * dt
                this.speed = Math.max(0, this.speed)
            } else if (this.speed < 0) {
                this.speed += this.friction * dt
                this.speed = Math.min(0, this.speed)
            }
        }

        // Clamp speed
        this.speed = Phaser.Math.Clamp(
            this.speed,
            -this.reverseSpeed,
            this.maxSpeed
        )

        // --------------------------------
        // STEERING
        // --------------------------------

        // Steering speed scales with velocity: 0 at v=0, increasing and clamped at this.steeringSpeed
        const absSpeed = Math.abs(this.speed)
        if (absSpeed > 0) {
            const direction = this.speed >= 0 ? 1 : -1
            const maxRefSpeed = this.speed >= 0 ? this.maxSpeed * 0.5 : this.reverseSpeed
            const speedRatio = Phaser.Math.Clamp(absSpeed / maxRefSpeed, 0, 1)
            const currentSteeringSpeed = speedRatio * this.steeringSpeed

            if (left) {
                this.rawAngle -= currentSteeringSpeed * dt * direction
            }

            if (right) {
                this.rawAngle += currentSteeringSpeed * dt * direction
            }
        }

        // Keep raw angle within [0, 360) and snap angle to 48 discrete steps
        this.rawAngle = Phaser.Math.Wrap(this.rawAngle, 0, 360)
        this.angle = Car.snapAngle(this.rawAngle)

        // --------------------------------
        // MOVE CAR VIA ARCADE PHYSICS
        // --------------------------------

        // Phaser angle 0 = up
        const radians = Phaser.Math.DegToRad(this.angle)
        const vx = Math.sin(radians) * this.speed
        const vy = -Math.cos(radians) * this.speed

        if (this.sprite) {
            this.sprite.setVelocity(vx, vy)
            this.x = this.sprite.x
            this.y = this.sprite.y

            // Dampen speed if colliding with an obstacle
            if (this.sprite.body) {
                const body = this.sprite.body
                if (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) {
                    this.speed *= 0.5
                }
            }

            this.sprite.setFrame(this.#getFrameForAngle(this.angle))
        }
    }

    override destroy(fromScene?: boolean) {
        this.sprite?.destroy()

        super.destroy(fromScene)
    }
}
