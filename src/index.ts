import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes"

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
let corsOptions = {
    origin: process.env.ORIGIN
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use('/', router);

app.listen(port, () => {
    console.log(`[server]: Server is running at ${process.env.ORIGIN}:${port}`);
})