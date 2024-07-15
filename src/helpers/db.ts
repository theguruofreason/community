import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

export async function getLoginDb() : Promise<Database | undefined> {
    try {
        const result = open({
            filename: 'sqlite/login.db',
            driver: sqlite3.cached.Database
        })
        return result;
    } catch (e) {
        console.log(`Failed to start sqlite database: ${e}`)
    }
}