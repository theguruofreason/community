import express, { Express } from "express";
import cors from "cors";
import { router } from "./routes"

import pino from 'pino-http';
const log = require('pino')();
import { Neo4JDriver } from './db';

const app: Express = express();
const port = process.env.PORT || 3000;
let corsOptions = {
    origin: process.env.ORIGIN
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({extended: true}))
if (process.env.PINO_LOG_HTTP) {
    app.use(pino());
}
if (!process.env.NEO4J_URI || !process.env.NEO4J_UNAME || !process.env.NEO4J_PW) {
    log.error(`Missing Neo4J parameters: ${JSON.stringify({
        uri: process.env.NEO4J_URI,
        uname: process.env.NEO4J_UNAME,
        pw: !!process.env.NEO4J_PW
    })}`);
    throw new Error("Missing Neo4J parameter")
}
const localNeo4JDriver: Neo4JDriver = new Neo4JDriver(process.env.NEO4J_URI, process.env.NEO4J_UNAME, process.env.NEO4J_PW);
let retries = 0;
let Neo4JInitSuccess = false;
while (retries < Number(process.env.NEO4J_CONNECTION_MAX_RETRIES)) {
    if (await localNeo4JDriver.initializeDriver()) {
        Neo4JInitSuccess = true;
        break;
    };
    retries += 1;
}
if (!Neo4JInitSuccess) {
    log.error("Failed to connect to Neo4J database.")
    process.exit(1);
}
app.locals.neo4j = localNeo4JDriver;

app.use('/', router);

app.listen(port, () => {
    console.log(`[server]: Server is running at ${process.env.ORIGIN}:${port}`);
})