import { getLoginDB} from "db";
import { test } from "node:test";
import { Database, open } from "sqlite";
import { decipherToken, generateToken, requireValidToken } from "./index.js";
import { Request, Response } from "express";
import assert from "node:assert";
import sqlite3 from "sqlite3";
import fs from "fs";
const { LOGIN_TABLE } = process.env

test('Auth', async (t) => {
    const userID: number = Math.ceil(Math.random() * 1000);
    const userName: string = "testUser";
    const userPassword: string = "Us3rP4ssw0rd";
    const userRoles: number[] = [1,2];
    let loginDB: Database<sqlite3.Database, sqlite3.Statement>;
    t.mock.fn(getLoginDB, async () => new Promise(() => loginDB))
    // mock.method(db, 'getLoginDB', async () => new Promise(() => loginDB));
    t.before(async () => {
        loginDB = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        })
        loginDB.exec(`CREATE TABLE ${LOGIN_TABLE} (id INT NOT NULL, uname TEXT NOT NULL, pass TEXT NOT NULL, token TEXT NULL)`);
        loginDB.exec(`INSERT INTO ${LOGIN_TABLE} (id, uname, pass) VALUES (${userID}, '${userName}', '${userPassword}')`);
        const query: string = "SELECT id, uname, pass, token FROM login WHERE id=:id";
        const {id, pass, uname, token} = await loginDB.get(query, {':id': userID});
        assert.strictEqual(id, userID);
        assert.strictEqual(uname, userName);
        assert.strictEqual(pass, userPassword);
        assert.strictEqual(token, null);
    })
    t.after(() => {
        loginDB.close();
        // fs.unlinkSync("login");
    })
    await t.test('mock db works', async () => {
        const db = await getLoginDB();
        const result = await db.get(`SELECT * FROM login`);
        console.log(result);
    })
    t.test('encrypts and decrypts a token', () => {
        const userInfo = {id: userID, uname: userName, roles: userRoles};
        const encryptedToken = generateToken(userInfo);
        const token = decipherToken(encryptedToken);
        assert.strictEqual(token, `${userInfo.id};${userInfo.uname};${userInfo.roles}`);
    })
    await t.test('validates a token', async () => {
        const userInfo = {id: userID, uname: userName, roles: userRoles};
        const encryptedToken = generateToken(userInfo);
        loginDB.exec(`UPDATE login SET token=${encryptedToken} WHERE id=${userID}`);
        const req = { headers: {cookie: `token=${encryptedToken}`} };
        requireValidToken(req as Request, {} as Response, ((e) => {
            if (e) throw e;
        }))
    })
})