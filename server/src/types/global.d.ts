declare global {
    // Environment variables
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            PORT?: string;
            JWT_SECRET: string;

            // Redis configuration
            REDDIT_URI: string;
            REDDIT_USERNAME: string;
            REDDIT_PASSWORD: string;

            // Firebase credentials
            FIREBASE_API_KEY: string;
            FIREBASE_AUTH_DOMAIN: string;
            FIREBASE_PROJECT_ID: string;
            FIREBASE_STORAGE_BUCKET: string;
            FIREBASE_MESSAGING_SENDER_ID: string;
            FIREBASE_APP_ID: string;
        }
    }

    type UserData = {
        id: string;
        name: string;
        email: string;
        password: string;
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