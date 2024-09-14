import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import neo4j, { Driver, ServerInfo, Session } from "neo4j-driver";
import { NextFunction, Request, Response } from "express";
const {
    LOGIN_DB_URI,
    NEO4J_CONNECTION_MAX_RETRIES
} = process.env;
const log = require("pino")();

export function getLoginDb(): Promise<Database> {
    const result = open({
        filename: LOGIN_DB_URI,
        driver: sqlite3.cached.Database,
    });
    return result;
}

export class Neo4jDriver {
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

export function Neo4jMiddleware(neo4jDriver: Neo4jDriver) {
    return (req: Request, _: Response, next: NextFunction) => {
        try {
            req.n4jDriver = neo4jDriver.getDriver()!;
        } catch (e) {
            log.error(e);
            process.exit(1);
        }
        next();
    }
};

export async function initializeNeo4J(NEO4J_URI: string, NEO4J_UNAME: string, NEO4J_PW: string, maxRetries?: string) : Promise<Neo4jDriver | undefined> {
    let retries = 0;
    let Neo4JInitSuccess = false;
    if (!NEO4J_URI || !NEO4J_UNAME || !NEO4J_PW) {
        log.error(
            `Missing Neo4J parameters: ${JSON.stringify({
                uri: NEO4J_URI,
                uname: NEO4J_UNAME,
                pw: !!NEO4J_PW,
            })}`
        );
        throw new Error("Missing Neo4J parameter");
    }
    let localNeo4JDriver: Neo4jDriver | undefined = undefined;
    while (retries < +(maxRetries ?? NEO4J_CONNECTION_MAX_RETRIES) && !Neo4JInitSuccess) {
        try {
            localNeo4JDriver = new Neo4jDriver(
                NEO4J_URI,
                NEO4J_UNAME,
                NEO4J_PW
            );
            let serverInfo = await localNeo4JDriver.getServerInfo();
            Neo4JInitSuccess = true;
            log.info("Local Neo4J connection established!");
            log.info(serverInfo);
        } catch (err) {
            log.error(err)
            log.warn(`Neo4J connection failed...\n${+(maxRetries ?? NEO4J_CONNECTION_MAX_RETRIES) - retries} retries remaining...`)
            retries++;
        }
    }
    return localNeo4JDriver;
}