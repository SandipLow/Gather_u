import { authState } from "./auth.svelte";

enum WebSocketEvents {
    // A new player has entered the world
    ENTER = "enter",
    // A player has left the world
    LEAVE = "leave",
    // A player has moved to a new position
    MOVE = "move",
    // A player has sent a chat message
    TALK = "talk",
    // A ping message to check if the connection is alive
    PING = "ping",
    // A pong message in response to a ping
    PONG = "pong"
}

// Interval to send ping messages in milliseconds
const LATENCY_CHECK_INTERVAL = 5000;

/**
 * A WebSocket client that connects to a server and handles incoming messages for player events.
 * It provides methods to send messages to the server for player events such as entering, leaving, moving, and talking.
 */
export default class WebSocketClient {
    private socket: WebSocket;
    private token: string;

    onEnter: (playerId: string) => void = () => {};
    onLeave: (playerId: string) => void = () => {};
    onMove: (playerId: string, x: number, y: number, animation: string, timestamp: number) => void = () => {};
    onTalk: (playerId: string, message: string) => void = () => {};
    
    onOpen: () => void = () => {};
    onReconnect: () => void = () => {};
    onPong: (latency: number) => void = () => {};
    onError: (error: Event) => void = () => {};
    onClose: () => void = () => {};

    private constructor(socket: WebSocket, token: string) {
        this.socket = socket;
        this.token = token;

        this.#setupEventHandlers();
        
        setInterval(() => {
            this.sendData(WebSocketEvents.PING, { timestamp: Date.now() });
        }, LATENCY_CHECK_INTERVAL);
    }

    #setupEventHandlers() {
        this.socket.onopen = () => {
            this.onOpen();
        };

        this.socket.onmessage = (e) => {
            const { type, payload } = JSON.parse(e.data);
            switch (type) {
                case WebSocketEvents.ENTER:
                    this.onEnter(payload.playerId);
                    break;
                case WebSocketEvents.LEAVE:
                    this.onLeave(payload.playerId);
                    break;
                case WebSocketEvents.MOVE:
                    this.onMove(payload.playerId, payload.x, payload.y, payload.animation, payload.timestamp);
                    break;
                case WebSocketEvents.TALK:
                    this.onTalk(payload.from, payload.message);
                    break;
                case WebSocketEvents.PONG:
                    this.onPong(Date.now() - payload.timestamp);
                    break;
            }
        }

        this.socket.onclose = () => {
            console.warn("WebSocket connection closed. Attempting to reconnect...");
            this.onClose();
            
            setTimeout(() => {
                this.reConnect();
            }, 2000);
        };


        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.onError(error);
        };
    }

    /**
     * Creates a new WebSocketClient instance and sets up event handlers for incoming messages.
     * @param `handleEnter` handler for when a new player enters the world
     * @param `handleLeave` handler for when a player leaves the world
     * @param `handleMove` handler for when a player moves to a new position
     * @param `handleTalk` handler for when a player sends a chat message
     */
    static async create(playerId: string) {
        const token = await authState.getPlayerToken(playerId);
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
        const socket = new WebSocket(`${wsUrl}?token=${token}`);
        return new WebSocketClient(socket, token);
    }

    private sendData(type: WebSocketEvents, payload: any) {
        if (this.socket.readyState !== WebSocket.OPEN) {
            console.error(`Failed to send message ${type}. WebSocket is not open. Ready state:`, this.socket.readyState);
            return;
        }

        this.socket.send(JSON.stringify({ type, payload }));
    }

    sendMove(x: number, y: number, animation: string, timestamp: number) {
        this.sendData(WebSocketEvents.MOVE, { x, y, animation, timestamp });
    }

    sendTalk(players: string[], message: string) {
        this.sendData(WebSocketEvents.TALK, { players, message });
    }

    reConnect() {
        if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
            console.warn("WebSocket is already open or connecting. No need to reconnect.");
            return;
        }

        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
        this.socket = new WebSocket(`${wsUrl}?token=${this.token}`);

        this.#setupEventHandlers();
        this.onReconnect();
    }

    close() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }
    }
}