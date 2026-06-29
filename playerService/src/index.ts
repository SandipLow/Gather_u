import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import userRouter from "./routes/user";
import { createServer } from "http";
import { startGrpcServer, stopGrpcServer } from "./lib/grpcServer";

const app = express();
const PORT = parseInt(process.env.PORT || "4001");

const server = createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("Hello World"));
app.use("/user", userRouter);

// Start both servers
startGrpcServer();
server.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));

// graceful shutdown on SIGTERM (Docker stop, k8s rolling deploy, etc.)
process.on("SIGTERM", async () => {
    console.log("SIGTERM received — shutting down gracefully...");
    await stopGrpcServer();
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
});

// handle Ctrl+C in local dev
process.on("SIGINT", async () => {
    console.log("SIGINT received — shutting down...");
    await stopGrpcServer();
    server.close(() => process.exit(0));
});