/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
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
    .use("/auth", auth);
if (RUNTIME_ENVIRONMENT.toLowerCase() == "dev") {
    router.use("/ruru", (_req, res) => {
        res.type("html")
        res.end(ruruHTML({ endpoint: "/graphql" }))
    });
if (["prod", "test"].includes(RUNTIME_ENVIRONMENT.toLocaleLowerCase()))
    router.use("/graphql", requireValidToken);
};
router
    .all("/graphql", graphQueryHandler);