import esmock from "esmock";
import { describe, it, after } from "node:test";
import { Database, open } from "sqlite";
import { Request, Response } from "express";
import assert from "node:assert";
import sqlite3 from "sqlite3";
const { LOGIN_TABLE } = process.env

describe('Auth', async () => {
    const userID: number = Math.ceil(Math.random() * 1000);
    const userName: string = "testUser";
    const userPassword: string = "Us3rP4ssw0rd";
    const userRoles: number[] = [1,2];
    const userInfo = {id: userID, uname: userName, roles: userRoles};
    let loginDB: Database<sqlite3.Database, sqlite3.Statement> = await open({
        filename: ':memory:',
        driver: sqlite3.Database
    });
    const auth = await esmock('./index.ts', import.meta.url, {
        '../db.ts': {
            getLoginDB: () => loginDB
        }
    })
    // mock.method(db, 'getLoginDB', async () => loginDB);
    await loginDB.exec(`CREATE TABLE ${LOGIN_TABLE} (id INT NOT NULL, uname TEXT NOT NULL, pass TEXT NOT NULL, token TEXT NULL)`);
    await loginDB.exec(`INSERT INTO ${LOGIN_TABLE} (id, uname, pass) VALUES (${userID}, '${userName}', '${userPassword}')`);
    const query: string = "SELECT id, uname, pass, token FROM login WHERE id=:id";
    const {id, pass, uname, token} = await loginDB.get(query, {':id': userID});
    assert.strictEqual(id, userID);
    assert.strictEqual(uname, userName);
    assert.strictEqual(pass, userPassword);
    assert.strictEqual(token, null);
    after(() => {
        loginDB.close();
    })
    it('encrypts and decrypts a token', () => {
        const encryptedToken = auth.generateToken(userInfo);
        const token = auth.decipherToken(encryptedToken);
        assert.strictEqual(token, `${userInfo.id};${userInfo.uname};${userInfo.roles}`);
    })
    it('validates a token', async () => {
        const encryptedToken = auth.generateToken(userInfo);
        await loginDB.exec(`UPDATE ${LOGIN_TABLE} SET token='${encryptedToken}' WHERE id=${userID}`);
        const req = { headers: {cookie: `token=${encryptedToken}`} };
        auth.requireValidToken(req as Request, {} as Response, ((e) => {
            if (e) throw e;
        }))
    })
})