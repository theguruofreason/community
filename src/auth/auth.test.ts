import esmock from "esmock";
import { describe, it, after } from "node:test";
import { Request, Response } from "express";
import { generateToken, decipherToken } from "auth";
import Sqlite3 from "better-sqlite3";
import assert from "node:assert";
import { LoginDBSchema } from "share/types.js";
const { LOGIN_TABLE } = process.env;

describe("Auth", async () => {
    const userID: number = Math.ceil(Math.random() * 1000);
    const userName: string = "testUser";
    const userPassword: string = "Us3rP4ssw0rd";
    const userRoles: number[] = [1, 2];
    const userInfo = { id: userID, uname: userName, roles: userRoles };
    const loginDB: Sqlite3.Database = new Sqlite3(":memory:");
    const mockedAuth = await esmock("./index.ts", import.meta.url, {
        "../db.ts": {
            getLoginDB: () => loginDB,
        },
    });
    loginDB.exec(
        `CREATE TABLE ${LOGIN_TABLE} (id INT NOT NULL, uname TEXT NOT NULL, pass TEXT NOT NULL, token TEXT NULL)`,
    );
    loginDB.exec(
        `INSERT INTO ${LOGIN_TABLE} (id, uname, pass) VALUES (${userID}, '${userName}', '${userPassword}')`,
    );
    after(() => {
        loginDB.close();
    });
    it("generates a token", () => {
        assert(generateToken(userInfo));
    });
    it("encrypts and decrypts a token", () => {
        const encryptedToken = generateToken(userInfo);
        const token = decipherToken(encryptedToken);
        assert.strictEqual(
            token,
            `${userInfo.id};${userInfo.uname};${userInfo.roles}`,
        );
    });
    it("validates a token", async () => {
        const encryptedToken = generateToken(userInfo);
        await loginDB.exec(
            `UPDATE ${LOGIN_TABLE} SET token='${encryptedToken}' WHERE id=${userID}`,
        );
        const req = { headers: { cookie: `token=${encryptedToken}` } };
        mockedAuth.requireValidToken(req as Request, {} as Response, (e) => {
            if (e) throw e;
        });
    });
});
