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

// Initialize Neo4J connection
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
const localNeo4JDriver: Neo4JDriver = new Neo4JDriver(
    NEO4J_URI,
    NEO4J_UNAME,
    NEO4J_PW
);
let retries = 0;
let Neo4JInitSuccess = false;
while (retries < Number(NEO4J_CONNECTION_MAX_RETRIES)) {
    if (await localNeo4JDriver.initializeDriver()) {
        Neo4JInitSuccess = true;
        break;
    }
    retries += 1;
}
if (!Neo4JInitSuccess) {
    log.error("Failed to connect to Neo4J database.");
    process.exit(1);
}

const app: Express = express();
const port = PORT || 3000;
const corsOptions = {
    origin: ORIGIN,
};

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
