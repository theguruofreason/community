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
import { getLoginDb } from "db";
import { parse as parseCookies } from "cookie";
const { TOKEN_SECRET, TOKEN_SECRET_IV, TOKEN_ISSUER, ENCRYPTION_METHOD, LOGIN_TABLE } = process.env;

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

export function generateToken({id, uname, roles}: TokenData) : string {
    const cipher = crypto.createCipheriv(ENCRYPTION_METHOD, key, encryptionIV);
    const data = [id, uname, roles].join(';');
    return Buffer.from(
        cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64');
}

export async function requireValidToken(req: Request, res: Response, next: NextFunction) : Promise<void> {
    const cookieString = req.headers?.cookie;
    if (!cookieString) {
        res.redirect(401, '/login');
        return;
    };
    const cookies = parseCookies(cookieString);
    const encryptedToken = cookies.token;
    if (!encryptedToken) {
        res.redirect(401, '/login');
        return;
    };

    const buff = Buffer.from(encryptedToken, 'base64')
    const decipher = crypto.createDecipheriv(ENCRYPTION_METHOD, key, encryptionIV)
    const token = decipher.update(buff.toString('utf8'), 'hex', 'utf8') + decipher.final('utf8');
    const id = token.split(';').find(tokenField => tokenField.startsWith('id'));
    try {
        const db = await getLoginDb();
        const tokenResult = await db.get<{token: string}>(`SELECT token FROM ${LOGIN_TABLE} where id=:userID`, { userID: id });
        if (!tokenResult) {
            console.error(`Unable to retrieve token from login DB: ${id}`);
            throw new Error("Unable to retrieve token from login DB.");
        }
        const dbToken = tokenResult.token;
    } catch (e) {
        next(e);
    };

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
