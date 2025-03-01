import { getLoginDb } from "../dist/db.js";
import { request, Request } from "express";
import { generateToken, requireValidToken } from "../src/auth/index.js";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
const { DatabaseSync } = require('node:sqlite');

let userID: number, userName: string, userPassword: string, loginDB: Database<sqlite3.Database, sqlite3.Statement>;

jest.mock("../dist/db.js", () => {
    return {
        __esModele: true,
        getLoginDb: loginDB
    }
});

describe('Auth', () => {
    beforeAll(async () => {
        loginDB = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        })
        userID = Math.ceil(Math.random() * 1000);
        userName = "testUser";
        userPassword = "Us3rP4ssw0rd";
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
    test('generates and validates token', async () => {
        const token = generateToken({id: userID, uname: userName, roles: [1,2]});
    })
})