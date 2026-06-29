import { sign, verify } from "jsonwebtoken";

export const verifyJWT = (token: string) => {
    return verify(token, process.env.JWT_SECRET!);
};

export const generateJWT = (payload: object) => {
    return sign(payload, process.env.JWT_SECRET!, { expiresIn: "12h" });
};