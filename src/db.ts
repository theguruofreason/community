import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import neo4j, { Driver, ServerInfo, Session } from "neo4j-driver";
import pino from "pino";
import { NextFunction, Request, Response } from "express";
const {
    LOGIN_DB_URI
} = process.env;

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