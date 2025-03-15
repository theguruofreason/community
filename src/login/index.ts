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
import { IErrorWithStatus } from "errors";
import { LoginDBSchema, LoginSchema } from "share/types.js";
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
            const getRolesStatement = db.prepare<number, { roleID: number[] }>(`
                SELECT role.roleName
                FROM role
                JOIN userRole ur
                ON role.id = ur.roleID
                JOIN login l
                ON l.id = ur.userID
                WHERE l.uname = ?
                `);
            const getRolesResult: { roleID: number[] } | undefined =
                getRolesStatement.get(login.id);
            if (getRolesResult === undefined) {
                const msg = `Failed to find roles for user: ${login.uname}`;
                throw new Error(msg);
            }
            const roles: number[] = getRolesResult.roleID;
            const token = generateToken({
                id: login.id,
                uname: login.uname,
                roles: roles,
            });
            const addTokenStatement = db.prepare(
                `UPDATE ${LOGIN_TABLE} SET token=? WHERE id=?`
            );
            addTokenStatement.run(token, login.id);
            const maxAge =
                (TOKEN_MAX_AGE ? +TOKEN_MAX_AGE : 10 * 24 * 60 * 60) * 1000;
            res.cookie("token", token, {
                secure: true,
                httpOnly: true,
                sameSite: "strict",
                maxAge: maxAge,
            });
            res.cookie("uname", uname, { secure: true });
        } catch (e: unknown) {
            next(e);
        }
    })
    .post("/out", (req: Request, res: Response, next: NextFunction) => {
        res.status(200);
        return;
    });

async function validateLogin(
    uname: string,
    pass: string
): Promise<LoginDBSchema> {
    const loginDB: Database = getLoginDB();
    const stmt = loginDB.prepare<string, LoginDBSchema>(
        `SELECT pass FROM ${LOGIN_TABLE} WHERE uname=?`
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
