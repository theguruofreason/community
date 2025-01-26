/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import neo4j, { Driver, ServerInfo, Session } from "neo4j-driver";
import { NextFunction, Request, Response } from "express";
const {
    LOGIN_DB_URI
} = process.env;
import { pino } from "pino";
const log = pino();

export function getLoginDb(): Promise<Database> {
    return open({
        filename: LOGIN_DB_URI,
        driver: sqlite3.cached.Database,
    });
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

    async establishConnection(maxRetries = 10): Promise<boolean> {
        let retries = 0;
        let connectionEstablished = false;
        while (retries <= maxRetries) {
            connectionEstablished = await this.driver.getServerInfo().then((serverInfo) => {
                log.info("Local Neo4J connection established!");
                log.info(serverInfo);
                this._serverInfo = serverInfo;
                return true;
            })
            .catch((err: unknown) => {
                log.error(err)
                log.warn(`Neo4J connection failed...\n${(maxRetries - retries).toString()} retries remaining...`)
                retries++;
                return false;
            });
            if (connectionEstablished) { break; }
        }
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
            req.n4jDriver = neo4jDriver.getDriver();
        } catch (e) {
            log.error(e);
            process.exit(1);
        }
        next();
    }
}
