import Router, { Response, Request } from "express";
import path from "path";
import sql from "mssql";
import { SQL_CONFIG, LOGIN_TABLE } from "../helpers/configs"

export const router = Router();

router.get("/", (_, res: Response) => {
    res.sendFile(path.join(__dirname, "index.html"))
})
.post("/", async (req: Request, res: Response) => {
    const email: string = req.body.email || "";
    const uname: string = req.body.uname;
    const pass: string = req.body.pass;
    await register(uname, pass, email, res);
    if (res.statusCode != 200) { res.send() };
})

async function register(uname: string, pass: string, email: string, res: Response): Promise<void> {
    try {
        await sql.connect(SQL_CONFIG);
        const request = new sql.Request();
        const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE email='@email' OR name='@uname'`;
        request.input('email', sql.NVarChar, email);
        request.input('uname', sql.NVarChar, uname);
        request.query(stmt, (err, result) => {
            if (err) {
                console.error(err);
                return;
            }
            if (result?.recordset[0]) {
                res.status(400).send("email or username already registered.")
                return;
            }
        })
        const insertReq = new sql.Request()
        const insertStmt = `INSERT INTO ${LOGIN_TABLE} VALUES (@uname, @pass)`;
        insertReq.input('uname', sql.NVarChar, uname);
        insertReq.input('pass', sql.NVarChar, pass);
        insertReq.query(insertStmt, (err, _) => {
            if (err) {
                console.error(err);
                return;
            }
        })
    } catch (err) {
        console.error(err);
    }
}