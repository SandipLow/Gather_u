import db from "../db";

export interface UserData {
    id: string;
    name: string;
    email: string;
}

export default class User {
    id: string;
    name: string;
    email: string;

    constructor({id, name, email}: UserData) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
    
    // Get all players of the user
    getPlayers() {
        // simulate a database query : "SELECT * FROM Players WHERE userId = this.id"
        return Object.values(db.Players)
                .filter(player => player.user_id === this.id)
                .map(player => ({
                    ...player,
                    world: db.Worlds[player.world_id]
                }))
    }

    // Get the user data
    getData() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            players: this.getPlayers()
        }
    }

    static getAll() {
        return Object.values(db.Users).map(user => new User(user));
    }

    static get(id: string) {
        return new User(db.Users[id]);
    }

    
}