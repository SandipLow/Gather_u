import cors from "cors";
import express from "express";
import db from "./db";
import User from "./models/User";
import { createServer } from "http";
import SocketServer from "./websocket";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const server = createServer(app);


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/user/:id", (req, res) => {
    const user_id = req.params.id;
    const userDbData = db.Users[user_id];

    if (!userDbData) {
        res.status(404).send("User not found");
        return;
    }

    const user = new User(userDbData);
    const userData = user.getData();

    res.send(userData);
});

// Create and configure the WebSocket server
const socket = new SocketServer(server);

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
