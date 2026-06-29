import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import grpcPlayerService from "./grpcPlayerService";
import path from "path";


const PROTO_PATH = path.join(__dirname, "../../proto/player.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const proto  = grpc.loadPackageDefinition(pkgDef) as any;

const grpcServer = new grpc.Server();
grpcServer.addService(proto.player.PlayerService.service, grpcPlayerService);


export function startGrpcServer() {
    const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50051');
    grpcServer.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error('Failed to bind gRPC server:', err);
            return;
        }
        console.log(`gRPC server running on port ${port}`);
        grpcServer.start();
    });
}

export function stopGrpcServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        grpcServer.tryShutdown((err?: Error) => {
            if (err) return reject(err);
            resolve();
        });
    });
}
 