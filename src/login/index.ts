/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import Router, { Response, Request } from "express";
import path from "path";
import { getLoginDb } from "db";
import bcrypt from "bcrypt";
import { pino as logger } from "pino";
const log = logger();
const { LOGIN_TABLE } = process.env;
export const router = Router();
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type LoginResult = {
    status: number;
    message: string;
};

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", async (req: Request, res: Response) => {
        const uname: string = req.body.uname;
        const pass: string = req.body.pass;
        if (!uname || !pass) {
            req.log.info(
                `Invalid request to login: ${JSON.stringify(req.body)}`
            );
            res.status(400).send("Username and password required.");
            return;
        }
        const result: LoginResult = await login(uname, pass);
        if (result.status == 200) {
            log.info(`Successful login: ${uname}`);
        }
        res.status(result.status).send(result.message);
    });

async function login(uname: string, pass: string): Promise<LoginResult> {
    const db = await getLoginDb();
    if (!db) {
        return {
            status: 500,
            message: "Failed to load login db",
        };
    }
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    const result = await db.get(stmt, {
        ":uname": uname,
    });
    if (!result) {
        return {
            status: 400,
            message: `Username ${uname} not registered...`,
        };
    }
    try {
        if (bcrypt.compareSync(pass, result.password)) {
            return {
                status: 200,
                message: `User ${uname} successfully logged in!`,
            };
        } else {
            return {
                status: 400,
                message: `Bad password!`,
            };
        }
    } catch (e) {
        return {
            status: 500,
            message: (e as Error).message,
        };
    }
}
