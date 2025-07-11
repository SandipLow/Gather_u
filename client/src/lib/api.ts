const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const user_id = localStorage.getItem("user_id");


export const fetchUserData = async ()=> {
    if (!user_id) {
        throw new Error("User not logged in");
    }

    const res = await fetch(`${API_URL}/user/${user_id}`);
    return res.json();
}
