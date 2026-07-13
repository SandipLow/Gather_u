import * as mediasoup from "mediasoup";
import { Worker, Router } from "mediasoup/types";
import config from "./config";

const worker :Array<{
    worker: Worker
    router: Router
}> = [];


let workerIndex = 0;

export const createWorkerRouter = async () => {
    const worker = await mediasoup.createWorker(config.mediasoup.worker);

    worker.on("died", (error) => {
        console.error("mediasoup worker has died", error);
        setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
    });

    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    const router = await worker.createRouter({ mediaCodecs });

    return router;

}