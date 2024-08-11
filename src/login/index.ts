/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import Router, { Response, Request, NextFunction } from "express";
import path from "path";
import { getLoginDb } from "db";
import bcrypt from "bcrypt";
const { LOGIN_TABLE } = process.env;
export const router = Router();
import { fileURLToPath } from "url";
import { ErrorWithStatus } from "errors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type LoginResult = {
    status: number;
    message: string;
};

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", async (req: Request, res: Response, next: NextFunction) => {
        const uname: string = req.body.uname;
        const pass: string = req.body.pass;
        if (!uname || !pass) {
            req.log.info(`Invalid request to login`);
            res.sendStatus(400);
            return;
        }
        try {
            await login(uname, pass);
        } catch (e) {
            next(e)
        }
        req.log.info(`Successful login!`);
        res.sendStatus(200);
    });

async function login(uname: string, pass: string): Promise<void> {
    const db = await getLoginDb();
    if (!db) {
        throw new Error("Failed to load login db");
    };
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    const result = await db.get(stmt, {
        ":uname": uname,
    });
    if (!result) {
        throw new ErrorWithStatus(
            400,
            `Username ${uname} not registered...`,
        );
    }
    if (!bcrypt.compareSync(pass, result.password)) {
        throw new ErrorWithStatus(
            400,
            `Incorrect password.`
        )
    }
}
