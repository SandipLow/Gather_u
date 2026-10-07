export default class Car {
    constructor(
        public id: string,
        public spriteKey: string,
        public position: { x: number, y: number, angle: number },
        public isDriving: string | null = null,
        public timestamp = Date.now(),
    ) {}
}