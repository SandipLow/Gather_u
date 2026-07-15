import { Router } from 'express';
import config from '../lib/config';
import { verifyJWT } from '../lib/auth';

const router = Router();


const verifyToken = (req: any, res: any, next: any) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(403).json({ message: 'No token provided' });
        }
    
        verifyJWT(token);
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

router.use(verifyToken);


router.get('/config', async (req, res) => {
    res.json(config);
})

export default router;