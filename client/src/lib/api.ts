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

export const findWorldByName = async (search: string) => {
    const res = await fetch(`${API_URL}/world/search?q=${encodeURIComponent(search)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to search worlds with query: ${search}`);
    }

    return res.json();
}

export const createWorld = async (name: string, token: string) => {
    const res = await fetch(`${API_URL}/world`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
    });

    if (!res.ok) {
        throw new Error(`Failed to create world with name: ${name}`);
    }

    return res.json();
}


export const createPlayer = async (playerData: any, token: string) => {
    const res = await fetch(`${API_URL}/user/player`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(playerData),
    });

    if (!res.ok) {
        throw new Error(`Failed to create player with data: ${JSON.stringify(playerData)}`);
    }

    return res.json();
}

export const getRouterCapabilities = async () => {
    const res = await fetch(`${API_URL}/sfu/capabilities`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch router capabilities`);
    }

    return res.json();
}

export const createTransport = async (playerId: string) => {
    const res = await fetch(`${API_URL}/sfu/transport/${playerId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to create transport for player ${playerId}`);
    }

    return res.json();
}

export const connectTransport = async (playerId: string, direction: "send" | "recv", dtlsParameters: any) => {
    const res = await fetch(`${API_URL}/sfu/connect/${playerId}/${direction}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dtlsParameters }),
    });

    if (!res.ok) {
        throw new Error(`Failed to connect ${direction} transport for player ${playerId}`);
    }

    return res.json();
}

export const produce = async (playerId: string, kind: "audio" | "video", rtpParameters: any) => {
    const res = await fetch(`${API_URL}/sfu/produce/${playerId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind, rtpParameters }),
    });

    if (!res.ok) {
        throw new Error(`Failed to produce ${kind} for player ${playerId}`);
    }

    return res.json();
}

export const getStream = async (playerId: string, targetPlayerId: string, rtpCapabilities: any) => {
    const res = await fetch(`${API_URL}/sfu/getstream/${playerId}/${targetPlayerId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rtpCapabilities }),
    });

    if (!res.ok) {
        throw new Error(`Failed to get stream for player ${playerId}`);
    }

    return res.json();
}

export const removeStream = async (consumerPlayerId: string, targetPlayerId: string) => {
    const res = await fetch(`${API_URL}/sfu/removeStream/${consumerPlayerId}/${targetPlayerId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to remove stream for consumer player ${consumerPlayerId} and target player ${targetPlayerId}`);
    }

    return res.json();
}

