/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import bcrypt from "bcrypt";
import Router, { Response, Request } from "express";
import path from "path";
import { getLoginDb, DB_FAILURE } from "db";
import { SALT_ROUNDS } from "../helpers/configs";
import { Driver } from "neo4j-driver";
import { Statement } from "sqlite";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { LOGIN_TABLE } = process.env;
export const router = Router();

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", async (req: Request, res: Response) => {
        const neo4jDriver: Driver = req.n4jDriver;
        const email: string = req.body.email || "";
        const uname: string = req.body.uname;
        const pass: string = req.body.pass;
        if (!uname || !pass) {
            res.status(400).send("Username and password required.");
            return;
        }
        const result: RegisterResult = await register(
            uname,
            pass,
            email,
            neo4jDriver
        );
        res.status(result.status).send(result.message);
    })
    .post("/u", async (req: Request, res: Response) => {
        const uname: string = req.body.uname;
        const result: RegisterResult = await unregister(uname);
        res.status(result.status).send(result.message);
    });

type RegisterResult = {
    status: number;
    message: string;
};

async function register(
    uname: string,
    pass: string,
    email: string,
    n4jDriver: Driver
): Promise<RegisterResult> {
    const loginDB = await getLoginDb();
    if (!loginDB) {
        return {
            status: 500,
            message: "Failed to load login db",
        };
    }
    try {
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        const result = await loginDB.get(stmt, {
            ":uname": uname,
        });
        if (result) {
            return {
                status: 400,
                message: `Username ${uname} already registered...`,
            };
        }
    } catch (e) {
        console.log(e);
        return DB_FAILURE;
    }
    try {
        bcrypt.hash(pass, SALT_ROUNDS, async function (err, hash) {
            if (err) {
                throw err;
            }
            const sqliteStatement: Statement = await loginDB.prepare(
                `INSERT INTO ${LOGIN_TABLE} (uname, email, pw) VALUES (:uname, :email, :password)`
            );
            try {
                const [sqliteResult, n4jResult] = await Promise.all([
                    sqliteStatement.get({
                        ":uname": uname,
                        ":email": email,
                        ":password": hash,
                    }),
                    n4jDriver.executeQuery(
                        "MERGE (p:Person {uname: $uname, email: $email})",
                        {
                            uname: uname,
                            email: email,
                        }
                    ),
                ]);
            } catch (e) {
                console.log(e);
                throw DB_FAILURE;
            }
        });
    } catch (e) {
        return e == DB_FAILURE
            ? DB_FAILURE
            : {
                  status: 500,
                  message: (e as Error).message,
              };
    }
    return {
        status: 200,
        message: `User ${uname} registered!`,
    };
}

async function unregister(uname: string): Promise<RegisterResult> {
    const db = await getLoginDb();
    if (!db) {
        return {
            status: 500,
            message: "Failed to load login db",
        };
    }
    try {
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
    } catch (e) {
        console.log(e);
        return DB_FAILURE;
    }
    try {
        const stmt = `DELETE FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        db.run(stmt, {
            ":uname": uname,
        });
    } catch (e) {
        console.log(e);
        return DB_FAILURE;
    }
    return {
        status: 200,
        message: `User ${uname} unregistered.`,
    };
}
