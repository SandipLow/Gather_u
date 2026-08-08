import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { createServer } from "http";
import config from "./lib/config";
import SFUManager from "./lib/sfu";
import SFURouter from "./router/sfu";

const app = express();
const PORT = config.PORT;

const server = createServer(app);
const sfuManager = new SFUManager();
const sfuRouter = new SFURouter(sfuManager);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("SFU Service is running");
});

app.use(
    '/sfu',
    sfuRouter.getRouter()
)

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`SFU Service running on port ${PORT}`);
});

function shutdown(signal: string) {
    console.log(`${signal} received — shutting down SFU service...`);
    server.close(() => {
        console.log("SFU service HTTP server closed.");
        process.exit(0);
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));