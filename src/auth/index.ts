/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>.
*/
import jwt from "jsonwebtoken";
import { NextFunction, Request, Response, Router } from "express";
const { TOKEN_SECRET, TOKEN_MAX_AGE , TOKEN_ISSUER } = process.env;

export const router = Router()

interface JWTPayload {
    uname: string,
    roles?: number
}

router
    .use("/", requireValidToken)
    .get("/", (req: Request, res: Response) => {
        res.send("Token is valid!");
    })

export function generateAccessToken(payload: JWTPayload, subject?: string) : string {
    const options: jwt.SignOptions = {
        expiresIn: TOKEN_MAX_AGE ?? '1800s',
        issuer: TOKEN_ISSUER,
    }
    if (subject) {
        options.subject = subject;
    }
    return jwt.sign(payload, TOKEN_SECRET, options);
}

export function requireValidToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const options = {
        maxAge: TOKEN_MAX_AGE ?? '1800s'
    }

    if (token == null) {
        res.redirect(401, '/login');
        return;
    }

    try {
        res.locals.token = jwt.verify(token, TOKEN_SECRET, options);
    } catch (e) {
        next(e);
    }

    next();
}

export function isTokenValid(authHeader: string | undefined) : boolean {
    if (!authHeader) {
        return false;
    }
    const encodedReqToken: string = authHeader.split(' ')[1];

    const decodedReqToken: jwt.JwtPayload | string = jwt.verify(encodedReqToken, TOKEN_SECRET, { issuer: TOKEN_ISSUER, maxAge: TOKEN_MAX_AGE });
    if (typeof decodedReqToken == 'string') {
        return false;
    }

    return true;
}
