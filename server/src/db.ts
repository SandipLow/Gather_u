import { UserData } from "./models/User";
import { WorldData } from "./models/World";
import { PlayerData } from "./models/Player";

interface Database {
    Users: { [key: string]: UserData };
    Worlds: { [key: string]: WorldData };
    Players: { [key: string]: PlayerData };
}

const db: Database = {
    Users : {
        "user_0": {
            id: "user_0", 
            name: "Sandip",
            email: "sandiplow.official@gmail.com"
        },
        "user_1": {
            id: "user_1", 
            name: "Raj",
            email: "killraj123@gmail.com"
        },
        "user_2": {
            id: "user_2",
            name: "Ritik",
            email: "rittikdemon@gmail.com"
        }
    },

    Worlds: {
        "world_0": {
            id: "world_0", 
            name: "Kadaroad"
        },
        "world_1": {
            id: "world_1", 
            name: "Sand-Land"
        }
    },

    Players: {
        "player_0": {
            id: "player_0", 
            user_id: "user_0",
            world_id: "world_0",
            spritesheet: "GENERIC",
            name: "Sandip",
            wealth: 100,
            checkpoint: { x: 100, y: 100 }
        },
        "player_1": {
            id: "player_1", 
            user_id: "user_1",
            world_id: "world_0",
            spritesheet: "BARD",
            name: "Raj",
            wealth: 100,
            checkpoint: { x: 100, y: 100 }
        },
        "player_2": {
            id: "player_2", 
            user_id: "user_2",
            world_id: "world_1",
            spritesheet: "SOLDIER",
            name: "Ritik",
            wealth: 100,
            checkpoint: { x: 100, y: 100 }
        },
        "player_3": {
            id: "player_3", 
            user_id: "user_0",
            world_id: "world_1",
            spritesheet: "SCOUT",
            name: "Sandip",
            wealth: 100,
            checkpoint: { x: 100, y: 100 }
        },
        "player_4": {
            id: "player_4", 
            user_id: "user_1",
            world_id: "world_1",
            spritesheet: "DEVOUT",
            name: "Raj",
            wealth: 100,
            checkpoint: { x: 100, y: 100 }
        },
        "player_5": {
            id: "player_5", 
            user_id: "user_2",
            world_id: "world_0",
            spritesheet: "CONJURER",
            name: "Ritik",
            wealth: 100,
            checkpoint: { x: 100, y: 100 }
        }
    }

}

export default db;