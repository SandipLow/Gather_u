import { sign, verify } from "jsonwebtoken";
import config from "./config";

export const verifyJWT = (token: string) => {
    return verify(token, config.jwt.secretKey);
};

export const generateJWT = (payload: object) => {
    return sign(payload, config.jwt.secretKey, { expiresIn: "12h" });
};