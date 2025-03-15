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
import { getLoginDB } from "db";
import { SALT_ROUNDS } from "configs";
import { Driver } from "neo4j-driver";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { IErrorWithStatus } from "errors";
import { LoginSchema, UserInfoSchema, UserInfo } from "../share/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { LOGIN_TABLE } = process.env;
export const router = Router();

router
    .get("/", (_, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .post("/", async (req: Request, res: Response, next: NextFunction) => {
        const neo4jDriver: Driver = req.n4jDriver;
        const userInfo: UserInfo = UserInfoSchema.parse(req.body);
        if (!userInfo.uname || !userInfo.pass || !userInfo.name) {
            throw {
                status: 400,
                message: "Username, name, and password required.",
            } as IErrorWithStatus;
        }
        await register(userInfo, neo4jDriver);
        res.sendStatus(200);
    })
    .post("/u", async (req: Request, res: Response, next: NextFunction) => {
        const { uname, pass } = LoginSchema.parse(req.body);
        if (!uname || !pass) {
            throw {
                status: 400,
                message: "uname and pass required",
            } as IErrorWithStatus;
        }
        await unregister(uname, pass, req.n4jDriver);
        res.sendStatus(200);
    });

async function register(userInfo: UserInfo, n4jDriver: Driver): Promise<void> {
    const loginDB = getLoginDB();
    if (!loginDB) {
        throw new Error("Failed to load login db");
    }

    // Check if user already registered
    const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=?`;
    const result = loginDB.prepare<string, UserInfo>(stmt).get(userInfo.uname);
    if (result) {
        throw {
            status: 400,
            message: `uname ${userInfo.uname} already registered.`,
        } as IErrorWithStatus;
    }

    // Register user info with login DB and Neo4j DB
    const passwordHash: string = await bcrypt.hash(userInfo.pass, SALT_ROUNDS);

    const sqliteStatement = loginDB.prepare(
        `INSERT INTO ${LOGIN_TABLE} (uname, email, pass) VALUES (?, ?, ?)`
    );
    sqliteStatement.run(userInfo.uname, userInfo.email || null, passwordHash);
    const {pass, ...n4jUserInfo} = userInfo;
    const userInfoParams: string[] = Object.entries(n4jUserInfo).map((keyval) => {
        return `${keyval[0]}: $${keyval[0]}`;
    });
    // TODO: Move id generation to Neo4J using apoc pluggin
    userInfoParams.push("id: $id");
    await n4jDriver.executeQuery(
        `MERGE (p:Person {${userInfoParams.join(", ")}})`,
        { ...userInfoParams, id: uuidv4() }
    );
}

async function unregister(
    uname: string,
    pass: string,
    n4jDriver: Driver
): Promise<void> {
    const loginDB = getLoginDB();
    if (!loginDB) {
        throw new Error("Failed to load login db");
    }

    // Check if user is registered
    {
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=?`;
        const result = loginDB.prepare<string, UserInfo>(stmt).get(uname);
        if (!result) {
            throw {
                status: 400,
                message: `uname ${uname} not registered.`,
            } as IErrorWithStatus;
        }
        if (!bcrypt.compareSync(pass, result.pass)) {
            throw {
                status: 401,
                message: `Bad password for ${uname}.`,
            } as IErrorWithStatus;
        }
    }

    // Delete user info in DB
    const stmt = loginDB.prepare<string, null>(
        `DELETE FROM ${LOGIN_TABLE} WHERE uname=?`
    );
    stmt.run(uname),
        await n4jDriver.executeQuery(
            `MATCH (p:Person) WHERE p.uname = $uname DETACH DELETE p`,
            {
                uname: uname,
            }
        );
}
