import Player from "../models/Player";
import World from "../models/World";
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as grpc from "@grpc/grpc-js";


const OPEN_WORLD_ID = 'open_world'; // All guests join this world
const CLEANUP_INTERVAL_MS = 2 * 5 * 60 * 1000; // Cleanup every 10 minutes
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes of inactivity


class PlayerManager {
    private players: Map<string, Player> = new Map();
    private worlds: Map<string, World> = new Map();

    constructor() {
        setInterval(() => this.#cleanupInactivePlayers(), CLEANUP_INTERVAL_MS);
    }

    createTemporaryPlayer(name: string, spritesheet: string): { player: Player, token: string } {
        const id = `tmp_${uuidv4()}`;
        const checkpoint = { x: 200, y: 200 };

        const player = new Player({
            id,
            name,
            spritesheet,
            world_id: OPEN_WORLD_ID,
            user_id: `guest_${id}`,
            wealth: 0,
            checkpoint,
            position: checkpoint,
            animation: 'idle',
            timestamp: Date.now()
        });

        this.players.set(id, player);

        if (!this.worlds.has(OPEN_WORLD_ID)) {
            this.worlds.set(OPEN_WORLD_ID, new World({ id: OPEN_WORLD_ID, name: "Open World" }));
        }

        const token = jwt.sign({ playerId: id }, process.env.JWT_SECRET!, { expiresIn: '5m' });
        return { player, token };
    }

    getPlayer(playerId: string) {
        return this.players.get(playerId);
    }

    async loadPlayer(playerId: string): Promise<{ player: Player, world: World } | undefined> {
        const player = this.players.get(playerId) || await Player.get(playerId);
        if (!player) {
            console.warn(`Player with ID ${playerId} not found in database.`);
            return;
        }

        
        const world = this.worlds.get(player.world_id) || await World.get(player.world_id);
        if (!world) {
            console.warn(`World with ID ${player.world_id} not found for player ${playerId}.`);
            return;
        }

        world.addPlayer(player);

        this.worlds.set(world.id, world);
        this.players.set(playerId, player);
        
        return {player, world};
    }

    updatePlayerPosition(playerId: string, position: { x: any; y: any; }, animation: any, timestamp: any): boolean {
        const player = this.players.get(playerId);
        if (!player) {
            console.warn(`Player with ID ${playerId} not found in memory.`);
            return false;
        }

        const world = this.worlds.get(player.world_id);
        if (!world) {
            console.warn(`World with ID ${player.world_id} not found for player ${playerId}.`);
            return false;
        }

        world.move(player, position.x, position.y, animation, timestamp);
        return true;
    }

    removePlayer(playerId: string): void {
        const player = this.players.get(playerId);
        if (!player) {
            console.warn(`Player with ID ${playerId} not found in memory.`);
            return;
        }

        this.players.delete(playerId);
        
        const world = this.worlds.get(player.world_id);
        if (world) {
            world.removePlayer(player);
        }
    }

    getNearbyPlayers(playerId: string, radius: number = 100): Player[] | undefined {
        const player = this.players.get(playerId);
        if (!player) {
            console.warn(`Player with ID ${playerId} not found in memory.`);
            return;
        }

        const world = this.worlds.get(player.world_id);
        if (!world) {
            console.warn(`World with ID ${player.world_id} not found for player ${playerId}.`);
            return;
        }

        return world.getNearbyPlayers(player, radius);
    }

    #cleanupInactivePlayers() {
        const now = Date.now();
        for (const [playerId, player] of this.players.entries()) {
            if (now - player.timestamp > INACTIVITY_THRESHOLD_MS) {
                this.players.delete(playerId);
                console.log(`Player ${playerId} removed from memory due to inactivity.`);
            }
        }

        for (const [worldId, world] of this.worlds.entries()) {
            const onlinePlayers = world.getOnlinePlayers();
            if (onlinePlayers.length === 0) {
                this.worlds.delete(worldId);
                console.log(`World ${worldId} removed from memory as it has no online players.`);
            }
        }
    }

    // gRPC service functions
    async EnterPlayerWorld(request: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId } = request;
            
            const res = await this.loadPlayer(playerId);
            if (!res) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const { world } = res;
            const playerIds = world.getOnlinePlayers()
                .filter(p => p.id !== playerId)
                .map(p => p.id);

            cb(null, { playerIds });

        } catch (err) {
            console.error("EnterPlayerWorld error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    LeavePlayerWorld(request: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId } = request;

            const player = this.players.get(playerId);
            if (!player) {
                console.warn(`Player with ID ${playerId} not found in memory.`);
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const world = this.worlds.get(player.world_id);
            this.removePlayer(playerId);

            const playerIds = world
                ? world.getOnlinePlayers()
                    .filter(p => p.id !== playerId)
                    .map(p => p.id)
                : [];

            cb(null, { playerIds });

        } catch (err) {
            console.error("LeavePlayerWorld error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    SetPlayerCoordinates(request: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId, x, y, animation, timestamp } = request;

            // 1 FPS data only to save
            if (Date.now() - timestamp >= 1000) {
                const success = this.updatePlayerPosition(playerId, { x, y }, animation, timestamp);
                if (!success) {
                    cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                    return;
                }
            }

            const nbrs = this.getNearbyPlayers(playerId, 800);
            if (!nbrs) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const playerIds = nbrs.map(p => p.id);
            cb(null, { playerIds });

        } catch (err) {
            console.error("SetPlayerCoordinates error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }
}


const playerManager = new PlayerManager();
export default playerManager;
