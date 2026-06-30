import db, { Collections } from '../lib/db'
import { getDoc, doc, addDoc, collection, getDocs, updateDoc, where, query } from 'firebase/firestore'
import User from './User'
import World from './World'

export default class Player {
    id: string
    user_id: string
    world_id: string
    name: string
    wealth: number
    spritesheet: string
    checkpoint: { x: number, y: number }


    position: { x: number, y: number }
    animation: string
    timestamp: number

    constructor(playerData: OnlinePlayerData) {
        this.id = playerData.id
        this.user_id = playerData.user_id
        this.world_id = playerData.world_id
        this.name = playerData.name
        this.wealth = playerData.wealth
        this.spritesheet = playerData.spritesheet
        this.checkpoint = playerData.checkpoint

        this.position = playerData.position ?? playerData.checkpoint;
        this.animation = playerData.animation ?? "idle"
        this.timestamp = playerData.timestamp ?? Date.now();
    }

    // Get the user of the player
    async getUser() {
        return await User.get(this.user_id)
    }

    // Get the world of the player
    async getWorld() {
        return await World.get(this.world_id)
    }

    // Get the player data
    async getData() {
        return {
            id: this.id,
            user: await this.getUser(),
            world: await this.getWorld(),
            name: this.name,
            wealth: this.wealth,
            spritesheet: this.spritesheet,
            checkpoint: this.checkpoint,
            position: this.position,
            animation: this.animation,
            timestamp: this.timestamp
        }
    }

    // Get the player data without sensitive information
    getPublicData() {
        return {
            id: this.id,
            name: this.name,
            wealth: this.wealth,
            spritesheet: this.spritesheet,
            checkpoint: this.checkpoint
        }
    }

    // export the player data (For saving the player)
    exportData(): OnlinePlayerData {
        return {
            id: this.id,
            user_id: this.user_id,
            world_id: this.world_id,
            name: this.name,
            wealth: this.wealth,
            spritesheet: this.spritesheet,
            checkpoint: this.checkpoint,

            position: this.position,
            animation: this.animation,
            timestamp: this.timestamp
        }
    }

    // get distance from a given (x, y)
    getDistance(x: number, y: number) {
        const dx = this.position.x - x;
        const dy = this.position.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }


    // database operations
    static async create(playerData: Omit<PlayerData, "id">) {
        const res = await addDoc(collection(db, Collections.PLAYERS), playerData)
        return new Player({ id: res.id, ...playerData })
    }

    static async getAll() {
        const res = await getDocs(collection(db, Collections.PLAYERS))
        return res.docs.map(doc => {
            const playerData = { id: doc.id, ...doc.data() } as PlayerData
            return new Player(playerData)
        })
    }

    static async get(id: string) {
        const res = await getDoc(doc(db, Collections.PLAYERS, id))
        if (!res.exists()) return null

        const playerData = { id: res.id, ...res.data() } as PlayerData
        return new Player(playerData)
    }

    static async getByUserId(user_id: string) {
        const q = query(collection(db, Collections.PLAYERS), where("user_id", "==", user_id))
        const res = await getDocs(q)
        if (res.empty) return null

        const playerData = { id: res.docs[0].id, ...res.docs[0].data() } as PlayerData
        return new Player(playerData)
    }

    static async getByWorldId(world_id: string) {
        const q = query(collection(db, Collections.PLAYERS), where("world_id", "==", world_id))
        const res = await getDocs(q)
        if (res.empty) return []

        return res.docs.map(doc => {
            const playerData = { id: doc.id, ...doc.data() } as PlayerData
            return new Player(playerData)
        })
    }

    static async update(id: string, playerData: Partial<Omit<PlayerData, "id">>) {
        const res = await getDoc(doc(db, Collections.PLAYERS, id))
        if (!res.exists()) return null

        await updateDoc(doc(db, Collections.PLAYERS, id), playerData)
    }

}