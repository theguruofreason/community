/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import Router, { Response, Request, NextFunction } from "express";
import path from "path";
import { getLoginDB } from "db";
import bcrypt from "bcrypt";
export const router = Router();
import { fileURLToPath } from "url";
import { generateToken } from "auth";
import { Database } from "sqlite";
import { IErrorWithStatus } from "errors";
import { LoginDBSchema, LoginSchema } from "share/types.js";
const { LOGIN_TABLE, TOKEN_MAX_AGE } = process.env;


const __dirname = path.dirname(fileURLToPath(import.meta.url));

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { uname, pass } = LoginSchema.parse(req.body);
            const db: Database = await getLoginDB();
            const login: LoginDBSchema = await validateLogin(uname, pass, db);
            req.log.info(`Successful login!`);
            const stmt = `SELECT roleID FROM ${LOGIN_TABLE} WHERE id=:userID`;
            const roles: number[] = (await db.all<{roleID: number}[]>(stmt, {
                ":userID": login.id
            })).map(result => result.roleID);
            const token = generateToken({
                id: login.id,
                uname: login.uname,
                roles: roles,
            });
            await db.run(`UPDATE ${LOGIN_TABLE} SET token=:token WHERE id=:userID`, {
                token: token,
                userID: login.id,
            })
            const maxAge = (TOKEN_MAX_AGE ? +TOKEN_MAX_AGE : (10 * 24 * 60 * 60)) * 1000;
            res.cookie('token', token, {
                secure: true,
                httpOnly: true,
                sameSite: "strict",
                maxAge: maxAge,
            });
            res.cookie('uname', uname, {secure: true});
        } catch (e: unknown) {
            next(e);
        }
    })
    .post("/out", (req: Request, res: Response, next: NextFunction) => {

        res.status(200);
        return;
    });

async function validateLogin(uname: string, pass: string, db: Database): Promise<LoginDBSchema> {
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    const result = await db.get<LoginDBSchema>(stmt, {
        ":uname": uname,
    })
    if (!result) {
        throw {
            status: 401,
            message: `Username ${uname} not registered...`,
        } as IErrorWithStatus;
    }
    if (!bcrypt.compareSync(pass, result.pass)) {
        throw {
            status: 401,
            message: `Incorrect password.`
        } as IErrorWithStatus; 
    }
    return result;
}
