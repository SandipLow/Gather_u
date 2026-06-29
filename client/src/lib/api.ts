const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const fetchUserData = async (token: string) => {
    const res = await fetch(`${API_URL}/user/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    return res.json();
}

export const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/user/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        throw new Error('Login failed');
    }

    return res.json();
}

export const register = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
        throw new Error('Registration failed');
    }

    return res.json();
}

export const getPlayerData = async (playerId: string) => {
    const res = await fetch(`${API_URL}/user/${playerId}/public`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch player data for ${playerId}`);
    }

    return res.json();
}

export const getPlayerToken = async (playerId: string, token: string) => {
    const res = await fetch(`${API_URL}/user/${playerId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch player token for ${playerId}`);
    }

    return res.json();
}
