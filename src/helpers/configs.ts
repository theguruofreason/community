import dotenv from "dotenv";

dotenv.config({ path: "../../.env" })
export const SALT_ROUNDS = 10;
export const LOGIN_TABLE = process.env.LOGIN_TABLE
