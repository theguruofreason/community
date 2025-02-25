/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>.
*/
import { NextFunction, Request, Response, Router } from "express";
import crypto from "crypto";
import { TokenData } from "share/types.js";
const { TOKEN_SECRET, TOKEN_SECRET_IV, TOKEN_ISSUER, ENCRYPTION_METHOD } = process.env;

if (!TOKEN_SECRET || !TOKEN_SECRET_IV || !ENCRYPTION_METHOD) {
    throw new Error('Failed to load required env vars for token encryption.')
}

const key = crypto
    .createHash('sha512')
    .update(TOKEN_SECRET)
    .digest('hex')
    .substring(0,32);

const encryptionIV = crypto
    .createHash('sha512')
    .update(TOKEN_SECRET_IV)
    .digest('hex')
    .substring(0,16)

export const router = Router()

router
    .use("/", requireValidToken)
    .get("/", (req: Request, res: Response) => {
        res.send("Token is valid!");
    })

export function generateToken({uname, pass, roles}: TokenData) : string {
    const cipher = crypto.createCipheriv(ENCRYPTION_METHOD, key, encryptionIV);
    const data = [uname, pass, roles].join(';');
    return  Buffer.from(
        cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64');
}

export function requireValidToken(req: Request, res: Response, next: NextFunction) : void {
    const cookies = req.headers?.cookies;
    if (!cookies) {
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
