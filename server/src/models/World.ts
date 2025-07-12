import { collection, getDocs, where, query, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../lib/db";
import Strings from "../res/strings";
import Player from "./Player";

export interface WorldDataWithPlayers extends WorldData {
    onlinePlayers: PlayerData[];
}

export default class World {
    id: string;
    name: string;

    private onlinePlayers: {[player_id: string]: Player} = {};

    constructor({id, name}: WorldData) {
        this.id = id;
        this.name = name;
    }

    // Get all players in the world
    async getPlayers() {
        // simulate a database query : "SELECT * FROM Players WHERE worldId = this.id"
        const res = await getDocs(query(
            collection(db, Strings.PLAYERS_COLLECTION),
            where("world_id", "==", this.id)
        ))

        return res.docs.map(doc => {
            return {id: doc.id, ...doc.data()} as PlayerData;
        });
    }

    // Get all online players in the world
    getOnlinePlayers() {
        return Object.values(this.onlinePlayers);
    }

    // Get the count of online players in the world
    getOnlinePlayersCount() {
        return Object.keys(this.onlinePlayers).length;
    }

    // join a player to the world
    addPlayer(player: Player) {
        // Check if the player is already in the world
        if (this.onlinePlayers[player.id]) return;
        // Check if the player belongs to the world
        if (player.world_id !== this.id) return;

        this.onlinePlayers[player.id] = player;
        this.emit(player, JSON.stringify({
            type: Strings.WS_ENTER_WORLD,
            payload: {
                player: {
                    id: player.id,
                    name: player.name,
                    wealth: player.wealth,
                    spritesheet: player.spritesheet,
                    checkpoint: player.checkpoint
                }
            }
        }));
    }

    // remove a player from the world
    removePlayer(player: Player) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        delete this.onlinePlayers[player.id];

        this.broadcast(JSON.stringify({
            type: Strings.WS_LEAVE_WORLD,
            payload: {
                player_id: player.id
            }
        }));
    }

    // emit a message to all players in the world except the player
    emit(player: Player, message: string) {
        for (const player_id in this.onlinePlayers) {
            const p = this.onlinePlayers[player_id];
            if (p.id === player.id) continue;

            p.send(message);
        };
    }
    
    // broadcast a message to all players in the world
    broadcast(message: string) {
        for (const player_id in this.onlinePlayers) {
            const p = this.onlinePlayers[player_id];
            p.send(message);
        };
    }

    // movement logic
    move(player: Player, x: number, y: number, animation: string, timestamp: number) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        this.emit(player, JSON.stringify({
            type: Strings.WS_MOVE,
            payload: {
                player_id: player.id,
                data: { x, y, animation, timestamp }
            },
        }));
    }

    // export the world data (For saving the world)
    exportData(): WorldDataWithPlayers {
        return {
            id: this.id,
            name: this.name,
            onlinePlayers: this.getOnlinePlayers().map(p => p.exportData())
        }
    }

    // create a world from data (For loading the world)
    static createWorld(data: WorldDataWithPlayers) {
        const world = new World({id: data.id, name: data.name});
        
        for (const player of data.onlinePlayers) {
            world.addPlayer(new Player(player, null));
        }

        return world;
    }


    // database operations
    static async create(worldData: Omit<WorldData, "id">) {
        const res = await addDoc(collection(db, Strings.WORLDS_COLLECTION), worldData);
        return new World({id: res.id, ...worldData});
    }

    static async getAll() {
        const res = await getDocs(collection(db, Strings.WORLDS_COLLECTION));
        return res.docs.map(doc => {
            return {id: doc.id, ...doc.data()} as WorldData;
        });
    }

    static async get(id: string) {
        const res = await getDoc(doc(db, Strings.WORLDS_COLLECTION, id));
        if (!res.exists()) return null;

        const worldData = {id: res.id, ...res.data()} as WorldData;
        return new World(worldData);
    }

    static async update(id: string, worldData: Partial<Omit<WorldData, "id">>) {
        const res = await getDoc(doc(db, Strings.WORLDS_COLLECTION, id));
        if (!res.exists()) return null;

        await updateDoc(doc(db, Strings.WORLDS_COLLECTION, id), worldData);
    }




}