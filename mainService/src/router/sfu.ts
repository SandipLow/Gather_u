import { Router } from "express";
import PlayerManager from "../lib/playermanager";
import SFUManager from "../lib/sfu";

export default class SFURouter {
    private router: Router = Router();

    constructor(
        private playerManager: PlayerManager,
        private sfuManager: SFUManager
    ) {

        this.router.get("/capabilities", this.getRouterCapabilities.bind(this));
        this.router.post("/transport/:playerId", this.createTransport.bind(this));
        this.router.post("/connect/:playerId/:direction", this.connectTransport.bind(this));
        this.router.post("/produce/:playerId", this.produce.bind(this));
        this.router.post("/getstream/:consumerPlayerId/:targetPlayerId", this.getStream.bind(this));
        this.router.post("/removeStream/:consumerPlayerId/:targetPlayerId", this.removeStream.bind(this));

    }

    getRouterCapabilities(req: any, res: any) {
        const capabilities = this.sfuManager.getRouterCapabilities();
        if (!capabilities) {
            res.status(500).json({ error: "Mediasoup router is not initialized." });
            return;
        }
        res.json(capabilities);
    }

    async createTransport(req: any, res: any) {
        const { playerId } = req.params;

        try {
            const transportInfo = await this.sfuManager.createTransport(playerId);
            if (!transportInfo) {
                res.status(404).json({ error: `Player with ID ${playerId} does not exist or router is not initialized.` });
                return;
            }
            res.json(transportInfo);
        } catch (error) {
            console.error("Error creating transport:", error);
            res.status(500).json({ error: "Failed to create transport." });
        }
    }

    async connectTransport(req: any, res: any) {
        const { playerId, direction } = req.params;
        const { dtlsParameters } = req.body;

        if (!["send", "recv"].includes(direction)) {
            res.status(400).json({ error: "Invalid direction. Must be 'send' or 'recv'." });
            return;
        }

        try {
            await this.sfuManager.connectTransport(playerId, direction as "send" | "recv", dtlsParameters);
            res.json({ status: "ok" });
        } catch (error) {
            console.error("Error connecting transport:", error);
            res.status(500).json({ error: "Failed to connect transport." });
        }
    }

    async produce(req: any, res: any) {
        const { playerId } = req.params;
        const { kind, rtpParameters } = req.body;

        if (!["audio", "video"].includes(kind)) {
            res.status(400).json({ error: "Invalid kind. Must be 'audio' or 'video'." });
            return;
        }

        try {
            const producerInfo = await this.sfuManager.produce(playerId, kind as "audio" | "video", rtpParameters);
            res.json(producerInfo);
        } catch (error) {
            console.error("Error producing stream:", error);
            res.status(500).json({ error: "Failed to produce stream." });
        }
    }

    async getStream(req: any, res: any) {
        const { consumerPlayerId, targetPlayerId } = req.params;
        const { rtpCapabilities } = req.body;

        try {
            const streamInfo = await this.sfuManager.getStream(consumerPlayerId, targetPlayerId, rtpCapabilities);
            if (!streamInfo) {
                res.status(404).json({ error: `Player with ID ${targetPlayerId} does not exist.` });
                return;
            }
            res.json(streamInfo);
        } catch (error) {
            console.error("Error getting stream:", error);
            res.status(500).json({ error: "Failed to get stream." });
        }
    }

    async removeStream(req: any, res: any) {
        const { consumerPlayerId, targetPlayerId } = req.params;

        try {
            await this.sfuManager.removeStream(consumerPlayerId, targetPlayerId);
            res.json({ status: "ok" });
        } catch (error) {
            console.error("Error removing stream:", error);
            res.status(500).json({ error: "Failed to remove stream." });
        }
    }

    getRouter() {
        return this.router;
    }
}