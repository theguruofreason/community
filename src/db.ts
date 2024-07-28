import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import neo4j, { Driver, Neo4jError, Session } from "neo4j-driver";

const log = require('pino')();

export const DB_FAILURE = {
    status: 500,
    message: `db failure...`
}

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

export class Neo4JDriver {
    private driver: Driver | null = null;

    constructor(readonly uri: string, readonly uname: string, private pw: string) {}

    async initializeDriver(): Promise<boolean> {
        try {
            this.driver = neo4j.driver(
                this.uri,
                neo4j.auth.basic(this.uname, this.pw) 
            )
            const serverInfo = await this.driver.getServerInfo();
            log.info('Neo4J connection established');
            log.info(serverInfo);
        } catch (err) {
            if (typeof err === "string") {
                log.error(`Neo4J connection error: ${err}`);
            } else if (err instanceof Neo4jError) {
                log.error(`Neo4J connection error: ${err}\nCause:${err?.cause}`);
            } else {
                log.error(`Neo4J connection error: ${JSON.stringify(err)}`)
            }
            return false;
        }
        return true;
    }

    async getSession(): Promise<Session> {
        if (!this.driver) {
            log.error(`Attempted to get session before driver initialized: ${JSON.stringify(this)}`);
            throw new Error("Failed to get session.");
        }
        return this.driver.session();
    }


}
