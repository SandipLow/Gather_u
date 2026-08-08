import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { createServer } from "http";
import config from "./lib/config";
import SocketServer from "./lib/websocket";
import PlayerServiceClient from "./lib/playerServiceImpl";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import PlayerManager from "./lib/playermanager";
import debugRouter from "./router/debug";
import path from "path";


const app = express();
const PORT = config.PORT;

const server = createServer(app);
const playerService = new PlayerServiceClient();
const playerManager = new PlayerManager();

const createPrefixedProxy = (target: string, prefix: string) =>
    createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path) => `${prefix}${path}`,
        on: {
            proxyReq: fixRequestBody,
        },
    });

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'pages'));

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use(
    "/user",
    createPrefixedProxy(config.playerService.restAddr, "/user")
);

app.use(
    "/world",
    createPrefixedProxy(config.playerService.restAddr, "/world")
);

app.use(
    '/sfu',
    createPrefixedProxy(config.sfuService.restAddr, "/sfu")
)

app.use(
    "/debug",
    debugRouter
);


// Create and configure the WebSocket server
const socket = new SocketServer(playerService, playerManager, server);

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