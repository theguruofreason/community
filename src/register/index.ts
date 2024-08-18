/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import bcrypt from "bcrypt";
import Router, { Response, Request, NextFunction } from "express";
import path from "path";
import { getLoginDb } from "db";
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
    .post("/", async (req: Request, res: Response, next: NextFunction) => {
        const neo4jDriver: Driver = req.n4jDriver;
        const email: string = req.body.email || "";
        const uname: string = req.body.uname;
        const pass: string = req.body.pass;
        if (!uname || !pass) {
            throw {
                status: 400,
                message: "Username and password required."
            };
        }
        register(
            uname,
            pass,
            email,
            neo4jDriver
        ).then(() => {
            res.sendStatus(200);
        }).catch((e: any) => {
            next(e);
        });
    })
    .post("/u", async (req: Request, res: Response, next: NextFunction) => {
        const uname: string = req.body.uname;
        const pass: string = req.body.pass;
        if (!uname || !pass) {
            next({
                status: 400,
                message: "uname and pass required"
            });
            return;
        }
        unregister(uname, pass, req.n4jDriver).then(() => {
            res.sendStatus(200);
        }).catch((e: any) => {
            next(e);
            return;
        })
    });

async function register(
    uname: string,
    pass: string,
    email: string,
    n4jDriver: Driver
): Promise<void> {
    const loginDB = await getLoginDb();
    if (!loginDB) {
        throw new Error("Failed to load login db");
    }

    // Check if user already registered
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    const result = await loginDB.get(stmt, {
        ":uname": uname,
    });
    if (result) {
        throw {
            status: 400,
            message: `uname ${uname} already registered.`
        };
    }

    // Register user info with login DB and Neo4j DB
    const hash = await bcrypt.hash(pass, SALT_ROUNDS);
    
    const sqliteStatement: Statement = await loginDB.prepare(
        `INSERT INTO ${LOGIN_TABLE} (uname, email, pw) VALUES (:uname, :email, :password)`
    );
    await Promise.all([
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
}

async function unregister(uname: string, pass: string, n4jDriver: Driver): Promise<void> {
    const db = await getLoginDb();
    if (!db) {
        throw new Error("Failed to load login db")
    }

    const hash = bcrypt.hash(pass, SALT_ROUNDS);

    // Check if user is registered
    {
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        const result = await db.get(stmt, {
            ":uname": uname,
        });
        if (!result) {
            throw {
                status: 400,
                message: `uname ${uname} not registered.`
            };
        }
        if (result.pw != hash) {
            throw {
                status: 401,
                message: `Bad password for ${uname}.`
            };
        }
    }

    // Delete user info in DB
    const stmt = `DELETE FROM ${LOGIN_TABLE} WHERE uname=:uname AND pw=:password`;
    await Promise.all([
        db.run(stmt, {
            ":uname": uname,
            ":password": hash
        }),
        n4jDriver.executeQuery(
            `MATCH (p:Person) WHERE p.uname = $uname DETACH DELETE p`,
            {
                uname: uname
            }
        )
    ])
}
