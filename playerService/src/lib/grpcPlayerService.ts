import * as grpc from "@grpc/grpc-js";
import Player from "../models/Player";
import World from "../models/World";
import { tempPlayerManager } from "./tempPlayerManager";

const worlds:  Map<string, World>  = new Map();
const players: Map<string, Player> = new Map();

// Helper — resolve player + world from in-memory maps, or cb with error
function resolvePlayerAndWorld(
    playerId: string,
    cb: grpc.sendUnaryData<any>
): { player: Player; world: World } | null {
    const player = players.get(playerId);
    if (!player) {
        cb({ code: grpc.status.NOT_FOUND, message: `Player ${playerId} not found in the world.` });
        return null;
    }
    const world = worlds.get(player.world_id);
    if (!world) {
        cb({ code: grpc.status.NOT_FOUND, message: `World ${player.world_id} not found.` });
        return null;
    }
    return { player, world };
}

const grpcPlayerService: grpc.UntypedServiceImplementation = {

    async EnterPlayerWorld({ request }: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId } = request;
            const isGuest = playerId.startsWith('tmp_');

            if (isGuest) {
                const player = tempPlayerManager.getTemporaryPlayer(playerId);
                if (!player) {
                    cb({ code: grpc.status.NOT_FOUND, message: `Guest player ${playerId} not found.` });
                    return;
                }

                players.set(playerId, player);

                const world_id = player.world_id;
                if (!worlds.has(world_id)) {
                    worlds.set(world_id, new World({ id: world_id, name: "Open World" }));
                }

                const world = worlds.get(world_id)!;
                world.addPlayer(player);

                const otherPlayers = world.getOnlinePlayers()
                    .filter(p => p.id !== playerId)
                    .map(p => p.id);

                cb(null, { playerIds: otherPlayers });
                return;

            }

            // Load player from DB if not already cached
            if (!players.has(playerId)) {
                const player = await Player.get(playerId);
                if (!player) {
                    cb({ code: grpc.status.NOT_FOUND, message: `Player ${playerId} not found.` });
                    return;
                }
                players.set(playerId, player);
            }
            
            const player = players.get(playerId)!;
            const { world_id: worldId } = player;

            // Load world into memory if not already cached
            if (!worlds.has(worldId)) {
                const world = await World.get(worldId);
                if (!world) {
                    players.delete(playerId); // roll back player registration
                    cb({ code: grpc.status.NOT_FOUND, message: `World ${worldId} not found.` });
                    return;
                }
                worlds.set(worldId, world);
            }

            const world = worlds.get(worldId)!;
            world.addPlayer(player);

            const otherPlayers = world.getOnlinePlayers()
                .filter(p => p.id !== playerId)
                .map(p => p.id);

            cb(null, { playerIds: otherPlayers });

        } catch (err) {
            console.error("EnterPlayerWorld error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    },

    LeavePlayerWorld({ request }: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId } = request;
            const isGuest = playerId.startsWith('tmp_');

            const resolved = resolvePlayerAndWorld(playerId, cb);
            if (!resolved) return;
            const { player, world } = resolved;

            world.removePlayer(player);
            players.delete(playerId);

            if (isGuest) {
                tempPlayerManager.removeTemporaryPlayer(playerId);
            }

            const otherPlayers = world.getOnlinePlayers().map(p => p.id);

            cb(null, { playerIds: otherPlayers });

        } catch (err) {
            console.error("LeavePlayerWorld error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    },

    SetPlayerCoordinates({ request }: any, cb: grpc.sendUnaryData<any>) {
        try {
            const { playerId, x, y, animation, timestamp } = request;

            const resolved = resolvePlayerAndWorld(playerId, cb);
            if (!resolved) return;
            const { player, world } = resolved;

            // Store 1FPS data only
            if (Date.now() - timestamp >= 1000) {
                world.move(player, x, y, animation, timestamp);
            }


            const nearby = world.getNearbyPlayers(player, 800)
                .filter(p => p.id !== playerId);

            cb(null, { playerIds: nearby.map(p => p.id) });

        } catch (err) {
            console.error("SetPlayerCoordinates error:", err);
            cb({ code: grpc.status.INTERNAL, message: "Internal server error." });
        }
    },
};

export default grpcPlayerService;