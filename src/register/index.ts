import bcrypt from "bcrypt";
import Router, { Response, Request } from "express";
import path from "path";
import { getLoginDb, DB_FAILURE, SALT_ROUNDS } from "../helpers";
import dotenv from 'dotenv';
export const router = Router();

dotenv.config();
const LOGIN_TABLE = process.env.LOGIN_TABLE;
router.get("/", (_, res: Response) => {
    res.sendFile(path.join(__dirname, "index.html"))
})
.post("/", async (req: Request, res: Response) => {
    const email: string = req.body.email || "";
    const uname: string = req.body.uname;
    const pass: string = req.body.pass;
    if (!uname || !pass) {
        res.status(400).send("Username and password required.");
        return;
    }
    const result: RegisterResult = await register(uname, pass, email);
    res.status(result.status).send(result.message);
})
.post("/u", async (req: Request, res: Response) => {
    const uname: string = req.body.uname;
    const result: RegisterResult = await unregister(uname);
    res.status(result.status).send(result.message);
})

type RegisterResult = {
    status: number,
    message: string
}

async function register(uname: string, pass: string, email: string) : Promise<RegisterResult> {
    const db = await getLoginDb();
    if (!db) {
        return {
            status: 500,
            message: "Failed to load login db"
        };
    }
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
    try {
        bcrypt.hash(pass, SALT_ROUNDS, function(err, hash) {
            if (err) {
                throw err;
            }
            const insertStmt = `INSERT INTO ${LOGIN_TABLE} (uname, email, password) VALUES (:uname, :email, :password)`;
            try {
                db.run(insertStmt, {
                    ':uname': uname,
                    ':email': email,
                    ':password': hash
                });
            } catch (e) {
                console.log(e);
                throw DB_FAILURE;
            }
        })
    } catch (e) {
        return (e == DB_FAILURE) ? DB_FAILURE : {
            status: 500,
            message: (e as Error).message
        }
    }
    return {
        status: 200,
        message: `User ${uname} registered!`
    }
}

async function unregister(uname: string) : Promise<RegisterResult> {
    const db = await getLoginDb();
    if (!db) {
        return {
            status: 500,
            message: "Failed to load login db"
        };
    }
    try {
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        const result = await db.get(stmt, {
            ":uname": uname
        })
        if (!result) {
            return {
                status: 400,
                message: `Username ${uname} not registered...`
            }
        }
    } catch (e) {
        console.log(e);
        return DB_FAILURE;
    }
    try {
        const stmt = `DELETE FROM ${LOGIN_TABLE} WHERE uname=:uname`;
        db.run(stmt, {
            ":uname": uname
        })
    } catch (e) {
        console.log(e);
        return DB_FAILURE;
    }
    return {
        status: 200,
        message: `User ${uname} unregistered.`
    }
}