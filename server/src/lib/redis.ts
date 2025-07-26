import Redis from "ioredis";
import Strings from "../res/strings";

export default class RedisPubSub {
    redisPub: Redis;
    redisSub: Redis;
    private WorldEventChannel = Strings.REDIS_WORLD_EVENT_CHANNEL;
    private PlayersKey = Strings.REDIS_PLAYERS_KEY;
    private WorldsKey = Strings.REDIS_WORLDS_KEY;

    constructor(
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

        // Subscribe to relevant Redis channels
        this.redisSub.subscribe(this.WorldEventChannel, (err, count) => {
            if (err) {
                console.error('Failed to subscribe: ', err);
                return;
            }
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        });

        this.redisSub.on('message', handleMessage);


        // Handle Redis errors
        this.redisPub.on('error', handleError);
        this.redisSub.on('error', handleError);
    }

    saveData(
        {
            players,
            worlds,
        }: {
            players: OnlinePlayerData[];
            worlds: WorldDataWithPlayers[];
        }
    ) {
        this.redisPub.set(this.PlayersKey, JSON.stringify(players));
        this.redisPub.set(this.WorldsKey, JSON.stringify(worlds));
    }

    async getData(): Promise<{
        players: OnlinePlayerData[];
        worlds: WorldDataWithPlayers[];
    }> {
        const players = await this.redisPub.get(this.PlayersKey);
        const worlds = await this.redisPub.get(this.WorldsKey);

        return {
            players: players ? JSON.parse(players) : [],
            worlds: worlds ? JSON.parse(worlds) : [],
        };
    }

    publishWorldEvent(data: any) {
        this.redisPub.publish(this.WorldEventChannel, JSON.stringify(data));
    }

    quit() {
        this.redisPub.quit();
        this.redisSub.quit();
    }
}