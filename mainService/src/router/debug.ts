import { Router } from 'express';
import config from '../lib/config';
import { verifyJWT } from '../lib/auth';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

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

router.get('/docs', (req, res) => {
    const filePath = path.join(__dirname, '../../docs.md');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading documentation file.');
        }
        const content = marked(data);
        res.render('docs', { content });
    });
});

router.use(verifyToken);


router.get('/config', async (req, res) => {
    res.json(config);
})

export default router;