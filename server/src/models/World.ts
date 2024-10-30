import db from "../db";
import Strings from "../res/strings";
import Player from "./Player";

export interface WorldData {
    id: string;
    name: string;
}

export default class World {
    id: string;
    name: string;

    private onlinePlayers: {[player_id: string]: Player} = {};

    constructor({id, name}: WorldData) {
        this.id = id;
        this.name = name;
    }

    // Get all players in the world
    getPlayers() {
        // simulate a database query : "SELECT * FROM Players WHERE worldId = this.id"
        return Object.values(db.Players)
                .filter(player => player.world_id === this.id)
    }

    // Get all online players in the world
    getOnlinePlayers() {
        return Object.values(this.onlinePlayers);
    }

    // Get the count of online players in the world
    getOnlinePlayersCount() {
        return Object.keys(this.onlinePlayers).length;
    }

    // join a player to the world
    addPlayer(player: Player) {
        // Check if the player is already in the world
        if (this.onlinePlayers[player.id]) return;
        // Check if the player belongs to the world
        if (db.Players[player.id].world_id !== this.id) return;

        this.onlinePlayers[player.id] = player;
        this.emit(player, JSON.stringify({
            type: Strings.WS_ENTER_WORLD,
            payload: {
                player: {
                    id: player.id,
                    name: player.name,
                    wealth: player.wealth,
                    spritesheet: player.spritesheet,
                    checkpoint: player.checkpoint
                }
            }
        }));
    }

    // remove a player from the world
    removePlayer(player: Player) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        delete this.onlinePlayers[player.id];

        this.broadcast(JSON.stringify({
            type: Strings.WS_LEAVE_WORLD,
            payload: {
                player_id: player.id
            }
        }));
    }

    // emit a message to all players in the world except the player
    emit(player: Player, message: string) {
        for (const player_id in this.onlinePlayers) {
            const p = this.onlinePlayers[player_id];
            if (p.id === player.id) continue;

            p.send(message);
        };
    }
    
    // broadcast a message to all players in the world
    broadcast(message: string) {
        for (const player_id in this.onlinePlayers) {
            const p = this.onlinePlayers[player_id];
            p.send(message);
        };
    }

    // movement logic
    move(player: Player, x: number, y: number, animation: string) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        this.emit(player, JSON.stringify({
            type: Strings.WS_MOVE,
            payload: {
                player_id: player.id,
                data: { x, y, animation }
            }
        }));
    }




}