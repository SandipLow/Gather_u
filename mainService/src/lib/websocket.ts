import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import PlayerService from "./playerService";
import RedisPubSub from "./redis";
import { verifyJWT } from "./auth";
import { GameLoop } from "./gameloop";

declare module "ws" {
    interface WebSocket {
        playerId?: string;
        isAlive?: boolean;
    }
}

enum WebSocketEvents {
    ENTER = "enter",
    LEAVE = "leave",
    MOVE = "move",
    TALK = "talk",
    PING = "ping",
    PONG = "pong"
}

const MAX_TALK_TARGETS = 50;
const HEARTBEAT_INTERVAL = 30_000;

export default class SocketServer {
    serverid: string;
    wss: WebSocketServer;
    playerService: PlayerService;
    redisPubSub: RedisPubSub;
    players: Map<string, WebSocket>;
    gameLoop: GameLoop;
    private heartbeatTimer: NodeJS.Timeout;

    constructor(server: any, playerService: PlayerService) {
        this.serverid = uuidv4();
        this.playerService = playerService;
        this.players = new Map();

        this.redisPubSub = new RedisPubSub(
            this.serverid,
            (err) => console.error("Redis error:", err),
            this.onRedisMessage.bind(this)
        );

        // broadcast nearby players' positions after each tick
        this.gameLoop = new GameLoop(
            playerService,
            (playerId, nearby, x, y, animation, timestamp) => {
                nearby.forEach((id) =>
                    this.sendMessage(id, WebSocketEvents.MOVE, { playerId, x, y, animation, timestamp })
                );
            }
        );

        this.wss = new WebSocketServer({ server });
        this.wss.on("connection", this.onConnection.bind(this));

        this.heartbeatTimer = setInterval(() => {
            this.wss.clients.forEach((ws: WebSocket) => {
                if (ws.isAlive === false) { ws.terminate(); return; }
                ws.isAlive = false;
                ws.ping();
            });
        }, HEARTBEAT_INTERVAL);

        // stop game loop when WS server closes
        this.wss.on("close", () => {
            clearInterval(this.heartbeatTimer);
            this.gameLoop.stop();
        });
    }

    // ─── Connection lifecycle ────────────────────────────────────────────────

    onConnection(ws: WebSocket, req: IncomingMessage) {
        if (!this.redisPubSub.isReady) {
            ws.send(JSON.stringify({ type: "error", payload: { message: "Service unavailable." } }));
            ws.close();
            return;
        }

        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get("token");
        let playerId: string;

        try {
            const { playerId: pid } = verifyJWT(token!) as { playerId: string };
            playerId = pid;
        } catch {
            ws.send(JSON.stringify({ type: "error", payload: { message: "Unauthorized." } }));
            ws.close();
            return;
        }

        this.players.get(playerId)?.close();

        ws.isAlive = true;
        ws.playerId = playerId;
        this.players.set(playerId, ws);

        ws.on("pong", () => { ws.isAlive = true; });
        ws.on("error", console.error);
        ws.on("message", this.onMessage.bind(this, ws));
        ws.on("close", this.onClose.bind(this, ws));

        this.playerService.enterPlayerWorld(playerId)
            .then((otherPlayers) => {
                otherPlayers.forEach((id) => {
                    this.sendMessage(playerId, WebSocketEvents.ENTER, { playerId: id });
                    this.sendMessage(id, WebSocketEvents.ENTER, { playerId });
                });
            })
            .catch((error) => {
                console.error("Error entering world:", error);
                this.players.delete(playerId);
                ws.send(JSON.stringify({ type: "error", payload: { message: "Failed to enter world." } }));
                ws.close();
            });
    }

    onMessage(ws: WebSocket, data: string | Buffer) {
        try {
            const { type, payload } = JSON.parse(data.toString());

            switch (type) {
                case WebSocketEvents.MOVE: this.handleMove(payload, ws); break;
                case WebSocketEvents.TALK: this.handleTalk(payload, ws); break;
                case WebSocketEvents.PING: {
                    if (ws.playerId) {
                        this.sendMessage(ws.playerId, WebSocketEvents.PONG, payload); 
                    }
                    break;
                }
                default: console.warn("Unknown message type:", type, data.toString());
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    }

    onClose(ws: WebSocket) {
        if (!ws.playerId) return;

        this.gameLoop.dequeue(ws.playerId); // ← drain before leaving
        this.players.delete(ws.playerId);

        this.playerService.leavePlayerWorld(ws.playerId)
            .then((otherPlayers) => {
                otherPlayers.forEach((id) =>
                    this.sendMessage(id, WebSocketEvents.LEAVE, { playerId: ws.playerId })
                );
            })
            .catch((error) => console.error("Error leaving world:", error));
    }

    // ─── Redis fan-out ───────────────────────────────────────────────────────

    onRedisMessage(_channel: string, message: string) {
        const { playerId, type, payload, serverid } = JSON.parse(message);
        if (serverid === this.serverid || !this.players.has(playerId)) return;
        this.players.get(playerId)!.send(JSON.stringify({ type, payload }));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    sendMessage(playerId: string, type: string, payload: any) {
        const ws = this.players.get(playerId);
        if (ws) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type, payload }));
            }
            else {
                setTimeout(() => this.sendMessage(playerId, type, payload), 2000);
            }
        } else {
            this.redisPubSub.sendMessage({ playerId, type, payload, serverid: this.serverid });
        }
    }

    // ─── Game event handlers ─────────────────────────────────────────────────

    handleMove(payload: any, ws: WebSocket) {
        const playerId = ws.playerId;
        if (!playerId) return;

        const { x, y, animation, timestamp } = payload;

        if (typeof x !== "number" || typeof y !== "number" || !isFinite(x) || !isFinite(y)) {
            console.warn("Invalid coordinates from", playerId, { x, y });
            return;
        }

        // enqueue instead of direct gRPC call
        this.gameLoop.enqueue(playerId, x, y, animation, timestamp);
    }

    handleTalk(payload: any, ws: WebSocket) {
        const from = ws.playerId;
        if (!from) return;

        const { players, message } = payload;
        if (!Array.isArray(players)) return;

        const targets = players.slice(0, MAX_TALK_TARGETS);
        for (const id of targets) {
            this.sendMessage(id, WebSocketEvents.TALK, { from, message });
        }
    }
}