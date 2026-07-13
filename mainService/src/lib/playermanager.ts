import { WebRtcTransport, Producer, Consumer } from "mediasoup/types";
import { WebSocket } from "ws";

type PlayerConnects = {
    ws: WebSocket;
    sendTransport?: WebRtcTransport;
    recvTransport?: WebRtcTransport;
    producers: Map<string, Producer>; // kind -> Producer
    consumers: Map<string, Consumer>; // producerId -> Consumer
}

export default class PlayerManager {
    private players: Map<string, PlayerConnects> = new Map();

    addPlayer(playerId: string, ws: WebSocket) {
        if (this.players.has(playerId)) {
            console.warn(`Player with ID ${playerId} already exists. Overwriting.`);
        }
        this.players.set(playerId, { ws, producers: new Map(), consumers: new Map() });
    }

    removePlayer(playerId: string) {
        if (!this.players.has(playerId)) {
            console.warn(`Player with ID ${playerId} does not exist.`);
            return;
        }
        this.players.delete(playerId);
    }

    getPlayer(playerId: string): PlayerConnects | undefined {
        return this.players.get(playerId);
    }

    hasPlayer(playerId: string): boolean {
        return this.players.has(playerId);
    }

    close(playerId: string) {
        const player = this.players.get(playerId);
        if (!player) {
            console.warn(`Player with ID ${playerId} does not exist.`);
            return;
        }

        // Close all producers
        for (const producer of player.producers.values()) {
            producer.close();
        }
        player.producers.clear();

        // Close all consumers
        for (const consumer of player.consumers.values()) {
            consumer.close();
        }
        player.consumers.clear();

        // Close transports
        player.sendTransport?.close();
        player.recvTransport?.close();

        // Remove the player from the map
        this.players.delete(playerId);
    }
}