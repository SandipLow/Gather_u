const WORLDEVENT_CHANNEL = "world_event_channel";

import Redis from "ioredis";
import config from "./config";


export default class RedisPubSub {
    redisPub: Redis;
    redisSub: Redis;
    isReady = false;
    private readonly readyPromise: Promise<void>;
    private subscribed = false;

    constructor(
        serverid: string,
        handleError: (err: Error)=>void, 
        handleMessage: (channel: string, message: string)=>void
    ) {
        const redisUrl = config.redis.uri;
        const redisUsername = config.redis.username;
        const redisPassword = config.redis.password;

        const [host, portText] = redisUrl.split(':');
        const redisConfig = {
            host,
            port: parseInt(portText),
            ...(redisUsername ? { username: redisUsername } : {}),
            ...(redisPassword ? { password: redisPassword } : {}),
        };

        this.redisPub = new Redis(redisConfig);
        this.redisSub = new Redis(redisConfig);

        this.readyPromise = new Promise((resolve) => {
            this.redisSub.on("ready", async () => {
                try {
                    if (!this.subscribed) {
                        const count = await this.redisSub.subscribe(WORLDEVENT_CHANNEL);
                        this.subscribed = true;
                        console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
                        resolve();
                    }

                    this.isReady = true;
                } catch (err) {
                    this.isReady = false;
                    console.error("Failed to subscribe:", err);
                }
            });
        });

        this.redisSub.on("reconnecting", () => { this.isReady = false; });
        this.redisSub.on("close", () => { this.isReady = false; });
        this.redisSub.on("end", () => { this.isReady = false; });

        this.redisSub.on('message', handleMessage);


        this.redisPub.on('error', handleError);
        this.redisSub.on('error', handleError);
    }

    whenReady(): Promise<void> {
        return this.readyPromise;
    }

    sendMessage(data: any) {
        this.redisPub.publish(WORLDEVENT_CHANNEL, JSON.stringify(data));
    }

    quit() {
        this.redisPub.quit();
        this.redisSub.quit();
    }
}