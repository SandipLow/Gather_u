import { WebSocketServer, WebSocket } from 'ws';
import { Player, World } from './models';
import Strings from './res/strings';
import db from './db';
import http from 'http';
import Redis from 'ioredis';

export default class SocketServer {
    worlds: { [id: string]: World } = {};
    players: { [id: string]: Player } = {};
    wss: WebSocketServer;
    
    // Redis clients for Pub-Sub
    redisPub: Redis;
    redisSub: Redis;

    constructor(server: http.Server) {
        const redisUrl = process.env.REDIS_URI;
        if (!redisUrl) {
            console.error('Redis URI not provided');
            process.exit(1);
        }

        this.wss = new WebSocketServer({ server });
        this.redisPub = new Redis(redisUrl);
        this.redisSub = new Redis(redisUrl);

        this.wss.on("connection", this.onConnection.bind(this));

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
        const { type, payload } = JSON.parse(message);

        switch (type) {
            case Strings.WS_ENTER_WORLD:
                // Handle player entering the world
                this.handleRemoteEnterWorld(payload);
                break;

            case Strings.WS_LEAVE_WORLD:
                this.handleRemoteLeaveWorld(payload);
                break;

            case Strings.WS_MOVE:
                this.handleRemoteMove(payload);
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
                    this.redisPub.publish('world-events', JSON.stringify({ type: Strings.WS_ENTER_WORLD, payload }));
                    break;

                case Strings.WS_LEAVE_WORLD:
                    this.handleLeaveWorld(payload);
                    // Publish event to Redis
                    this.redisPub.publish('world-events', JSON.stringify({ type: Strings.WS_LEAVE_WORLD, payload }));
                    break;

                case Strings.WS_MOVE:
                    this.handleMove(payload);
                    // Publish move event to Redis
                    this.redisPub.publish('world-events', JSON.stringify({ type: Strings.WS_MOVE, payload }));
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
    handleEnterWorld(payload: any, ws: WebSocket) {
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
        const { player_id, data: { x, y, animation } } = payload;

        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.move(player, x, y, animation);
    }

    // Handle remote player entering world (received from Redis)
    handleRemoteEnterWorld(payload: any) {
        const { player_id } = payload;

        if (this.players[player_id]) return; // Ignore if already processed locally

        const playerData = db.Players[player_id];
        if (!playerData) return;

        const player = new Player(playerData, null); // No WebSocket for remote player
        this.players[player_id] = player;

        const world = this.worlds[player.world_id] || new World(db.Worlds[player.world_id]);
        this.worlds[world.id] = world;

        world.addPlayer(player);
    }

    // Handle remote player leaving world (received from Redis)
    handleRemoteLeaveWorld(payload: any) {
        const { player_id } = payload;

        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.removePlayer(player);
        delete this.players[player_id];
    }

    // Handle remote player movement (received from Redis)
    handleRemoteMove(payload: any) {
        const { player_id, data: { x, y, animation } } = payload;

        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.move(player, x, y, animation);
    }
}
