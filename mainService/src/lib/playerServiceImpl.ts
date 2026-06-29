import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import PlayerService from "./playerService";

const PROTO_PATH = path.join(__dirname, "../../proto/player.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase:     true,
    longs:        String,
    enums:        String,
    defaults:     true,
    oneofs:       true,
});
const proto  = grpc.loadPackageDefinition(pkgDef) as any;
const playerServiceGRPCAddr = process.env.PLAYER_SERVICE_GRPC_ADDR ?? "localhost:50051";

// Shared persistent channel — one connection, multiplexed
const client = new proto.player.PlayerService(
    playerServiceGRPCAddr,
    grpc.credentials.createInsecure(),
    {
        "grpc.max_concurrent_streams": 1000,
        "grpc.keepalive_time_ms": 10000,
        "grpc.keepalive_timeout_ms": 5000,
        "grpc.keepalive_permit_without_calls": 1,
        "grpc.http2.max_pings_without_data": 0,
    }
);

// Promisify a single gRPC call
function call<T>(method: string, payload: object): Promise<T> {
    return new Promise((resolve, reject) =>
        client[method](payload, (err: grpc.ServiceError | null, res: T) =>
            err ? reject(err) : resolve(res)
        )
    );
}

export default class PlayerServiceClient implements PlayerService {

    async enterPlayerWorld(playerId: string): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("EnterPlayerWorld", { playerId });
        return res.playerIds;
    }

    async leavePlayerWorld(playerId: string): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("LeavePlayerWorld", { playerId });
        return res.playerIds;
    }

    async setPlayerCoordinates(playerId: string, x: number, y: number): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("SetPlayerCoordinates", { playerId, x, y });
        return res.playerIds;
    }
}