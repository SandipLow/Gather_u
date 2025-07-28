import Redis from "ioredis";
import Strings from "../res/strings";

export default class RedisPubSub {
    redisPub: Redis;
    redisSub: Redis;
    private WorldEventChannel = Strings.REDIS_WORLD_EVENT_CHANNEL;

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
            username: redisUsername,
            password: redisPassword,
            port: parseInt(redisUrl.split(':')[1]),
            host: redisUrl.split(':')[0],
        });

        this.redisSub = new Redis({
            username: redisUsername,
            password: redisPassword,
            port: parseInt(redisUrl.split(':')[1]),
            host: redisUrl.split(':')[0]
        });

        // Subscribe to relevant Redis channels. World events and own server communication channel
        this.redisSub.subscribe(this.WorldEventChannel, RedisPubSub.getServerCommunicationChannel(serverid), (err, count) => {
            if (err) {
                console.error('Failed to subscribe: ', err);
                return;
            }
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        });

        // Handle incoming messages
        this.redisSub.on('message', handleMessage);


        // Publish an initial message to the world event channel
        this.redisPub.publish(this.WorldEventChannel, JSON.stringify({
            type: Strings.WS_INIT,
            payload: { serverid },
            serverid
        }));


        // Handle Redis errors
        this.redisPub.on('error', handleError);
        this.redisSub.on('error', handleError);
    }

    // Publish a message to the world
    publishWorldEvent(data: any) {
        this.redisPub.publish(this.WorldEventChannel, JSON.stringify(data));
    }

    // Publish a message to a specific server
    publishServerEvent(serverid: string, data: any) {
        this.redisPub.publish(RedisPubSub.getServerCommunicationChannel(serverid), JSON.stringify(data));
    }

    // Static method to get the server communication channel name
    static getServerCommunicationChannel(serverid: string) {
        return `server-communication-${serverid}`;
    }

    quit() {
        this.redisPub.quit();
        this.redisSub.quit();
    }
}