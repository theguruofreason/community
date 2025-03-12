/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { Neo4jDriver, Neo4jMiddleware } from "db";
import { LoginDB } from "db";
import { router } from "routes";
import cors from "cors";
import express, { Express } from "express";
import { pino } from "pino";
import { ErrorHandler } from "errors";
import { pinoHttp as logger } from "pino-http";
const log = pino();
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

// Initialize LoginDB
LoginDB.get();

// Initialize Neo4J connection
const localNeo4JDriver: Neo4jDriver = new Neo4jDriver(
    NEO4J_URI,
    NEO4J_UNAME,
    NEO4J_PW,
);
const neo4jMaxRetries = +NEO4J_CONNECTION_MAX_RETRIES || 10;
if (!(await localNeo4JDriver.establishConnection(neo4jMaxRetries))) {
    log.error("Failed to connect to Neo4J database.");
    process.exit(1);
}

// Middleware
app.use(logger());
app.use(Neo4jMiddleware(localNeo4JDriver));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Router
app.use("/", router);

// Error handling
app.use(ErrorHandler);

app.listen(port, () => {
    console.log(`[server]: Server is running at ${ORIGIN}:${port.toString()}`);
});
