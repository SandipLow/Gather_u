import Redis from 'ioredis'

const [host, portText] = (process.env.REDIS_URI || 'localhost:6379').split(':');
const CACHE_TTL = 60;

const config = {
    host,
    port: parseInt(portText),
    ...(process.env.REDIS_USERNAME ? { username: process.env.REDIS_USERNAME } : {}),
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
}

const redis = new Redis(config);

redis.on('connect', () => {
    console.log(`Connected to Redis at ${config.host}:${config.port}`);
});

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

export default redis;