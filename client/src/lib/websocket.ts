export const connectToWebSocket = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const socket = new WebSocket(wsUrl);

    return socket
}