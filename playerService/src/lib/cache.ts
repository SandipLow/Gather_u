import redis from "./redis";

class NetworkCache {
    async set(key: string, value: any, ttl = 600): Promise<void> {
        const serialized = JSON.stringify(value);
        await redis.set(key, serialized, "EX", ttl);
    }

    async get<T = any>(key: string): Promise<T | null> {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    }

    async delete(key: string): Promise<void> {
        await redis.del(key);
    }
}

export const cache = new NetworkCache();