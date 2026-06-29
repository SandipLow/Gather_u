const WORLDEVENT_CHANNEL = "world_event_channel";

import Redis from "ioredis";


export default class RedisPubSub {
    redisPub: Redis;
    redisSub: Redis;

    constructor(
        serverid: string,
        handleError: (err: Error)=>void, 
        handleMessage: (channel: string, message: string)=>void
    ) {
        const redisUrl = process.env.REDIS_URI;
        const redisUsername = process.env.REDIS_USERNAME;
        const redisPassword = process.env.REDIS_PASSWORD;

        if (!redisUrl || !redisUsername || !redisPassword) {
            console.error('Redis URI not provided');
            process.exit(1);
        }

        this.redisPub = new Redis({
            // username: redisUsername,
            // password: redisPassword,
            port: parseInt(redisUrl.split(':')[1]),
            host: redisUrl.split(':')[0],
        });

        this.redisSub = new Redis({
            // username: redisUsername,
            // password: redisPassword,
            port: parseInt(redisUrl.split(':')[1]),
            host: redisUrl.split(':')[0]
        });


        this.redisSub.subscribe(WORLDEVENT_CHANNEL, (err, count) => {
            if (err) {
                console.error('Failed to subscribe: ', err);
                return;
            }
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        })

        this.redisSub.on('message', handleMessage);


        this.redisPub.on('error', handleError);
        this.redisSub.on('error', handleError);
    }

    sendMessage(data: any) {
        this.redisPub.publish(WORLDEVENT_CHANNEL, JSON.stringify(data));
    }

    quit() {
        this.redisPub.quit();
        this.redisSub.quit();
    }
}