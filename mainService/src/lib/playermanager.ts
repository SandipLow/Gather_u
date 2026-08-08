import { WebSocket } from "ws";

type PlayerConnects = {
    ws: WebSocket;
}

export default class PlayerManager {
    private players: Map<string, PlayerConnects> = new Map();

    addPlayer(playerId: string, ws: WebSocket) {
        if (this.players.has(playerId)) {
            console.warn(`Player with ID ${playerId} already exists. Overwriting.`);
        }
        this.players.set(playerId, { ws });
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

        player.ws.close();

        // Remove the player from the map
        this.players.delete(playerId);
    }
}