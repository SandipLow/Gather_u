import { Device } from "mediasoup-client";
import type { Consumer, Producer, Transport } from "mediasoup-client/types";


export default class SFUClient {
    private device = new Device();
    private sendTransport?: Transport;
    private recvTransport?: Transport;
    private producers = new Map<string, Producer>();
    private consumers = new Map<string, Consumer>();

    onRemoteStream: (playerId: string, stream: MediaStream) => void = () => {};
    onRemoveStream: (playerId: string) => void = () => {};

    constructor(private signal: (type: string, payload: any) => Promise<any>) {}

    async loadDevice(routerRtpCapabilities: any) {
        await this.device.load({ routerRtpCapabilities });
    }

    async joinCall(localStream: MediaStream) {
        await this.#createSendTransport(localStream);
        await this.#createRecvTransport();
    }

    async consumeProducer(producerId: string, playerId: string) {
        if (!this.recvTransport) return;

        const params = await this.signal("consume", {
            transportId:     this.recvTransport.id,
            producerId,
            rtpCapabilities: this.device.rtpCapabilities,
        });

        const consumer = await this.recvTransport.consume({
            id:            params.consumerId,
            producerId:    params.producerId,
            kind:          params.kind,
            rtpParameters: params.rtpParameters,
        });

        this.consumers.set(consumer.id, consumer);

        consumer.on("transportclose", () => this.consumers.delete(consumer.id));

        const stream = new MediaStream([consumer.track]);
        this.onRemoteStream(playerId, stream);
    }

    removeConsumer(consumerId: string) {
        this.consumers.get(consumerId)?.close();
        this.consumers.delete(consumerId);
    }

    leaveCall() {
        this.sendTransport?.close();
        this.recvTransport?.close();
        this.producers.clear();
        this.consumers.clear();
    }

    async #createSendTransport(localStream: MediaStream) {
        const params = await this.signal("createTransport", {});

        this.sendTransport = this.device.createSendTransport(params);

        this.sendTransport.on("connect", async ({ dtlsParameters }, resolve) => {
            await this.signal("connectTransport", {
                transportId: this.sendTransport!.id,
                dtlsParameters,
            });
            resolve();
        });

        this.sendTransport.on("produce", async ({ kind, rtpParameters }, resolve) => {
            const { producerId } = await this.signal("produce", {
                transportId: this.sendTransport!.id,
                kind,
                rtpParameters,
            });
            resolve({ id: producerId });
        });

        for (const track of localStream.getTracks()) {
            const producer = await this.sendTransport.produce({ track });
            this.producers.set(track.kind, producer);
        }
    }

    async #createRecvTransport() {
        const params = await this.signal("createTransport", {});

        this.recvTransport = this.device.createRecvTransport(params);

        this.recvTransport.on("connect", async ({ dtlsParameters }, resolve) => {
            await this.signal("connectTransport", {
                transportId: this.recvTransport!.id,
                dtlsParameters,
            });
            resolve();
        });
    }


}