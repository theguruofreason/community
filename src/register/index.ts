import Router, { Response, Request } from "express";
import path from "path";
import { getLoginDb } from "../helpers";
import dotenv from 'dotenv';
export const router = Router();

dotenv.config();
const LOGIN_TABLE = process.env.LOGIN_TABLE;
const DB_FAILURE =  {
            status: 500,
            message: `db failure...`
    }
router.get("/", (_, res: Response) => {
    res.sendFile(path.join(__dirname, "index.html"))
})
.post("/", async (req: Request, res: Response) => {
    const email: string = req.body.email || "";
    const uname: string = req.body.uname;
    const pass: string = req.body.pass;
    const registerResult : RegisterResult = await register(uname, pass, email);
    res.status(registerResult.status).send(registerResult.message);
})

type RegisterResult = {
    status: number,
    message: string
}

async function register(uname: string, pass: string, email: string) : Promise<RegisterResult> {
    const db = await getLoginDb();
    if (!db) { return {
        status: 500,
        message: "Failed to load login db"
    }; }
    try {
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        const result = await db.get(stmt, {
            ":uname": uname
        })
        if (result) {
            return {
                status: 400,
                message: `Username ${uname} already registered...`
            }
        }
    } catch (e) {
        console.log(e);
        return DB_FAILURE;
    }
        const insertStmt = `INSERT INTO ${LOGIN_TABLE} (uname, email, password) VALUES (:uname, :email, :password)`;
        try {
            db.run(insertStmt, {
                ':uname': uname,
                ':email': email,
                ':password': pass
            });
        } catch (e) {
            console.log(e);
            return DB_FAILURE;
        }
        return {
            status: 200,
            message: `User ${uname} registered!`
        }
}