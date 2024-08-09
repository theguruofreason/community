/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { Neo4JDriver } from "db";
import { Logger, pino as pinoLogger } from "pino";
import { router } from "routes";
import cors from "cors";
import express, { Express } from "express";
import pino from "pino-http";
import "reflect-metadata";
const log: Logger = pinoLogger();
const {
    NEO4J_PW,
    NEO4J_URI,
    NEO4J_UNAME,
    NEO4J_CONNECTION_MAX_RETRIES,
    PORT,
    ORIGIN,
    PINO_LOG_HTTP,
} = process.env;


const app: Express = express();
const port = PORT || 3000;
const corsOptions = {
    origin: ORIGIN,
};

// Initialize Neo4J connection
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
let localNeo4JDriver: Neo4JDriver;
while (retries < +NEO4J_CONNECTION_MAX_RETRIES) {
    try {
        localNeo4JDriver = new Neo4JDriver(
            NEO4J_URI,
            NEO4J_UNAME,
            NEO4J_PW
        );
        let serverInfo = await localNeo4JDriver.getServerInfo();
        log.info("Local Neo4J connection established!");
        log.info(serverInfo);
    } catch (err) {
        log.error(err)
        log.warn(`Neo4J connection failed...\n${+NEO4J_CONNECTION_MAX_RETRIES - retries} retries remaining...`)
        retries += 1;
    }
}
if (!Neo4JInitSuccess) {
    log.error("Failed to connect to Neo4J database.");
    process.exit(1);
}

app.use((req, _, next) => {
    try {
        req.logger = log;
        req.n4jDriver = localNeo4JDriver.getDriver()!;
    } catch (e) {
        log.error(e);
        process.exit(1);
    }
    next();
});
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (PINO_LOG_HTTP == "true") {
    app.use(pino());
}

app.use("/", router);

app.listen(port, () => {
    console.log(`[server]: Server is running at ${ORIGIN}:${port}`);
});
