import { collection, getDocs, where, query, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import db, { Collections } from "../lib/db";
import Player from "./Player";

export default class World {
    id: string;
    name: string;

    private onlinePlayers: {[player_id: string]: Player} = {};
    private grid: Map<string, Set<Player>> = new Map();
    private cellSize: number = 100;

    constructor({id, name}: WorldData) {
        this.id = id;
        this.name = name;
    }


    private getCellKey(x:number, y:number){
        const cx = Math.floor( x / this.cellSize );
        const cy = Math.floor( y / this.cellSize );

        return `${cx}:${cy}`;
    }

    private addToGrid(player:Player){
        const key = this.getCellKey(
            player.position.x,
            player.position.y
        );

        if(!this.grid.has(key)){
            this.grid.set(
                key,
                new Set()
            );
        }

        this.grid
            .get(key)!
            .add(player);
    }


    private removeFromGrid(player:Player){

        const key = this.getCellKey(
            player.position.x,
            player.position.y
        );

        const cell = this.grid.get(key);

        if(!cell) return;

        cell.delete(player);

        if(cell.size === 0){
            this.grid.delete(key);
        }
    }


    private updateGridPosition(
        player:Player,
        oldX:number,
        oldY:number
    ){
        const oldCell =
            this.getCellKey(
                oldX,
                oldY
            );

        const newCell =
            this.getCellKey(
                player.position.x,
                player.position.y
            );

        // still inside same cell
        if(oldCell === newCell)
            return;

        this.grid
            .get(oldCell)
            ?.delete(player);

        this.addToGrid(player);
    }


    // Get all players in the world
    async getAllPlayers() {
        // simulate a database query : "SELECT * FROM Players WHERE worldId = this.id"
        const res = await getDocs(query(
            collection(db, Collections.PLAYERS),
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

        // update the grid
        this.addToGrid(player);

        this.onlinePlayers[player.id] = player;
    }

    // remove a player from the world
    removePlayer(player: Player) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        // update the grid
        this.removeFromGrid(player);

        delete this.onlinePlayers[player.id];
    }

    // movement logic
    move(player: Player, x: number, y: number, animation: string, timestamp: number) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        // Update the player's current position and animation
        player.position = { x, y };
        player.animation = animation;
        player.timestamp = timestamp;

        // update the grid
        this.updateGridPosition(player, player.position.x, player.position.y);
    }

    // Get nearby players
    getNearbyPlayers(player: Player, radius: number) {
        const result: Player[] = [];

        const cellRadius = Math.ceil(radius / this.cellSize);

        const cx = Math.floor(player.position.x / this.cellSize);
        const cy = Math.floor(player.position.y / this.cellSize);

        for (let x = cx - cellRadius; x <= cx + cellRadius; x++) {
            for (let y = cy - cellRadius; y <= cy + cellRadius; y++) {
                const cell = this.grid.get(`${x}:${y}`);
                if (!cell) continue;

                for (const otherPlayer of cell) {
                    if (otherPlayer.id === player.id) continue;

                    const dx = otherPlayer.position.x - player.position.x;
                    const dy = otherPlayer.position.y - player.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= radius) {
                        result.push(otherPlayer);
                    }
                }
            }
        }

        return result;
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
            world.addPlayer(new Player(player));
        }

        return world;
    }


    // database operations
    static async create(worldData: Omit<WorldData, "id">) {
        const res = await addDoc(collection(db, Collections.WORLDS), worldData);
        return new World({id: res.id, ...worldData});
    }

    static async getAll() {
        const res = await getDocs(collection(db, Collections.WORLDS));
        return res.docs.map(doc => {
            return {id: doc.id, ...doc.data()} as WorldData;
        });
    }

    static async get(id: string) {
        const res = await getDoc(doc(db, Collections.WORLDS, id));
        if (!res.exists()) return null;

        const worldData = {id: res.id, ...res.data()} as WorldData;
        return new World(worldData);
    }

    static async update(id: string, worldData: Partial<Omit<WorldData, "id">>) {
        const res = await getDoc(doc(db, Collections.WORLDS, id));
        if (!res.exists()) return null;

        await updateDoc(doc(db, Collections.WORLDS, id), worldData);
    }




}