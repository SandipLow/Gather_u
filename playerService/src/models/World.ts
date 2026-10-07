import { collection, getDocs, where, query, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import db, { Collections } from "../lib/db";
import Player from "./Player";
import Car from "./Car";

type GameObject = Player | Car

export default class World {
    id: string;
    name: string;

    private onlinePlayers: {[player_id: string]: Player} = {};
    private cars: {[car_id: string]: Car} = {};
    private grid: Map<string, {
        players: Set<Player>,
        cars: Set<Car>
    }> = new Map();
    private cellSize: number = 100;

    constructor({id, name}: WorldData) {
        this.id = id;
        this.name = name;

        const cars = [
            new Car("1", "SUV.Magenta", {x: 200, y: 220, angle: 180}),
            new Car("2", "Sport.Black", {x: 420, y: 400, angle: 180}),
            new Car("3", "Super.Yellow", {x: 100, y: 200, angle: 270}),
        ]

        for (let car of cars) {
            this.cars[car.id] = car;
            this.addToGrid(car);
        }
    }


    private getCellKey(x:number, y:number){
        const cx = Math.floor( x / this.cellSize );
        const cy = Math.floor( y / this.cellSize );

        return `${cx}:${cy}`;
    }

    private getCoordinates(entity: GameObject): { x: number, y: number } {
        return entity.position;
    }

    private addToGrid(entity: GameObject) {
        const { x, y } = this.getCoordinates(entity);
        const key = this.getCellKey(x, y);

        if (!this.grid.has(key)) {
            this.grid.set(key, { players: new Set(), cars: new Set() });
        }

        const cell = this.grid.get(key)!;

        if (entity instanceof Player) {
            cell.players.add(entity);
        } else if (entity instanceof Car) {
            cell.cars.add(entity);
        }
    }

    private removeFromGrid(entity: GameObject) {
        const { x, y } = this.getCoordinates(entity);
        const key = this.getCellKey(x, y);
        const cell = this.grid.get(key);

        if (!cell) return;

        if (entity instanceof Player) {
            cell.players.delete(entity);
        } else if (entity instanceof Car) {
            cell.cars.delete(entity);
        }

        // Cleanup memory if cell is completely empty
        if (cell.players.size === 0 && cell.cars.size === 0) {
            this.grid.delete(key);
        }
    }

    private updateGridPosition(entity: GameObject, oldX: number, oldY: number) {
        const oldCell = this.getCellKey(oldX, oldY);
        const { x, y } = this.getCoordinates(entity);
        const newCell = this.getCellKey(x, y);

        if (oldCell === newCell) return; // Didn't cross cell boundaries

        // Remove from old cell
        const cell = this.grid.get(oldCell);
        if (cell) {
            if (entity instanceof Player) {
                cell.players.delete(entity);
            } else if (entity instanceof Car) {
                cell.cars.delete(entity);
            }

            if (cell.players.size === 0 && cell.cars.size === 0) {
                this.grid.delete(oldCell);
            }
        }

        // Add to new cell
        this.addToGrid(entity);
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

    // Get all cars in the world
    getCars(): Car[] {
        return Object.values(this.cars);
    }

    // Get a specific car
    getCar(carId: string): Car | undefined {
        return this.cars[carId];
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

        // Release any car the player is driving
        for (const car of Object.values(this.cars)) {
            if (car.isDriving === player.id) {
                car.isDriving = null;
            }
        }

        // update the grid
        this.removeFromGrid(player);

        delete this.onlinePlayers[player.id];
    }

    // movement logic
    move(player: Player, x: number, y: number, animation: string, timestamp: number) {
        // Check if the player is in the world
        if (!this.onlinePlayers[player.id]) return;

        const oldX = player.position.x;
        const oldY = player.position.y;

        // Update the player's current position and animation
        player.position = { x, y };
        player.animation = animation;
        player.timestamp = timestamp;

        // update the grid
        this.updateGridPosition(player, oldX, oldY);
    }

    // enter car
    enterCar(playerId: string, carId: string) {
        const player = this.onlinePlayers[playerId];
        const car = this.cars[carId];

        if (!car || !player || car.isDriving!==null) return false;

        car.isDriving = player.id
        return true
    }

    // leave car
    leaveCar(playerId: string, carId: string) {
        const player = this.onlinePlayers[playerId];
        const car = this.cars[carId];

        if (!car || !player || car.isDriving!==playerId) return false;

        car.isDriving = null
        return true
    }

    // move car
    moveCar(playerId: string, carId: string, x: number, y: number, angle: number, timestamp: number) {
        const player = this.onlinePlayers[playerId];
        const car = this.cars[carId];

        if (!car || !player || car.isDriving!==playerId) return false;

        const oldX = car.position.x;
        const oldY = car.position.y;
        car.position = { x, y, angle };
        car.timestamp = timestamp;
        this.updateGridPosition(car, oldX, oldY);

        player.position = { x, y };
        player.timestamp = timestamp;
        this.updateGridPosition(player, oldX, oldY);
        return true
    }

    // Get nearby Game Objects
    getNearby(
        x: number,
        y: number,
        radius: number,
        ignoreIds: Set<string> = new Set(),
    ) {
        const result: {
            players: Player[],
            cars: Car[]
        } = {
            players: [],
            cars: []
        };
        const cellRadius = Math.ceil(radius / this.cellSize);
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);

        for (let ix = cx - cellRadius; ix <= cx + cellRadius; ix++) {
            for (let iy = cy - cellRadius; iy <= cy + cellRadius; iy++) {
                const cell = this.grid.get(`${ix}:${iy}`);
                if (!cell) continue;

                for (const entity of [...cell.players, ...cell.cars]) {
                    if (ignoreIds.has(entity.id)) continue;

                    const dx = entity.position.x - x;
                    const dy = entity.position.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= radius) {
                        if (entity instanceof Player) {
                            result.players.push(entity);
                        }
                        else if (entity instanceof Car) {
                            result.cars.push(entity);
                        }
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

    static async searchByName(search: string) {
        const q = query(
            collection(db, Collections.WORLDS),
            where("name", ">=", search),
            where("name", "<=", search + "\uf8ff")
        );

        const res = await getDocs(q);

        const worlds = res.docs.map(doc => {
            return {id: doc.id, ...doc.data()} as WorldData;
        });

        return await Promise.all(worlds.map(async (worldData) => {
            const players = await Player.getByWorldId(worldData.id);
            return {
                ...worldData,
                playersCount: players.length,
                onlinePlayers: players.map(p => p.exportData())
            } as WorldDataWithPlayers;
        }));
    }


}
