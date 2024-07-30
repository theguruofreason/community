import { Neo4JDriver } from "./db";
import { pino as logger } from "pino";
import { router } from "./routes";
import cors from "cors";
import express, { Express } from "express";
import pino from "pino-http";
import { NEO4J_DRIVER_NAME } from "./helpers/configs";
const log = logger();
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

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (PINO_LOG_HTTP) {
  app.use(pino());
}
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
app.set(NEO4J_DRIVER_NAME, localNeo4JDriver);

app.use("/", router);

app.listen(port, () => {
  console.log(`[server]: Server is running at ${ORIGIN}:${port}`);
});
