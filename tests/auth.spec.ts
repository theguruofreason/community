import { getLoginDb } from "../dist/db.js";
import { decipherToken, generateToken, requireValidToken } from "../src/auth/index";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { Request, Response } from "express";
const { DatabaseSync } = require('node:sqlite');

describe('Auth', () => {
    const userID: number = Math.ceil(Math.random() * 1000);
    const userName: string = "testUser";
    const userPassword: string = "Us3rP4ssw0rd";
    const userRoles: number[] = [1,2];
    let loginDB: Database<sqlite3.Database, sqlite3.Statement>;
    jest.mock("../dist/db.js", () => {
        return {
            __esModele: true,
            getLoginDb: loginDB
        }
    });
    beforeAll(async () => {
        loginDB = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        })
        loginDB.exec("CREATE TABLE login (id INT NOT NULL, uname TEXT NOT NULL, pass TEXT NOT NULL, token TEXT NULL)");
        loginDB.exec(`INSERT INTO login (id, uname, pass) VALUES (${userID}, '${userName}', '${userPassword}')`);
    })
    test('ensure mock db works', async () => {
        const db = loginDB; //await getLoginDb();
        const query: string = "SELECT id, uname, pass, token FROM login WHERE id=:id";
        const {id, pass, uname, token} = await db.get(query, {':id': userID});
        expect(id).toBe(userID);
        expect(uname).toBe(userName);
        expect(pass).toBe(userPassword);
        expect(token).toBe(null);
    })
    test('encrypts and decrypts token', () => {
        const userInfo = {id: userID, uname: userName, roles: userRoles};
        const encryptedToken = generateToken(userInfo);
        const token = decipherToken(encryptedToken);
        expect(token).toBe(`${userInfo.id};${userInfo.uname};${userInfo.roles}`);
    })
    test('validates token', async () => {
        const userInfo = {id: userID, uname: userName, roles: userRoles};
        const encryptedToken = generateToken(userInfo);
        loginDB.exec(`UPDATE login SET token=${encryptedToken} WHERE id=${userID}`);
        const req = { headers: {cookie: `token=${encryptedToken}`} };
        requireValidToken(req as Request, {} as Response, ((e) => {
            if (e) throw e;
        }))
    })
})