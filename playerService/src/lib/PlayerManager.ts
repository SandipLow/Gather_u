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
        
        return { player, world };
    }

    updatePlayerPosition(
        playerId: string,
        position: { x: number; y: number; },
        animation: string, timestamp: number
    ): boolean {
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

    updateDrivingPlayerPosition(
        playerId: string,
        carId: string,
        position: {x: number, y: number, angle: number},
        timestamp: number
    ): boolean {
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

        return world.moveCar(playerId, carId, position.x, position.y, position.angle, timestamp)
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

    getNearby(
        playerId: string,
        radius: number = 800
    ) {
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

        const { x, y } = player.position;

        const { players, cars } = world.getNearby(x, y, radius, new Set<string>().add(player.id));

        return {players, cars};
    }

    #cleanupInactivePlayers() {
        const now = Date.now();
        for (const [playerId, player] of this.players.entries()) {
            if (now - player.timestamp > INACTIVITY_THRESHOLD_MS) {
                this.removePlayer(playerId);
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
    async EnterPlayerWorldAndGetOthers(request: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId } = request;
            
            const res = await this.loadPlayer(playerId);
            if (!res) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const { player, world } = res;
            const onlinePlayers = world.getOnlinePlayers();
            const cars = world.getCars();

            const playerDrivingMap = new Map<string, string>();
            for (const car of cars) {
                if (car.isDriving) {
                    playerDrivingMap.set(car.isDriving, car.id);
                }
            }

            const mapPlayer = (p: Player) => ({
                id: p.id,
                name: p.name,
                spritesheet: p.spritesheet,
                wealth: p.wealth,
                checkpoint: { x: p.checkpoint.x, y: p.checkpoint.y },
                position: { x: p.position.x, y: p.position.y },
                animation: p.animation || "idle",
                timestamp: p.timestamp || Date.now(),
                isDriving: playerDrivingMap.get(p.id) || ""
            });

            const mapCar = (c: any) => ({
                id: c.id,
                spriteKey: c.spriteKey,
                position: { x: c.position.x, y: c.position.y, angle: c.position.angle ?? 180 },
                isDriving: c.isDriving || "",
                timestamp: c.timestamp || Date.now()
            });

            const response = {
                self: mapPlayer(player),
                players: onlinePlayers.filter(p => p.id !== playerId).map(mapPlayer),
                cars: cars.map(mapCar)
            };

            cb(null, response);

        } catch (err) {
            console.error("EnterPlayerWorld error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    LeavePlayerWorldAndGetOthers(request: any, cb: grpc.sendUnaryData<any>) {
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

    SetPlayerCoordinatesAndGetNears(request: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId, x, y, animation, timestamp } = request;

            const player = this.players.get(playerId);
            if (!player) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            // 1 FPS data save
            if (Date.now() - (player.timestamp || 0) >= 1000) {
                this.updatePlayerPosition(playerId, { x, y }, animation, timestamp);
            }

            const nears = this.getNearby(playerId, 800);
            if (!nears) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const playerIds = nears.players.map(p => p.id);
            const carIds = nears.cars.map(c => c.id);
            cb(null, { playerIds, carIds });

        } catch (err) {
            console.error("SetPlayerCoordinates error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    SetDrivingPlayerCoordinatesAndGetNears(req: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId, carId, x, y, angle, timestamp } = req;

            const player = this.players.get(playerId);
            if (!player) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const world = this.worlds.get(player.world_id);
            const car = world?.getCar(carId);

            // 1 FPS data save
            if (!car || Date.now() - (car.timestamp || 0) >= 1000) {
                this.updateDrivingPlayerPosition(playerId, carId, { x, y, angle }, timestamp);
            }

            const nears = this.getNearby(playerId, 800);
            if (!nears) {
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const playerIds = nears.players.map(p => p.id);
            const carIds = nears.cars.map(c => c.id);
            cb(null, { playerIds, carIds });

        } catch (e) {
            console.error("SetDrivingPlayerCoordinatesAndGetNears error:", e);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    GetAllOthersPlayersFromPlayerId(request: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId } = request;

            const player = this.players.get(playerId);
            if (!player) {
                console.warn(`Player with ID ${playerId} not found in memory.`);
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const world = this.worlds.get(player.world_id);
            const playerIds = world
                ? world.getOnlinePlayers()
                    .filter(p => p.id !== playerId)
                    .map(p => p.id)
                : [];

            cb(null, { playerIds });
        } catch (err) {
            console.error("GetAllOthersPlayersFromPlayerId error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    EnterCarAndGetOthers(req: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId, carId } = req;

            const player = this.players.get(playerId);
            if (!player) {
                console.warn(`Player with ID ${playerId} not found in memory.`);
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const world = this.worlds.get(player.world_id);

            const success = world?.enterCar(playerId, carId);
            if (!success) {
                cb({
                    code: grpc.status.ALREADY_EXISTS,
                    message: "Vehicle Already Owned"
                })
                return;
            }

            const playerIds = world
                ? world.getOnlinePlayers()
                    .filter(p => p.id !== playerId)
                    .map(p => p.id)
                : [];

            cb(null, { playerIds });

        } catch (e) {
            console.error("EnterCarAndGetOthers error:", e);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }

    LeaveCarAndGetOthers(req: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId, carId } = req;

            const player = this.players.get(playerId);
            if (!player) {
                console.warn(`Player with ID ${playerId} not found in memory.`);
                cb({ code: grpc.status.NOT_FOUND, message: "Player not found." });
                return;
            }

            const world = this.worlds.get(player.world_id);

            const success = world?.leaveCar(playerId, carId);
            if (!success) {
                cb({
                    code: grpc.status.ALREADY_EXISTS,
                    message: "Vehicle Already Owned"
                })
                return;
            }

            const playerIds = world
                ? world.getOnlinePlayers()
                    .filter(p => p.id !== playerId)
                    .map(p => p.id)
                : [];

            cb(null, { playerIds });

        } catch (e) {
            console.error("LeaveCarAndGetOthers error:", e);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    }
}


const playerManager = new PlayerManager();
export default playerManager;
