/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { initializeNeo4J, Neo4jDriver, Neo4jMiddleware } from "db";
import { router } from "routes";
import cors from "cors";
import express, { Express, Request, Response } from "express";
const log = require("pino")();
import { ErrorHandler } from "errors";
const logger = require("pino-Http");
const {
    NEO4J_PW,
    NEO4J_URI,
    NEO4J_UNAME,
    PORT,
    ORIGIN,
} = process.env;

function loggerHandler(req: Request, res: Response) {
    logger(req, res);
} 

const app: Express = express();
const port = +(PORT ?? 3000);
const corsOptions = {
    origin: ORIGIN,
};

// Initialize Neo4J connection
const localNeo4JDriver: Neo4jDriver | undefined = await initializeNeo4J(NEO4J_URI, NEO4J_UNAME, NEO4J_PW)
if (!localNeo4JDriver) {
    log.error("Failed to connect to Neo4J database.");
    process.exit(1);
}

// Middleware
app.use(loggerHandler);
app.use(Neo4jMiddleware(localNeo4JDriver!));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Router
app.use("/", router);

// Error handling
app.use(ErrorHandler)

app.listen(port, () => {
    console.log(`[server]: Server is running at ${ORIGIN}:${port}`);
});
