import { getDocs, collection, where, query, getDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import db from "../lib/db";
import Strings from "../res/strings";
import Player from "./Player";

export default class User {
    id: string;
    name: string;
    email: string;
    password: string;

    constructor({id, name, email, password}: UserData) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
    }
    
    // Get all players of the user
    async getPlayers() {
        // simulate a database query : "SELECT * FROM Players WHERE userId = this.id"
        const res = await getDocs(query(
            collection(db, Strings.PLAYERS_COLLECTION),
            where("user_id", "==", this.id)
        ));

        return res.docs.map(async (doc) => {
            const playerData = {id: doc.id, ...doc.data()} as PlayerData;
            const worldData = await new Player(playerData, null).getWorld();

            return {
                ...playerData,
                world: worldData
            };
        });

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

    // database operations
    static async create(userData: Omit<UserData, "id">) {
        const res = await addDoc(collection(db, Strings.USERS_COLLECTION), userData);
        return new User({id: res.id, ...userData});
    }

    static async getAll() {
        const res = await getDocs(collection(db, Strings.USERS_COLLECTION));
        return res.docs.map(doc => {
            const userData = {id: doc.id, ...doc.data()} as UserData;
            return new User(userData);
        });
    }

    static async get(id: string) {
        const res = await getDoc(doc(db, Strings.USERS_COLLECTION, id));
        if (!res.exists()) return null;

        const userData = {id: res.id, ...res.data()} as UserData;
        return new User(userData);
    }

    static async getByEmail(email: string) {
        const res = await getDocs(query(
            collection(db, Strings.USERS_COLLECTION),
            where("email", "==", email)
        ));

        if (res.empty) return null;

        const userData = {id: res.docs[0].id, ...res.docs[0].data()} as UserData;
        return new User(userData);
    }

    static async update(id: string, userData: Partial<Omit<UserData, "id">>) {
        const res = await getDoc(doc(db, Strings.USERS_COLLECTION, id));
        if (!res.exists()) return null;

        await updateDoc(doc(db, Strings.USERS_COLLECTION, id), userData);
    }

    
}