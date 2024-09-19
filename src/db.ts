import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import neo4j, { Driver, ServerInfo, Session } from "neo4j-driver";
import { NextFunction, Request, Response } from "express";
const {
    LOGIN_DB_URI,
    NEO4J_CONNECTION_MAX_RETRIES
} = process.env;
import { pino } from "pino";
const log = pino();

export function getLoginDb(): Promise<Database> {
    const result = open({
        filename: LOGIN_DB_URI,
        driver: sqlite3.cached.Database,
    });
    return result;
}

export class Neo4jDriver {
    private driver: Driver;
    private _serverInfo: ServerInfo | undefined;

    constructor(
        readonly uri: string,
        readonly uname: string,
        private pw: string,
    ) {
        this.driver = neo4j.driver(
            this.uri,
            neo4j.auth.basic(this.uname, this.pw)
        );
    }

    async establishConnection(maxRetries: number = 10, retryDelayms: number = 1000): Promise<boolean> {
        let retries: number = 0;
        let connectionEstablished: boolean = false;
        while (retries <= maxRetries) {
            connectionEstablished = await this.driver.getServerInfo().then((serverInfo) => {
                log.info("Local Neo4J connection established!");
                log.info(serverInfo);
                this._serverInfo = serverInfo;
                return true;
            })
            .catch((err) => {
                log.error(err)
                log.warn(`Neo4J connection failed...\n${maxRetries - retries} retries remaining...`)
                retries++;
                return false;
            });
            if (connectionEstablished) { break; }
        };
        return connectionEstablished;
    }

    get serverInfo(): ServerInfo | undefined {
        return this._serverInfo;
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
