import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import fetchUser from '../middlewares/fetchUser';

const router = Router();

router.get('/', fetchUser, async (req, res) => {
    try {
        const user_id = req.user!.id;
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
            email: newUser.email
        });

        return;

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
})


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
