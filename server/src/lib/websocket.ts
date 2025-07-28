import { WebSocketServer, WebSocket } from 'ws';
import Strings from '../res/strings';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import Player from '../models/Player';
import World from '../models/World';
import RedisPubSub from './redis';

export default class SocketServer {
    serverid: string = "";
    worlds: { [id: string]: World } = {};
    players: { [id: string]: Player } = {};
    wss: WebSocketServer;
    redis: RedisPubSub;

    constructor(server: http.Server) {
        this.serverid = uuidv4();

        this.wss = new WebSocketServer({ server });
        this.wss.on("connection", this.onConnection.bind(this));

        this.redis = new RedisPubSub(
            this.serverid,
            (err) => console.error("Redis error:", err),
            this.onRedisMessage.bind(this)
        );

        process.on('exit', () => this.redis.quit());

        this.wss.on("error", (error) => console.error("WebSocket error:", error));

        setInterval(() => {
            console.log("Connected Players: ", Object.values(this.players).filter(p => p.socket!==null).map(p => p.id));
            console.log("Foreign Players: ", Object.values(this.players).filter(p => p.socket===null).map(p => p.id), "\n");
        }, 3000);
    }

    onConnection(ws: WebSocket) {
        ws.on("error", console.error);
        ws.on("message", this.onMessage.bind(this, ws));
        ws.on("close", this.onClose.bind(this, ws));
    }

    async onRedisMessage(channel: string, message: string) {
        const { type, payload, serverid } = JSON.parse(message);

        // Ignore messages from own server
        if (serverid === this.serverid) return;

        switch (type) {
            case Strings.WS_ENTER_WORLD:
                this.handleEnterWorld(payload, null);
                break;
            case Strings.WS_LEAVE_WORLD:
                this.handleLeaveWorld(payload);
                break;
            case Strings.WS_MOVE:
                this.handleMove(payload);
                break;
            case Strings.WS_TALK:
                this.handleTalk(payload);
                break;
            
            // send connected players and worlds data to the new server connected
            case Strings.WS_INIT:
                // Send Players and Worlds data to the new server
                const { serverid: newServerId } = payload;
                // Respond with the current state of connected players and worlds
                const data = this.#exportConnectedPlayers();
                this.redis.publishServerEvent(newServerId, {
                    type: Strings.WS_INIT + "_response",
                    payload: data
                });
                break;
            
            // Handle initialization response from Redis
            case Strings.WS_INIT + "_response":
                // Initialize worlds and players from the received data
                await this.#importPlayers(payload);
                break;

            default:
                console.error('Unknown message type from Redis:', type);
        }
    }

    onMessage(ws: WebSocket, data: string | Buffer) {
        try {
            const { type, payload } = JSON.parse(data.toString());
            
            // publish the event to Redis
            this.redis.publishWorldEvent({ type, payload, serverid: this.serverid });

            switch (type) {
                case Strings.WS_ENTER_WORLD:
                    this.handleEnterWorld(payload, ws);
                    break;
                case Strings.WS_LEAVE_WORLD:
                    this.handleLeaveWorld(payload);
                    break;
                case Strings.WS_MOVE:
                    this.handleMove(payload);
                    break;
                case Strings.WS_TALK:
                    this.handleTalk(payload);
                    break;
                default:
                    console.error('Unknown message type:', type);
            }
        } catch (e) {
            console.error(e);
        }
    }

    #getPlayerBySocket(ws: WebSocket): Player | null {
        for (const player_id in this.players) {
            if (this.players[player_id].socket === ws) {
                return this.players[player_id];
            }
        }
        return null;
    }

    #exportConnectedPlayers(): string[] {
        return Object.values(this.players).filter(plr => plr.socket).map(plr => plr.id);
    }

    async #importPlayers(data: string[]) {
        for (const player_id of data) {
            await this.handleEnterWorld({ player_id }, null);
        }
    }

    onClose(ws: WebSocket) {
        const player = this.#getPlayerBySocket(ws);
        if (player) {
            this.handleLeaveWorld({ player_id: player.id });
            this.redis.publishWorldEvent({
                type: Strings.WS_LEAVE_WORLD,
                payload: { player_id: player.id },
                serverid: this.serverid
            });
        }
    }

    async handleEnterWorld(payload: any, ws: WebSocket | null) {
        const { player_id } = payload;
        if (this.players[player_id]) return;

        const playerData = await Player.get(player_id);
        if (!playerData) return;

        const player = new Player(playerData, ws);
        this.players[player_id] = player;

        let world = this.worlds[player.world_id];
        if (!world) {
            const worldInstance = await World.get(player.world_id);
            if (!worldInstance) return;
            world = worldInstance;
            this.worlds[world.id] = world;
        }

        world.addPlayer(player);

        if (!ws) return;

        for (const p of world.getOnlinePlayers()) {
            if (p.id === player.id) continue;
            ws.send(JSON.stringify({
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
            }));
        }
    }

    handleLeaveWorld(payload: any) {
        const { player_id } = payload;
        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.removePlayer(player);
        delete this.players[player_id];
    }

    handleMove(payload: any) {
        const { player_id, data: { x, y, animation, timestamp } } = payload;
        const player = this.players[player_id];
        if (!player) return;

        const world = this.worlds[player.world_id];
        if (!world) return;

        world.move(player, x, y, animation, timestamp);
    }

    handleTalk(payload: any) {
        const { from, players, message } = payload;
        if (!Array.isArray(players)) return;

        for (const player_id of players) {
            const player = this.players[player_id];
            if (player?.socket?.readyState === WebSocket.OPEN) {
                player.socket.send(JSON.stringify({
                    type: Strings.WS_TALK,
                    payload: { from, message }
                }));
            }
        }
    }
}
