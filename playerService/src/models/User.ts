import { getDocs, collection, where, query, getDoc, doc, addDoc, updateDoc } from "firebase/firestore";
import db, { Collections } from "../lib/db";
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
            collection(db, Collections.PLAYERS),
            where("user_id", "==", this.id)
        ));

        return await Promise.all(res.docs.map(async (doc) => {
            const playerData = {id: doc.id, ...doc.data()} as PlayerData;
            const worldData = await new Player(playerData).getWorld();

            return {
                ...playerData,
                world: worldData
            };
        }));

    }

    // Get the user data
    async getData() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            players: await this.getPlayers()
        }
    }

    // database operations
    static async create(userData: Omit<UserData, "id">) {
        const res = await addDoc(collection(db, Collections.USERS), userData);
        return new User({id: res.id, ...userData});
    }

    static async getAll() {
        const res = await getDocs(collection(db, Collections.USERS));
        return res.docs.map(doc => {
            const userData = {id: doc.id, ...doc.data()} as UserData;
            return new User(userData);
        });
    }

    static async get(id: string) {
        const res = await getDoc(doc(db, Collections.USERS, id));
        if (!res.exists()) return null;

        const userData = {id: res.id, ...res.data()} as UserData;
        return new User(userData);
    }

    static async getByEmail(email: string) {
        const res = await getDocs(query(
            collection(db, Collections.USERS),
            where("email", "==", email)
        ));

        if (res.empty) return null;

        const userData = {id: res.docs[0].id, ...res.docs[0].data()} as UserData;
        return new User(userData);
    }

    static async update(id: string, userData: Partial<Omit<UserData, "id">>) {
        const res = await getDoc(doc(db, Collections.USERS, id));
        if (!res.exists()) return null;

        await updateDoc(doc(db, Collections.USERS, id), userData);
    }

    
}