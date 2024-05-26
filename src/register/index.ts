import Router, { Response, Request } from "express";
import path from "path";
import sql from "mssql";
import { SQL_CONFIG } from "../helpers/configs"

export const router = Router();

router.get("/", (_, res: Response) => {
    res.sendFile(path.join(__dirname, "index.html"))
})
.post("/", async (req: Request, res: Response) => {
    const email: string | null = req.body.email;
    const uname: string = req.body.uname;
    const pass: string = req.body.pass;
    await register(uname, pass, res, email);
    if (res)
})

async function register(uname: string, pass: string, res: Response, email: string | null = null): Promise<void> {
    try {
        await sql.connect(SQL_CONFIG);
        const request = new sql.Request();
        request.query(`SELECT * FROM logins WHERE email='${email}' OR name='${uname}'`, (err, result) => {
            if (err) {
                console.error(err);
                return false;
            }
            if (result?.recordset[0]) {
                res.status(400).send("email or username already registered.")
                return;
            }
        })
        request.query(`INSERT INTO`)
    } catch (err) {
        console.error(err);
    }
}