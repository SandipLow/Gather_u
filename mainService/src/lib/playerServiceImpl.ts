import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import PlayerService, { EnterWorldResponse } from "./playerService";
import config from "./config";

const PROTO_PATH = path.join(__dirname, "../../proto/player.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase:     true,
    longs:        String,
    enums:        String,
    defaults:     true,
    oneofs:       true,
});
const proto  = grpc.loadPackageDefinition(pkgDef) as any;
const playerServiceGRPCAddr = config.playerService.grpcAddr;

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

    async enterPlayerWorldAndGetOthers(playerId: string): Promise<EnterWorldResponse> {
        const res = await call<EnterWorldResponse>("EnterPlayerWorldAndGetOthers", { playerId });
        return res;
    }

    async leavePlayerWorldAndGetOthers(playerId: string): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("LeavePlayerWorldAndGetOthers", { playerId });
        return res.playerIds;
    }

    async setPlayerCoordinatesAndGetNears(playerId: string, x: number, y: number, animation: string, timestamp: number): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("SetPlayerCoordinatesAndGetNears", { playerId, x, y, animation, timestamp });
        return res.playerIds;
    }

    async setDrivingPlayerCoordinatesAndGetNears(playerId: string, carId: string, x: number, y: number, angle: number, timestamp: number): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("SetDrivingPlayerCoordinatesAndGetNears", { playerId, carId, x, y, angle, timestamp });
        return res.playerIds;
    }

    async getAllOthersPlayersFromPlayerId(playerId: string): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("GetAllOthersPlayersFromPlayerId", { playerId });
        return res.playerIds;
    }

    async enterCarAndGetOthers(playerId: string, carId: string): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("EnterCarAndGetOthers", { playerId, carId });
        return res.playerIds;
    }

    async leaveCarAndGetOthers(playerId: string, carId: string): Promise<string[]> {
        const res = await call<{ playerIds: string[] }>("LeaveCarAndGetOthers", { playerId, carId });
        return res.playerIds;
    }
}
