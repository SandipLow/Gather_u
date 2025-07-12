import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import userRouter from "./routes/user";
import { createServer } from "http";
import SocketServer from "./lib/websocket";


const app = express();
const PORT = process.env.PORT || 3000;

const server = createServer(app);


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use("/user", userRouter)

// Create and configure the WebSocket server
const socket = new SocketServer(server);

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});