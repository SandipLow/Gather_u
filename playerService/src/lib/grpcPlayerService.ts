import * as grpc from "@grpc/grpc-js";
import playerManager from "./PlayerManager";


const grpcPlayerService: grpc.UntypedServiceImplementation = {

    EnterPlayerWorld({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.EnterPlayerWorld(request, cb);
    },

    LeavePlayerWorld({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.LeavePlayerWorld(request, cb);
    },

    SetPlayerCoordinates({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.SetPlayerCoordinates(request, cb);
    },
};

export default grpcPlayerService;
