import Router, { Response, Request } from "express";
import path from "path";
import mssql from "mssql";

export const router = Router();

router.get("/", (_, res: Response) => {
    res.sendFile(path.join(__dirname, "index.html"))
})
.post("/", (req: Request, res: Response) => {
    return;
})