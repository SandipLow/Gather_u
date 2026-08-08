import { RtpCodecCapability, WebRtcTransportOptions, WorkerLogLevel, WorkerLogTag } from 'mediasoup/types';
import os from 'os'

const config = {
    PORT: parseInt(process.env.PORT || '5001'),

    jwt: {
        secretKey: process.env.JWT_SECRET!,
    },

    mediasoup: {
        numWorkers: Object.keys(os.cpus()).length,
        
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: 'warn' as WorkerLogLevel,
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as WorkerLogTag[],
        },
    
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
            ] as RtpCodecCapability[],
        },

        transport: {
            listenInfos: [
                { 
                    protocol: "udp",
                    ip: "0.0.0.0", 
                    announcedAddress: process.env.ANNOUNCED_ADDRESS ?? "127.0.0.1"
                },
                {
                    protocol: "tcp",
                    ip: "0.0.0.0",
                    announcedAddress: process.env.ANNOUNCED_ADDRESS ?? "127.0.0.1"
                }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
        } as WebRtcTransportOptions,
    }
};

export default config;