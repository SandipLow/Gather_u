import { authState } from "./auth.svelte";

enum WebSocketEvents {
    // A new player has entered the world
    ENTER = "enter",
    // A player has left the world
    LEAVE = "leave",
    // A player has moved to a new position
    MOVE = "move",
    // A player has sent a chat message
    TALK = "talk"
}

/**
 * A WebSocket client that connects to a server and handles incoming messages for player events.
 * It provides methods to send messages to the server for player events such as entering, leaving, moving, and talking.
 */
export default class WebSocketClient {
    socket: WebSocket

    private constructor(
        socket: WebSocket,
        handleEnter: (playerId: string) => void,
        handleLeave: (playerId: string) => void,
        handleMove: (playerId: string, x: number, y: number, animation: string, timestamp: number) => void,
        handleTalk: (playerId: string, message: string) => void
    ) {
        this.socket = socket;

        this.socket.onmessage = (e) => {
            const { type, payload } = JSON.parse(e.data);
            switch (type) {
                case WebSocketEvents.ENTER:
                    handleEnter(payload.playerId);
                    break;
                case WebSocketEvents.LEAVE:
                    handleLeave(payload.playerId);
                    break;
                case WebSocketEvents.MOVE:
                    handleMove(payload.playerId, payload.x, payload.y, payload.animation, payload.timestamp);
                    break;
                case WebSocketEvents.TALK:
                    handleTalk(payload.from, payload.message);
                    break;
            }
        }
    }

    /**
     * Creates a new WebSocketClient instance and sets up event handlers for incoming messages.
     * @param `handleEnter` handler for when a new player enters the world
     * @param `handleLeave` handler for when a player leaves the world
     * @param `handleMove` handler for when a player moves to a new position
     * @param `handleTalk` handler for when a player sends a chat message
     */
    static async create(
        playerId: string,
        handleEnter: (playerId: string) => void,
        handleLeave: (playerId: string) => void,
        handleMove: (playerId: string, x: number, y: number, animation: string, timestamp: number) => void,
        handleTalk: (playerId: string, message: string) => void
    ) {
        const token = await authState.getPlayerToken(playerId);
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
        const socket = new WebSocket(`${wsUrl}?token=${token}`);
        return new WebSocketClient(socket, handleEnter, handleLeave, handleMove, handleTalk);
    }

    private sendData(type: WebSocketEvents, payload: any) {
        if (this.socket.readyState !== WebSocket.OPEN) {
            console.error("WebSocket is not open. Ready state:", this.socket.readyState);
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

    onClose() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }
    }
}