import { authState } from "./auth.svelte";

enum WebSocketEvents {
    // World events
    INIT = "init",
    ENTER = "enter",
    LEAVE = "leave",
    MOVE = "move",
    TALK = "talk",
    ENTER_CAR = "enter_car",
    LEAVE_CAR = "leave_car",
    MOVE_CAR = "move_car",

    // Utility events
    PING = "ping",
    PONG = "pong",
}

// Interval to send ping messages in milliseconds
const LATENCY_CHECK_INTERVAL = 5000;

/**
 * A WebSocket client that connects to a server and handles incoming messages for player events.
 * It provides methods to send messages to the server for player events such as entering, leaving, moving, and talking.
 */
export default class WebSocketClient {
    private isClosedManually: boolean = false;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private _initialState: any = null;
    private _onInit: (data: { self?: any; players?: any[]; cars?: any[] }) => void = () => { };

    get onInit() {
        return this._onInit;
    }

    set onInit(handler: (data: { self?: any; players?: any[]; cars?: any[] }) => void) {
        this._onInit = handler;
        if (this._initialState) {
            handler(this._initialState);
        }
    }

    onEnter: (playerData: any) => void = () => { };
    onLeave: (playerId: string) => void = () => { };
    onMove: (playerId: string, x: number, y: number, animation: string, timestamp: number) => void = () => { };
    onTalk: (playerId: string, message: string) => void = () => { };
    onEnterCar: (carId: string, playerId: string) => void = () => { };
    onLeaveCar: (carId: string) => void = () => { };
    onMoveCar: (playerId: string, carId: string, x: number, y: number, angle: number) => void = () => { };
    onWsError: (message: string) => void = () => { };

    onOpen: () => void = () => { };
    onReconnect: () => void = () => { };
    onPong: (latency: number) => void = () => { };
    onError: (error: Event) => void = () => { };
    onClose: () => void = () => { };

    private constructor(
        private socket: WebSocket, 
        private token: string
    ) {
        this.#setupEventHandlers();

        this.pingInterval = setInterval(() => {
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
                case WebSocketEvents.INIT:
                    this._initialState = payload;
                    this._onInit(payload);
                    break;
                case WebSocketEvents.ENTER:
                    this.onEnter(payload.player || payload);
                    break;
                case WebSocketEvents.LEAVE:
                    this.onLeave(payload.playerId);
                    break;
                case WebSocketEvents.MOVE:
                    this.onMove(payload.playerId, payload.x, payload.y, payload.animation, payload.timestamp);
                    break;
                case WebSocketEvents.ENTER_CAR:
                    this.onEnterCar(payload.carId, payload.playerId);
                    break;
                case WebSocketEvents.LEAVE_CAR:
                    this.onLeaveCar(payload.carId);
                    break;
                case WebSocketEvents.MOVE_CAR:
                    this.onMoveCar(payload.playerId, payload.carId, payload.x, payload.y, payload.angle);
                    break;
                case WebSocketEvents.TALK:
                    this.onTalk(payload.from, payload.message);
                    break;
                case WebSocketEvents.PONG:
                    this.onPong(Date.now() - payload.timestamp);
                    break;
                case "error":
                    console.error("WebSocket server error:", payload.message);
                    this.onWsError(payload.message);
                    this.onError(new Event("error"));
                    break;
            }
        };

        this.socket.onclose = () => {
            if (this.isClosedManually) {
                this.onClose();
                return;
            }

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

    static async create(playerId: string, player_token? : string | undefined) {
        const token = player_token || await authState.getPlayerToken(playerId);
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
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

    sendEnterCar(carId: string) {
        this.sendData(WebSocketEvents.ENTER_CAR, { carId });
    }

    sendLeaveCar(carId: string) {
        this.sendData(WebSocketEvents.LEAVE_CAR, { carId });
    }

    sendMoveCar(carId: string, x: number, y: number, angle: number) {
        this.sendData(WebSocketEvents.MOVE_CAR, { carId, x, y, angle });
    }

    reConnect() {
        if ((this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) && !this.isClosedManually) {
            console.warn("WebSocket is already open or connecting. No need to reconnect.");
            return;
        }

        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
        this.socket = new WebSocket(`${wsUrl}?token=${this.token}`);

        this.#setupEventHandlers();
        this.onReconnect();
    }

    close() {
        this.isClosedManually = true;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (
            this.socket &&
            (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
        ) {
            this.socket.close();
        }
    }
}
