import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import neo4j, { Driver, Neo4jError, ServerInfo, Session } from "neo4j-driver";
import pino from "pino";
const {
    LOGIN_DB_URI
} = process.env;

const log = pino();

export async function getLoginDb(): Promise<Database | undefined> {
    try {
        const result = open({
            filename: LOGIN_DB_URI,
            driver: sqlite3.cached.Database,
        });
        return result;
    } catch (e) {
        console.log(`Failed to start sqlite database: ${e}`);
        log.error(e);
    }
}

export class Neo4JDriver {
    private driver: Driver;

    constructor(
        readonly uri: string,
        readonly uname: string,
        private pw: string
    ) {
        this.driver = neo4j.driver(
            this.uri,
            neo4j.auth.basic(this.uname, this.pw)
        );
    }

    async getServerInfo(): Promise<ServerInfo> {
        return await this.driver.getServerInfo();
    }

    getSession(): Session {
        return this.driver.session();
    }

    getDriver(): Driver {
        return this.driver;
    }
}