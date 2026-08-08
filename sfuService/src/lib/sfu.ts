import {Consumer, Producer, Router, WebRtcTransport} from "mediasoup/types";
import { createWorkerRouter } from "./worker";
import config from "./config";

type PlayerConnects = {
    sendTransport?: WebRtcTransport;
    recvTransport?: WebRtcTransport;
    producers: Map<string, Producer>; // kind -> Producer
    consumers: Map<string, Consumer>; // producerId -> Consumer
}


export default class SFUManager {
    private mediasoupRouter: Router | null = null;
    private players: Map<string, PlayerConnects> = new Map();
    

    constructor() {
        createWorkerRouter()
            .then((router) => {
                this.mediasoupRouter = router;
            })
            .catch((error) => {
                console.error("Failed to create mediasoup router:", error);
                process.exit(1);
            });
    }


    getRouterCapabilities() {
        if (!this.mediasoupRouter) {
            console.error("Mediasoup router is not initialized.");
            return null;
        }
        return this.mediasoupRouter.rtpCapabilities;
    }


    async createTransport(playerId: string) {
        try {
            if (!this.mediasoupRouter) {
                console.error("Mediasoup router is not initialized.");
                return;
            }

            const sendTransport = await this.mediasoupRouter.createWebRtcTransport(config.mediasoup.transport);
            const recvTransport = await this.mediasoupRouter.createWebRtcTransport(config.mediasoup.transport);

            this.players.set(playerId, {
                sendTransport,
                recvTransport,
                producers: new Map(),
                consumers: new Map()
            });

            return {
                sendTransport: {
                    id: sendTransport.id,
                    iceParameters: sendTransport.iceParameters,
                    iceCandidates: sendTransport.iceCandidates,
                    dtlsParameters: sendTransport.dtlsParameters,
                },
                recvTransport: {
                    id: recvTransport.id,
                    iceParameters: recvTransport.iceParameters,
                    iceCandidates: recvTransport.iceCandidates,
                    dtlsParameters: recvTransport.dtlsParameters,
                },
            }
        } catch (error) {
            console.error(`Failed to create transport for player ${playerId}:`, error);
        }
    }

    async connectTransport(playerId: string, direction: "send" | "recv", dtlsParameters: any) {
        try {
            const player = this.players.get(playerId);
            if (!player) {
                console.error(`Player with ID ${playerId} does not exist.`);
                return;
            }

            const transport = direction === "send" ? player.sendTransport : player.recvTransport;
            if (!transport) {
                console.error(`Transport for direction ${direction} is not initialized for player ${playerId}.`);
                return;
            }

            await transport.connect({ dtlsParameters });

            return { direction, status: "ok" };
        } catch (error) {
            console.error(`Failed to connect ${direction} transport for player ${playerId}:`, error);
            return { direction, status: "error" };
        }
    }

    async produce(playerId: string, kind: "audio" | "video", rtpParameters: any) {
        try {
            const player = this.players.get(playerId);
            if (!player) {
                console.error(`Player with ID ${playerId} does not exist.`);
                return;
            }

            if (!player.sendTransport) {
                console.error(`Send transport is not initialized for player ${playerId}.`);
                return;
            }

            const producer = await player.sendTransport.produce({ kind, rtpParameters });
            player.producers.set(kind, producer);

            return { producerId: producer.id, kind };
        } catch (error) {
            console.error(`Failed to produce ${kind} for player ${playerId}:`, error);
        }
    }

    async getStream(
        consumerPlayerId: string,
        targetPlayerId: string,
        rtpCapabilities: any
    ) {
        if (!this.mediasoupRouter)
            throw new Error("Router not initialized");

        const consumerPlayer = this.players.get(consumerPlayerId);
        const targetPlayer = this.players.get(targetPlayerId);

        if (!consumerPlayer)
            throw new Error("Consumer player not found");

        if (!targetPlayer)
            throw new Error("Target player not found");

        if (!consumerPlayer.recvTransport)
            throw new Error("Receive transport missing");

        const consumers = [];

        for (const producer of targetPlayer.producers.values()) {

            if (
                !this.mediasoupRouter.canConsume({
                    producerId: producer.id,
                    rtpCapabilities
                })
            ) {
                continue;
            }

            const consumer = await consumerPlayer.recvTransport.consume({
                producerId: producer.id,
                rtpCapabilities,
                paused: false
            });

            consumerPlayer.consumers.set(
                producer.id,
                consumer
            );

            consumers.push({
                consumerId: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters
            });
        }

        return consumers;
    }

    async removeStream(
        consumerPlayerId: string,
        producerPlayerId: string
    ) {

        const player = this.players.get(consumerPlayerId);
        if (!player) return;

        const consumer = player.consumers.get(producerPlayerId);
        if (!consumer) return;

        consumer.close();
        player.consumers.delete(producerPlayerId);
    }

}