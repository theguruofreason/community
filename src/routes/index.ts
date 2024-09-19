import { Router, Request, Response } from "express";
import path from "path";
import { router as login } from "login";
import { router as register } from "register";
import { router as auth, requireValidToken } from "auth";
import { handler as graphQueryHandler } from "graphQuery";
import { ruruHTML } from "ruru/server";
import { fileURLToPath } from "url";
const { RUNTIME_ENVIRONMENT } = process.env;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const router = Router();

router
    .get("/", (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, "index.html"));
    })
    .use("/login", login)
    .use("/register", register)
    .use("/auth", auth)
    .use("/graphql", requireValidToken)
    .post("/graphql", (req: Request, res: Response) => graphQueryHandler(req.n4jDriver));
if (RUNTIME_ENVIRONMENT.toLowerCase() == "dev") {
    router
        .use("/ruru", (_req, res) => {
            res.type("html")
            res.end(ruruHTML({ endpoint: "/graphql" }))
        })
    };