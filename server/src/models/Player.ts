import WebSocket from 'ws'
import db from '../db'

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

    constructor({id, user_id, world_id, name, wealth, spritesheet, checkpoint }: PlayerData, socket: WebSocket | null) {
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
    getUser() {
        return db.Users[this.user_id]
    }

    // Get the world of the player
    getWorld() {
        return db.Worlds[this.world_id]
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

    // create a player from data (For loading the player)
    static createPlayer(data: PlayerData, socket: WebSocket | null) {
        return new Player(data, socket)
    }

}