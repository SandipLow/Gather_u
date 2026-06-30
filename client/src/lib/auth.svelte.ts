import { createPlayer, createWorld, fetchUserData, getPlayerToken, login, register } from "./api";

class AuthState {
    #token = $state<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    );
    #loading = $state<boolean>(false);
    #error = $state<string | null>(null);

    get token() { return this.#token; }
    get loading() { return this.#loading; }
    get error() { return this.#error; }
    get isAuthenticated() { return this.#token !== null; }


    #setToken(newToken: string | null) {
        this.#token = newToken;
        if (typeof window !== 'undefined') {
            if (newToken) {
                localStorage.setItem('auth_token', newToken);
            } else {
                localStorage.removeItem('auth_token');
            }
        }
    }

    async register(name: string, email: string, password: string): Promise<void> {
        this.#loading = true;
        this.#error = null;

        try {
            const data = await register(name, email, password);
            if (data.token) {
                this.#setToken(data.token);
            } else {
                throw new Error('No token found in response');
            }
        } catch (err: any) {
            this.#error = err.message || 'An unexpected error occurred';
        } finally {
            this.#loading = false;
        }
    }

    async login(email: string, password: string): Promise<void> {
        this.#loading = true;
        this.#error = null;

        try {
            const data = await login(email, password);
            
            if (data.token) {
                this.#setToken(data.token);
            } else {
                throw new Error('No token found in response');
            }
        } catch (err: any) {
            this.#error = err.message || 'An unexpected error occurred';
        } finally {
            this.#loading = false;
        }
    }

    async getUserData(): Promise<any> {
        if (!this.#token) {
            throw new Error('User not authenticated');
        }

        return fetchUserData(this.#token);
    }

    async getPlayerToken(playerId: string): Promise<string> {
        if (!this.#token) {
            throw new Error('User not authenticated');
        }

        const data = await getPlayerToken(playerId, this.#token);
        return data.playerToken;
    }

    async createPlayer(playerData: any) {
        if (!this.#token) {
            throw new Error('User not authenticated');
        }

        const data = await createPlayer(playerData, this.#token);
        return data;
    }


    async createWorld(newWorldName: string) {
        if (!this.#token) {
            throw new Error('User not authenticated');
        }

        const data = await createWorld(newWorldName, this.#token);
        return data;
    }

    logout() {
        localStorage.removeItem('auth_token');
        this.#setToken(null);
        this.#error = null;
    }
}

export const authState = new AuthState();

