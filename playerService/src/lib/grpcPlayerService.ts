import * as grpc from "@grpc/grpc-js";
import playerManager from "./PlayerManager";


const grpcPlayerService: grpc.UntypedServiceImplementation = {

    EnterPlayerWorldAndGetOthers({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.EnterPlayerWorldAndGetOthers(request, cb);
    },

    LeavePlayerWorldAndGetOthers({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.LeavePlayerWorldAndGetOthers(request, cb);
    },

    SetPlayerCoordinatesAndGetNears({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.SetPlayerCoordinatesAndGetNears(request, cb);
    },

    SetDrivingPlayerCoordinatesAndGetNears({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.SetDrivingPlayerCoordinatesAndGetNears(request, cb);
    },

    GetAllOthersPlayersFromPlayerId({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.GetAllOthersPlayersFromPlayerId(request, cb);
    },

    EnterCarAndGetOthers({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.EnterCarAndGetOthers(request, cb);
    },

    LeaveCarAndGetOthers({ request }: any, cb: grpc.sendUnaryData<any>) {
        playerManager.LeaveCarAndGetOthers(request, cb);
    }
};

export default grpcPlayerService;
