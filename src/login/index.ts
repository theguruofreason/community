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
import { generateToken, getTokenFromRequestCookies } from "auth";
import { IErrorWithStatus } from "errors";
import { LoginDBSchema, LoginSchema, LogoutSchema } from "share/types.js";
import { Database } from "better-sqlite3";
const { LOGIN_TABLE, TOKEN_MAX_AGE } = process.env;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { uname, pass } = LoginSchema.parse(req.body);
            const db: Database = getLoginDB();
            const login: LoginDBSchema = await validateLogin(uname, pass);
            req.log.info(`Successful login!`);
            const getRolesStatement = db.prepare<string, { roleID: number }>(`
                SELECT ur.roleID
                FROM userRole ur
                JOIN login l
                ON l.id = ur.userID
                WHERE l.uname = ?
                `);
            const getRolesResult: { roleID: number }[] | undefined =
                getRolesStatement.all(uname);
            if (getRolesResult === undefined) {
                const msg = `Failed to find roles for user: ${uname}`;
                throw new Error(msg);
            }
            const roles: number[] = getRolesResult.map(result => result.roleID);
            const token = generateToken({
                id: login.id,
                uname: login.uname,
                roles: roles,
            });
            const addTokenStatement = db.prepare(
                `UPDATE ${LOGIN_TABLE} SET token=? WHERE id=?`
            );
            const addTokenResult = addTokenStatement.run(token, login.id);
            if (addTokenResult.changes == 0) {
                console.error(`Failed to add token to login DB for ${uname}`);
                throw new Error("Login failure.");
            }
            const maxAge =
                (TOKEN_MAX_AGE ? +TOKEN_MAX_AGE : 10 * 24 * 60 * 60) * 1000;
            res.cookie("token", token, {
                secure: true,
                httpOnly: true,
                sameSite: "strict",
                maxAge: maxAge,
            });
            res.cookie("uname", uname, { secure: true });
            res.send();
        } catch (e: unknown) {
            next(e);
        }
    })
    .post("/out", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {uname} = LogoutSchema.parse(req.body);
            const token = getTokenFromRequestCookies(req);
            if (!token) {
                console.error(`Bad token on logout for user: ${uname}`);
                throw {status: 400, message: "No token"} as IErrorWithStatus;
            }
            const loginDB = getLoginDB();
            const deleteTokenStatement = loginDB.prepare<{uname: string, token: string}>(`UPDATE ${LOGIN_TABLE} SET token=NULL WHERE uname=$uname AND token=$token`);
            const deleteTokenResult = deleteTokenStatement.run({
                uname,
                token
            });
            if (deleteTokenResult.changes < 1) {
                console.error(`Failed to remove token from DB for user: ${uname}`);
                throw new Error("Failed to end session.");
            }
        } catch (e: unknown) {
            console.error(e);
            res.sendStatus(500);
            return;
        }
        res.sendStatus(200);
    });

async function validateLogin(
    uname: string,
    pass: string
): Promise<LoginDBSchema> {
    const loginDB: Database = getLoginDB();
    const stmt = loginDB.prepare<string, LoginDBSchema>(
        `SELECT * FROM ${LOGIN_TABLE} WHERE uname=?`
    );
    const result = stmt.get(uname);
    if (!result || !bcrypt.compareSync(pass, result.pass)) {
        throw {
            status: 401,
            message: `Incorrect username or password.`,
        } as IErrorWithStatus;
    }
    return result;
}
