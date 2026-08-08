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

    sfuService: {
        restAddr: process.env.SFU_SERVICE_REST_ADDR ?? "http://localhost:5001",
    },

    jwt: {
        secretKey: process.env.JWT_SECRET!,
    }

};


if (
    !config.jwt.secretKey
) {
    console.error("JWT secret key not provided");
    process.exit(1);
}

export default config;