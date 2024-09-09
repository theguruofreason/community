/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { Neo4jDriver, Neo4jMiddleware } from "db";
import { router } from "routes";
import cors from "cors";
import express, { Express } from "express";
import pino from "pino-http";
import { ErrorHandler } from "errors";
import { startNeo4JGraphQL } from "apollo_server";
const pinoHttp = pino();
const log = pinoHttp.logger;
const {
    NEO4J_PW,
    NEO4J_URI,
    NEO4J_UNAME,
    NEO4J_CONNECTION_MAX_RETRIES,
    PORT,
    ORIGIN,
} = process.env;


const app: Express = express();
const port = +(PORT ?? 3000);
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
let localNeo4JDriver: Neo4jDriver;
while (retries < +NEO4J_CONNECTION_MAX_RETRIES && !Neo4JInitSuccess) {
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
        startNeo4JGraphQL(localNeo4JDriver);
    } catch (err) {
        log.error(err)
        log.warn(`Neo4J connection failed...\n${+NEO4J_CONNECTION_MAX_RETRIES - retries} retries remaining...`)
        retries++;
    }
}
if (!Neo4JInitSuccess) {
    log.error("Failed to connect to Neo4J database.");
    process.exit(1);
}

app.use(Neo4jMiddleware(localNeo4JDriver!));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pino());

app.use("/", router);

app.use(ErrorHandler)

app.listen(port, () => {
    console.log(`[server]: Server is running at ${ORIGIN}:${port}`);
});
