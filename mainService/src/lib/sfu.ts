import { Router } from "mediasoup/types";
import PlayerManager from "./playermanager";
import { createWorkerRouter } from "./worker";
import config from "./config";


export default class SFUManager {
    private mediasoupRouter: Router | null = null;

    constructor(
        private playerManager: PlayerManager
    ) {

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

            const player = this.playerManager.getPlayer(playerId);
            if (!player) {
                console.error(`Player with ID ${playerId} does not exist.`);
                return;
            }

            const sendTransport = await this.mediasoupRouter.createWebRtcTransport(config.mediasoup.transport);
            const recvTransport = await this.mediasoupRouter.createWebRtcTransport(config.mediasoup.transport);

            player.sendTransport = sendTransport;
            player.recvTransport = recvTransport;

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
            const player = this.playerManager.getPlayer(playerId);
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
            const player = this.playerManager.getPlayer(playerId);
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

        const consumerPlayer = this.playerManager.getPlayer(consumerPlayerId);
        const targetPlayer = this.playerManager.getPlayer(targetPlayerId);

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

        const player = this.playerManager.getPlayer(consumerPlayerId);
        if (!player) return;

        const consumer = player.consumers.get(producerPlayerId);
        if (!consumer) return;

        consumer.close();
        player.consumers.delete(producerPlayerId);
    }

}