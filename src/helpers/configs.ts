import { config } from "mssql";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" })

export const LOGIN_TABLE = process.env.LOGIN_TABLE

export const SQL_CONFIG: config = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_URL! as string,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: process.env.ENV == "dev" ? false : true
    }
}