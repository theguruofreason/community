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
import { generateAccessToken } from "auth";
import { Database } from "sqlite";
import { IErrorWithStatus } from "errors";
import { LoginDBEntry, Roles } from "./types.js";
import { loginRequestSchema } from "./zod.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", (req: Request, res: Response, next: NextFunction) => {
        try {
            const { uname, pass } = loginRequestSchema.parse(req.body);
            getLoginDb().then(db => {
                validateLogin(uname, pass, db);
                req.log.info(`Successful login!`);
                const stmt = `SELECT roles FROM ${LOGIN_TABLE} WHERE uname=:uname`;
                db.get<{ roles: Roles }>(stmt, {
                    ":uname": uname
                }).then(result => {
                    const jwt: string = generateAccessToken({uname: uname, roles: result ? result.roles : 0});
                    res.json({
                        token: jwt
                    })
                }).catch((error: unknown) =>{
                    throw error;
                });
            }).catch((error: unknown) => {
                throw error
            });
        } catch (e: unknown) {
            next(e);
        }
    })
    .post("/out", (req: Request, res: Response, next: NextFunction) => {
        const authHeader: string | undefined = req.headers.authorization;
        const token: string = authHeader?.split(' ')[1];
        res.status(200);
        return;
    });

function validateLogin(uname: string, pass: string, db: Database): void {
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    db.get<LoginDBEntry>(stmt, {
        ":uname": uname,
    }).then(result => {
        if (!result) {
            throw {
                status: 401,
                message: `Username ${uname} not registered...`,
            } as IErrorWithStatus;
        }
        if (!bcrypt.compareSync(pass, result.pw)) {
            throw {
                status: 401,
                message: `Incorrect password.`
            } as IErrorWithStatus; 
        }
    }).catch((error: unknown) => {
        throw error;
    });
}
