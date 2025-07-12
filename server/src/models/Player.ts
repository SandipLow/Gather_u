import WebSocket from 'ws'
import db from '../lib/db'
import { getDoc, doc, addDoc, collection, getDocs, updateDoc } from 'firebase/firestore'
import Strings from '../res/strings'
import User from './User'
import World from './World'

export default class Player {
    // Personal information
    id: string
    user_id: string
    world_id: string
    name: string
    wealth: number
    spritesheet: string
    checkpoint: { x: number, y: number }

    // Technical information
    socket: WebSocket | null

    constructor({ id, user_id, world_id, name, wealth, spritesheet, checkpoint }: PlayerData, socket: WebSocket | null) {
        this.id = id
        this.user_id = user_id
        this.world_id = world_id
        this.name = name
        this.wealth = wealth
        this.spritesheet = spritesheet
        this.checkpoint = checkpoint
        this.socket = socket
    }

    // Send a message to the player
    send(message: string) {
        if (!this.socket) return

        this.socket.send(message)
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
    getData() {
        return {
            id: this.id,
            user: this.getUser(),
            world: this.getWorld(),
            name: this.name,
            wealth: this.wealth,
            spritesheet: this.spritesheet,
            checkpoint: this.checkpoint
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
    exportData(): PlayerData {
        return {
            id: this.id,
            user_id: this.user_id,
            world_id: this.world_id,
            name: this.name,
            wealth: this.wealth,
            spritesheet: this.spritesheet,
            checkpoint: this.checkpoint
        }
    }


    // database operations
    static async create(playerData: Omit<PlayerData, "id">) {
        const res = await addDoc(collection(db, Strings.PLAYERS_COLLECTION), playerData)
        return new Player({ id: res.id, ...playerData }, null)
    }

    static async getAll() {
        const res = await getDocs(collection(db, Strings.PLAYERS_COLLECTION))
        return res.docs.map(doc => {
            const playerData = { id: doc.id, ...doc.data() } as PlayerData
            return new Player(playerData, null)
        })
    }

    static async get(id: string) {
        const res = await getDoc(doc(db, Strings.PLAYERS_COLLECTION, id))
        if (!res.exists()) return null

        const playerData = { id: res.id, ...res.data() } as PlayerData
        return new Player(playerData, null)
    }

    static async update(id: string, playerData: Partial<Omit<PlayerData, "id">>) {
        const res = await getDoc(doc(db, Strings.PLAYERS_COLLECTION, id))
        if (!res.exists()) return null

        await updateDoc(doc(db, Strings.PLAYERS_COLLECTION, id), playerData)
    }

}