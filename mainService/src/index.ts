import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { createServer } from "http";
import SocketServer from "./lib/websocket";
import PlayerServiceClient from "./lib/playerServiceImpl";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";


const app = express();
const PORT = parseInt(process.env.PORT || '3001');

const server = createServer(app);
const playerService = new PlayerServiceClient();


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use(
    "/user",
    createProxyMiddleware({
        target: `http://${process.env.PLAYER_SERVICE_REST_ADDR ?? "127.0.0.1:4001"}/user`,
        changeOrigin: true,
        on: {
            proxyReq: fixRequestBody,
        },
    })
);

app.use(
    "/world",
    createProxyMiddleware({
        target: `http://${process.env.PLAYER_SERVICE_REST_ADDR ?? "127.0.0.1:4001"}/world`,
        changeOrigin: true,
        on: {
            proxyReq: fixRequestBody,
        },
    })
);


// Create and configure the WebSocket server
const socket = new SocketServer(server, playerService);

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

function shutdown(signal: string) {
    console.log(`${signal} received — shutting down main service...`);
    server.close(() => {
        console.log("Main service HTTP server closed.");
        process.exit(0);
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));