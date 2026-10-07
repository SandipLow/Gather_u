import { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import PlayerService from "./playerService";
import RedisPubSub from "./redis";
import { verifyJWT } from "./auth";
import PlayerManager from "./playermanager";

declare module "ws" {
    interface WebSocket {
        playerId?: string;
        isAlive?: boolean;
    }
}

enum WebSocketEvents {
    INIT = "init",
    ENTER = "enter",
    LEAVE = "leave",
    MOVE = "move",
    TALK = "talk",
    ENTER_CAR = "enter_car",
    LEAVE_CAR = "leave_car",
    MOVE_CAR = "move_car",

    PING = "ping",
    PONG = "pong",
}

const MAX_TALK_TARGETS = 50;
const HEARTBEAT_INTERVAL = 30_000;

export default class SocketServer {
    serverid: string;
    wss: WebSocketServer;
    redisPubSub: RedisPubSub;

    private heartbeatTimer: NodeJS.Timeout;

    constructor(
        private playerService: PlayerService,
        private playerManager: PlayerManager,
        server: any, 
    ) {
        this.serverid = uuidv4();

        this.redisPubSub = new RedisPubSub(
            this.serverid,
            (err) => console.error("Redis error:", err),
            this.onRedisMessage.bind(this)
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
        });
    }

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

        this.playerManager.getPlayer(playerId)?.ws.close();

        ws.isAlive = true;
        ws.playerId = playerId;

        this.playerManager.addPlayer(playerId, ws);

        ws.on("pong", () => { ws.isAlive = true; });
        ws.on("error", console.error);
        ws.on("message", this.onMessage.bind(this, ws));
        ws.on("close", this.onClose.bind(this, ws));

        this.playerService
            .enterPlayerWorldAndGetOthers(playerId)
            .then((enterData) => {
                // Send full initial world state to the newly connected player
                this.sendMessage(playerId, WebSocketEvents.INIT, enterData);

                // Broadcast ENTER to other players with the actual player data
                enterData.players.forEach((otherPlayer) => {
                    this.sendMessage(otherPlayer.id, WebSocketEvents.ENTER, {
                        player: enterData.self
                    });
                });
            })
            .catch((error) => {
                console.error("Error entering world:", error);
                this.playerManager.removePlayer(playerId);
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
                case WebSocketEvents.ENTER_CAR: this.handleEnterCar(payload, ws); break;
                case WebSocketEvents.LEAVE_CAR: this.handleLeaveCar(payload, ws); break;
                case WebSocketEvents.MOVE_CAR: this.handleMoveCar(payload, ws); break;

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

    onRedisMessage(_channel: string, message: string) {
        const { playerId, type, payload, serverid } = JSON.parse(message);
        if (serverid === this.serverid || !this.playerManager.hasPlayer(playerId)) return;
        this.playerManager.getPlayer(playerId)!.ws.send(JSON.stringify({ type, payload }));
    }

    sendMessage(playerId: string, type: WebSocketEvents, payload: any) {
        const ws = this.playerManager.getPlayer(playerId)?.ws;
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

    handleMove(payload: any, ws: WebSocket) {
        const playerId = ws.playerId;
        if (!playerId) return;

        const { x, y, animation, timestamp } = payload;

        if (typeof x !== "number" || typeof y !== "number" || !isFinite(x) || !isFinite(y)) {
            console.warn("Invalid coordinates from", playerId, { x, y });
            return;
        }

        this.playerService
            .setPlayerCoordinatesAndGetNears(playerId, x, y, animation, timestamp)
            .then((nearbyPlayers) => {
                nearbyPlayers.forEach((id) => {
                    this.sendMessage(id, WebSocketEvents.MOVE, { playerId, x, y, animation, timestamp });
                });
            })
            .catch((error) => console.error("Error setting coordinates:", error));
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

    handleEnterCar(payload: any, ws: WebSocket) {
        const playerId = ws.playerId;
        if (!playerId) return;

        const { carId } = payload;
        if (!carId) return;

        this.playerService
            .enterCarAndGetOthers(playerId, carId)
            .then((players) => {
                // Send confirmation back to requesting client by reusing ENTER_CAR event
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: WebSocketEvents.ENTER_CAR, payload: { playerId, carId } }));
                }
                // Broadcast ENTER_CAR to other players
                players.forEach((targetId) => {
                    this.sendMessage(targetId, WebSocketEvents.ENTER_CAR, { playerId, carId });
                });
            })
            .catch((error) => {
                console.error("Error handling enter car:", error);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "error", payload: { message: error.message || "Vehicle Already Owned" } }));
                }
            });
    }

    handleLeaveCar(payload: any, ws: WebSocket) {
        const playerId = ws.playerId;
        if (!playerId) return;

        const { carId } = payload;
        if (!carId) return;

        this.playerService
            .leaveCarAndGetOthers(playerId, carId)
            .then((players) => {
                players.forEach((targetId) => {
                    this.sendMessage(targetId, WebSocketEvents.LEAVE_CAR, { playerId, carId });
                });
            })
            .catch((error) => console.error("Error handling leave car:", error));
    }

    handleMoveCar(payload: any, ws: WebSocket) {
        const playerId = ws.playerId;
        if (!playerId) return;

        const { carId, x, y, angle } = payload;
        if (!carId
            || typeof x !== "number"
            || typeof y !== "number"
            || typeof angle !== "number"
            || !isFinite(x)
            || !isFinite(y)
            || !isFinite(angle)
        ) return;

        const timestamp = Date.now();
        this.playerService
            .setDrivingPlayerCoordinatesAndGetNears(playerId, carId, x, y, angle, timestamp)
            .then((players) => {
                players.forEach((targetId) => {
                    this.sendMessage(targetId, WebSocketEvents.MOVE_CAR, { playerId, carId, x, y, angle });
                });
            })
            .catch((error) => console.error("Error handling move car:", error));
    }

    onClose(ws: WebSocket) {
        if (!ws.playerId) return;
        
        this.playerManager.close(ws.playerId);

        this.playerService.leavePlayerWorldAndGetOthers(ws.playerId)
            .then((otherPlayers) => {
                otherPlayers.forEach((id) =>
                    this.sendMessage(id, WebSocketEvents.LEAVE, { playerId: ws.playerId })
                );
            })
            .catch((error) => console.error("Error leaving world:", error));
    }

}
