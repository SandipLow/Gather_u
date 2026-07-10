import { RtpCodecCapability, WorkerLogLevel, WorkerLogTag } from 'mediasoup/types';
import os from 'os'

const config = {
    PORT: parseInt(process.env.PORT || '3001'),

    redis: {
        uri: process.env.REDIS_URI ?? "redis://127.0.0.1:6379",
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
    },

    playerService: {
        restAddr: process.env.PLAYER_SERVICE_REST_ADDR ?? "http://localhost:4001" ,
        grpcAddr: process.env.PLAYER_SERVICE_GRPC_ADDR ?? "localhost:50051",
    },

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
            listenIps: [{ 
                ip: "0.0.0.0", 
                announcedIp: process.env.ANNOUNCED_IP ?? "127.0.0.1" 
            }],
            enableUdp:       true,
            enableTcp:       true,
            preferUdp:       true,
            initialAvailableOutgoingBitrate: 1000000,
        },
    }

};


if (
    !config.jwt.secretKey
) {
    console.error("JWT secret key not provided");
    process.exit(1);
}

export default config;