import { Device } from "mediasoup-client";
import type { Consumer, Producer, Transport } from "mediasoup-client/types";
import * as api from "./api";


export default class SFUClient {
    private device = new Device();
    private sendTransport?: Transport;
    private recvTransport?: Transport;
    private videoProducer?: Producer;
    private audioProducer?: Producer;
    isReady: boolean = false;

    onRemoteStreamAdded: (pId: string, stream: MediaStream) => void = () => { };
    onRemoteStreamRemoved: (pId: string) => void = () => { };

    constructor(
        private stream: MediaStream,
        private playerId: string
    ) {
        this.#setup()
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

        this.#produce();

        this.isReady = true;
    }

    #produce() {
        if (!this.sendTransport) {
            console.error("[SFU] Send transport is not initialized.");
            return;
        }

        const videoTrack = this.stream.getVideoTracks()[0];
        const audioTrack = this.stream.getAudioTracks()[0];

        if (videoTrack) {
            this.sendTransport.produce({ track: videoTrack })
                .then((producer) => {
                    this.videoProducer = producer;
                })
                .catch((error) => {
                    console.error("[SFU] Error producing video:", error);
                });
        }

        if (audioTrack) {
            this.sendTransport.produce({ track: audioTrack })
                .then((producer) => {
                    this.audioProducer = producer;
                })
                .catch((error) => {
                    console.error("[SFU] Error producing audio:", error);
                });
        }
    }

    async requestRemoteStream(pId: string) {
        if (!this.recvTransport) return;

        const consumers = await api.getStream(this.playerId, pId, this.device.recvRtpCapabilities);
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

        this.onRemoteStreamAdded(pId,stream);
    }

    removeRemoteStream(pId: string) {
        api.removeStream(this.playerId, pId);
        this.onRemoteStreamRemoved(pId);
    }


    close() {
        this.sendTransport?.close();
        this.recvTransport?.close();
    }
}