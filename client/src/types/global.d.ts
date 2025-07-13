declare global {
    interface PlayerData {
        id: string;
        name: string;
        wealth: number;
        checkpoint: { x: number, y: number };
        spritesheet: string;
    }
}

export {};