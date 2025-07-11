declare global {
    // Environment variables
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            PORT?: string;
            REDDIT_URI: string;
            REDDIT_USERNAME: string;
            REDDIT_PASSWORD: string;
        }
    }

    type UserData = {
        id: string;
        name: string;
        email: string;
    } 

    type WorldData = {
        id: string;
        name: string;
    }

    type PlayerData = {
        id: string;
        user_id: string;
        world_id: string;
        spritesheet: string;
        name: string;
        wealth: number;
        checkpoint: { x: number; y: number };
    }
}

export {};