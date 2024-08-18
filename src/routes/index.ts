import { Router, Request, Response } from "express";
import path from "path";
import { router as login } from "login";
import { router as register } from "register";
import { router as rel } from "relationships";
import { router as auth } from "auth";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const router = Router();

router
    .get("/", (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .use("/login", login)
    .use("/register", register)
    .use("/connect", rel)
    .use("/auth", auth);
