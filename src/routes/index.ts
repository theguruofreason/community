import { Router, Request, Response } from "express";
import path from "path";
import { router as login } from "../login";
import { router as register } from "../register";

export const router = Router();

router.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'index.html'), );
})
.use("/login", login)
.use("/register", register)