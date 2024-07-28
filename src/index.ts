import express, { Express, Request, Response } from "express";
import cors from "cors";
import { router } from "./routes"

import pino from 'pino-http';

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
app.use('/', router);

app.listen(port, () => {
    console.log(`[server]: Server is running at ${process.env.ORIGIN}:${port}`);
})