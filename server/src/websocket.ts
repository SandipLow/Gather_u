import { WebSocketServer, WebSocket } from 'ws';
import { Player, World } from './models';
import Strings from './res/strings';
import db from './db';
import http from 'http';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export default class SocketServer {
    serverid: string = "";
    worlds: { [id: string]: World } = {};
    players: { [id: string]: Player } = {};
    wss: WebSocketServer;
    
    // Redis clients for Pub-Sub
    redisPub: Redis;
    redisSub: Redis;

    constructor(server: http.Server) {
        // Generate a unique server ID
        this.serverid = uuidv4();
        
        // Create WebSocket server
        this.wss = new WebSocketServer({ server });
        this.wss.on("connection", this.onConnection.bind(this));
        
        // Connect to Redis
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

        // fetch current world and players 

        // Subscribe to relevant Redis channels
        this.redisSub.subscribe('world-events', (err, count) => {
            if (err) {
                console.error('Failed to subscribe: ', err);
                return;
            }
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        });
        this.redisSub.on('message', this.onRedisMessage.bind(this));
    }

    onConnection(ws: WebSocket) {
        ws.on("error", console.error);
        ws.on("message", this.onMessage.bind(this, ws));
        ws.on("close", this.onClose.bind(this, ws));
    }

    // This will handle incoming messages from Redis Pub-Sub
    onRedisMessage(channel: string, message: string) {
        const { type, payload, serverid } = JSON.parse(message);

        // Ignore messages from this server
        if (serverid === this.serverid) return;
        
        console.log('Received message from Redis:', message);

        switch (type) {
            case Strings.WS_ENTER_WORLD:
                // Handle player entering the world
                this.handleEnterWorld(payload, null);
                break;

            case Strings.WS_LEAVE_WORLD:
                this.handleLeaveWorld(payload);
                break;

            case Strings.WS_MOVE:
                this.handleMove(payload);
                break;

            default:
                console.error('Unknown message type from Redis:', type);
                break;
        }
    }

    onMessage(ws: WebSocket, data: string | Buffer) {
        try {
            const { type, payload } = JSON.parse(data.toString());

            switch (type) {
                case Strings.WS_ENTER_WORLD:
                    this.handleEnterWorld(payload, ws);
                    // Publish event to Redis
                    this.redisPub.publish('world-events', JSON.stringify({ type, payload, serverid: this.serverid }));
                    break;

                case Strings.WS_LEAVE_WORLD:
                    this.handleLeaveWorld(payload);
                    // Publish event to Redis
                    this.redisPub.publish('world-events', JSON.stringify({ type, payload, serverid: this.serverid }));
                    break;

                case Strings.WS_MOVE:
                    this.handleMove(payload);
                    // Publish move event to Redis
                    this.redisPub.publish('world-events', JSON.stringify({ type, payload, serverid: this.serverid }));
                    break;

                default:
                    console.error('Unknown message type:', type);
                    break;
            }
        } catch (e) {
            console.error(e);
        }
    }

    onClose(ws: WebSocket) {
        for (const player_id in this.players) {
            const player = this.players[player_id];
            if (player.socket === ws) {
                this.handleLeaveWorld({ player_id });
                // Publish leave event to Redis
                this.redisPub.publish('world-events', JSON.stringify({ type: Strings.WS_LEAVE_WORLD, payload: { player_id } }));
                break;
            }
        }
    }

    // Handle player entering the world
    handleEnterWorld(payload: any, ws: WebSocket | null) {
        const { player_id } = payload;

        // Is the player already playing?
        if (this.players[player_id]) return;

        const playerData = db.Players[player_id];
        if (!playerData) return;

        const player = new Player(playerData, ws);
        this.players[player_id] = player;

        const world = this.worlds[player.world_id] || new World(db.Worlds[player.world_id]);
        this.worlds[world.id] = world;

        world.addPlayer(player);

        if (!ws) return

        // Send online players' data to the new player
        for (const p of world.getOnlinePlayers()) {
            if (p.id === player.id) continue;

            ws.send(
                JSON.stringify({
                    type: Strings.WS_ENTER_WORLD,
                    payload: {
                        player: {
                            id: p.id,
                            name: p.name,
                            wealth: p.wealth,
                            spritesheet: p.spritesheet,
                            checkpoint: p.checkpoint,
                        },
                    },
                })
            );
        }
    }

    // Handle leave world
    handleLeaveWorld(payload: any) {
        const { player_id } = payload;

        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.removePlayer(player);
        delete this.players[player_id];
    }

    // Handle move event
    handleMove(payload: any) {
        const { player_id, data: { x, y, animation, timestamp } } = payload;

        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.move(player, x, y, animation, timestamp);
    }
}
