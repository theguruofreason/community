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
import { SALT_ROUNDS } from "configs";
import { Driver } from "neo4j-driver";
import { Statement } from "sqlite";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { IErrorWithStatus } from "errors";
import { LoginSchema, UserInfoSchema, UserInfo } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { LOGIN_TABLE } = process.env;
export const router = Router();

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", (req: Request, res: Response, next: NextFunction) => {
        const neo4jDriver: Driver = req.n4jDriver;
        const userInfo: UserInfo = UserInfoSchema.parse(req.body);
        if (!userInfo.uname || !userInfo.pass || !userInfo.name) {
            throw {
                status: 400,
                message: "Username, name, and password required."
            } as IErrorWithStatus;
        }
        register(
            userInfo,
            neo4jDriver
        ).then(() => {
            res.sendStatus(200);
        }).catch((e: unknown) => {
            next(e);
        });
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    .post("/u", (req: Request, res: Response, next: NextFunction) => {
        const { uname, pass } = LoginSchema.parse(req.body);
        if (!uname || !pass) {
            next({
                status: 400,
                message: "uname and pass required"
            });
            return;
        }
        unregister(uname, pass, req.n4jDriver).then(() => {
            res.sendStatus(200);
        }).catch((e: unknown) => {
            next(e);
            return;
        })
    });


async function register(
    userInfo: UserInfo,
    n4jDriver: Driver
): Promise<void> {
    const loginDB = await getLoginDb();
    if (!loginDB) {
        throw new Error("Failed to load login db");
    }

    // Check if user already registered
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    const result = await loginDB.get<UserInfo>(stmt, {
        ":uname": userInfo.uname,
    });
    if (result) {
        throw {
            status: 400,
            message: `uname ${userInfo.uname} already registered.`
        } as IErrorWithStatus;
    }

    // Register user info with login DB and Neo4j DB
    const hash: string = await bcrypt.hash(userInfo.pass, SALT_ROUNDS);
    
    const sqliteStatement: Statement = await loginDB.prepare(
        `INSERT INTO ${LOGIN_TABLE} (uname, email, pw) VALUES (:uname, :email, :password)`
    );
    const userInfoParams: string[] = Object.entries(userInfo).map( keyval => {
        return `${keyval[0]}: $${keyval[0]}`
    });
    // TODO: Move id generation to Neo4J using apoc pluggin
    userInfoParams.push("id: $id");
    await Promise.all([
        sqliteStatement.get({
            ":uname": userInfo.uname,
            ":email": userInfo.email,
            ":password": hash,
        }),
        n4jDriver.executeQuery(
            `MERGE (p:Person {${userInfoParams.join(", ")}})`,
            {...userInfo, ...{ id: uuidv4() }}
        ),
    ]);
}

async function unregister(uname: string, pass: string, n4jDriver: Driver): Promise<void> {
    const db = await getLoginDb();
    if (!db) {
        throw new Error("Failed to load login db")
    }

    // Check if user is registered
    {
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        const result = await db.get<UserInfo>(stmt, {
            ":uname": uname,
        });
        if (!result) {
            throw {
                status: 400,
                message: `uname ${uname} not registered.`
            } as IErrorWithStatus;
        }
        if (!(bcrypt.compareSync(pass, result.pass))) {
            throw {
                status: 401,
                message: `Bad password for ${uname}.`
            } as IErrorWithStatus;
        }
    }

    // Delete user info in DB
    const stmt = `DELETE FROM ${LOGIN_TABLE} WHERE uname=:uname`;
    await Promise.all([
        db.run(stmt, {
            ":uname": uname
        }),
        n4jDriver.executeQuery(
            `MATCH (p:Person) WHERE p.uname = $uname DETACH DELETE p`,
            {
                uname: uname
            }
        )
    ])
}
