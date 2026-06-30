import { Router } from "express";
import World from "../models/World";
import fetchUser from "../middlewares/fetchUser";

const worldRouter = Router();


worldRouter.get("/search", async (req, res) => {
    const search = req.query.q as string;

    if (!search) {
        res.json({ worlds: [] });
        return;
    }

    try {
        const worlds = await World.searchByName(search);
        res.json(worlds);
    } catch (error) {
        res.status(500).json({ error: "Failed to search worlds" });
    }
});

worldRouter.post("/", fetchUser, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        res.status(400).json({ error: "World name is required" });
        return;
    }

    try {
        const newWorld = await World.create({ name });
        res.status(201).json(newWorld.exportData());
    } catch (error) {
        res.status(500).json({ error: "Failed to create world" });
    }
})


export default worldRouter;