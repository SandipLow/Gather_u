import { Device } from "mediasoup-client";
import type { Consumer, Producer, Transport } from "mediasoup-client/types";
import * as api from "./api";


export default class SFUClient {
    private device = new Device();
    private sendTransport?: Transport;
    private recvTransport?: Transport;
    private videoProducer?: Producer;
    private audioProducer?: Producer;
    private setupPromise: Promise<void>;
    private activeRemoteStreams = new Set<string>();
    private remoteStreamRequests = new Map<string, Promise<boolean>>();
    isReady: boolean = false;

    onRemoteStreamAdded: (pId: string, stream: MediaStream) => void = () => { };
    onRemoteStreamRemoved: (pId: string) => void = () => { };

    constructor(
        private stream: MediaStream,
        private playerId: string
    ) {
        this.setupPromise = this.#setup();

        this.setupPromise
            .then(() => {
                console.log("[SFU] Setup completed successfully.");
            })
            .catch((error) => {
                console.error("[SFU] Setup failed:", error);
            });
    }

    async #setup() {
        const routerRtpCapabilities = await api.getRouterCapabilities();
        await this.device.load({ routerRtpCapabilities });

        const { sendTransport, recvTransport } = await api.createTransport(this.playerId);
        this.sendTransport = this.device.createSendTransport(sendTransport);
        this.recvTransport = this.device.createRecvTransport(recvTransport);

        this.sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
                await api.connectTransport(this.playerId, "send", dtlsParameters);
                callback();
            } catch (error) {
                errback(error as Error);
            }
        });

        this.recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            try {
                await api.connectTransport(this.playerId, "recv", dtlsParameters);
                callback();
            } catch (error) {
                errback(error as Error);
            }
        });

        this.sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
            try {
                const { producerId } = await api.produce(this.playerId, kind, rtpParameters);
                callback({ id: producerId });
            } catch (error) {
                errback(error as Error);
            }
        });

        await this.#produce();

        this.isReady = true;
    }

    async #produce() {
        if (!this.sendTransport) {
            console.error("[SFU] Send transport is not initialized.");
            return;
        }

        const videoTrack = this.stream.getVideoTracks()[0];
        const audioTrack = this.stream.getAudioTracks()[0];

        const pendingProduces: Promise<void>[] = [];

        if (videoTrack) {
            pendingProduces.push(
                this.sendTransport.produce({ track: videoTrack })
                    .then((producer) => {
                        this.videoProducer = producer;
                    })
                    .catch((error) => {
                        console.error("[SFU] Error producing video:", error);
                    })
            );
        }

        if (audioTrack) {
            pendingProduces.push(
                this.sendTransport.produce({ track: audioTrack })
                    .then((producer) => {
                        this.audioProducer = producer;
                    })
                    .catch((error) => {
                        console.error("[SFU] Error producing audio:", error);
                    })
            );
        }

        await Promise.all(pendingProduces);
    }

    async requestRemoteStream(pId: string) {
        if (this.activeRemoteStreams.has(pId)) {
            return true;
        }

        const existingRequest = this.remoteStreamRequests.get(pId);
        if (existingRequest) {
            return existingRequest;
        }

        const request = this.#requestRemoteStream(pId);
        this.remoteStreamRequests.set(pId, request);

        try {
            return await request;
        } finally {
            this.remoteStreamRequests.delete(pId);
        }
    }

    async #requestRemoteStream(pId: string): Promise<boolean> {
        try {
            await this.setupPromise;

            if (!this.recvTransport) {
                console.error("[SFU] Receive transport is not initialized.");
                return false;
            }

            const maxAttempts = 10;
            let consumers: Awaited<ReturnType<typeof api.getStream>> = [];

            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                consumers = await api.getStream(this.playerId, pId, this.device.recvRtpCapabilities);

                if (consumers.length > 0) {
                    break;
                }

                if (attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 300));
                }
            }

            if (consumers.length === 0) {
                console.warn(`[SFU] No consumable producers found for ${pId}.`);
                return false;
            }

            const stream = new MediaStream();

            for (const info of consumers) {
                const consumer = await this.recvTransport.consume({
                    id: info.consumerId,
                    producerId: info.producerId,
                    kind: info.kind,
                    rtpParameters: info.rtpParameters
                });

                stream.addTrack(consumer.track);
            }

            this.activeRemoteStreams.add(pId);
            this.onRemoteStreamAdded(pId, stream);
            return true;
        } catch (error) {
            console.error(`[SFU] Failed to request remote stream for ${pId}:`, error);
            return false;
        }
    }

    removeRemoteStream(pId: string) {
        api.removeStream(this.playerId, pId);
        this.activeRemoteStreams.delete(pId);
        this.onRemoteStreamRemoved(pId);
    }


    close() {
        this.sendTransport?.close();
        this.recvTransport?.close();
    }
}