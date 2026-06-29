import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import fetchUser from '../middlewares/fetchUser';
import Player from '../models/Player';

const router = Router();


// Get user data along with their players
router.get('/', fetchUser, async (req, res) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await User.get(user_id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const players = await user.getPlayers();
        const playerData = await Promise.all(players);

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            players: playerData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Get a player token for a specific player
router.get("/:playerId", fetchUser, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).send("Unauthorized");
            return;
        }
        
        const user = await User.get(req.user.id);
        if (!user) {
            res.status(404).send("User not found");
            return;
        }
        
        const playerId = req.params.playerId;
        const players = await user.getPlayers();

        // Check if the playerId belongs to the user
        const playerIds = players.map((player: any) => player.id);
        if (!playerIds.includes(playerId)) {
            res.status(403).send("Forbidden");
            return;
        }

        const playerToken = jwt.sign({ playerId, userId: user.id }, process.env.JWT_SECRET as string);
        res.json({ playerToken });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
})


// Get Public Player data
router.get("/:playerId/public", async (req, res) => {
    try {
        const playerId = req.params.playerId;
        const player = await Player.get(playerId);

        if (!player) {
            res.status(404).send("Player not found");
            return;
        }

        res.json(player.getPublicData());
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
})


// Create a new user
router.post("/", async (req, res) => {
    try {
        const {name, email, password} = req.body;
        if (!name || !email || !password) {
            res.status(400).send("Missing required fields");
            return;
        }

        // Check if user already exists
        const user = await User.getByEmail(email);
        if (user) {
            res.status(400).send("User already exists");
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            token: jwt.sign({ id: newUser.id }, process.env.JWT_SECRET!)
        });

        return;

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
})


// User login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.getByEmail(email);
        
        if (!user) {
            res.status(401).send("Invalid credentials");
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).send("Invalid credentials");
            return;
        }

        // generate token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!);

        res.json({ user, token });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
})


// Update user data
router.put("/", fetchUser, async (req, res) => {
    try {
        await User.update(req.user!.id, req.body);
        res.send("User updated successfully");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
});



export default router;
