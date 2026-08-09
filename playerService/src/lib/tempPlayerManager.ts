import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import Player from '../models/Player';

const OPEN_WORLD_ID = 'open_world'; // All guests join this world
const TEMP_PLAYER_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

class TempPlayerManager {
    private players: Map<string, Player> = new Map();

    createTemporaryPlayer(name: string, spritesheet: string): { player: Player, token: string } {
        const id = `tmp_${uuidv4()}`;
        const checkpoint = { x: 200, y: 200 };

        const player = new Player({
            id,
            name,
            spritesheet,
            world_id: OPEN_WORLD_ID,
            user_id: `guest_${id}`,
            wealth: 0,
            checkpoint,
            position: checkpoint,
            animation: 'idle',
            timestamp: Date.now()
        });

        this.players.set(id, player);

        setTimeout(() => {
            this.removeTemporaryPlayer(id);
        }, TEMP_PLAYER_EXPIRATION_MS);

        const token = jwt.sign({ playerId: id }, process.env.JWT_SECRET!, { expiresIn: '5m' });

        return { player, token };
    }

    getTemporaryPlayer(id: string): Player | undefined {
        return this.players.get(id);
    }

    removeTemporaryPlayer(id: string): void {
        this.players.delete(id);
        console.log(`Temporary player ${id} removed.`);
    }
}

export const tempPlayerManager = new TempPlayerManager();