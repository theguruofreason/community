import jwt from "jsonwebtoken";
import { NextFunction, Request, Response, Router } from "express";
const { TOKEN_SECRET, TOKEN_MAX_AGE , TOKEN_ISSUER } = process.env;

export const router = Router()

interface JWTPayload {
    uname: string,
    roles?: number
};

router
    .use("/", requireValidToken)
    .get("/", (req: Request, res: Response, next: NextFunction) => {
        res.send("Token is valid!");
    })

export function generateAccessToken(payload: JWTPayload, subject?: string) : string {
    var options: jwt.SignOptions = {
        expiresIn: TOKEN_MAX_AGE ?? '1800s',
        issuer: TOKEN_ISSUER,
    }
    if (subject) {
        options.subject = subject;
    }
    return jwt.sign(payload, TOKEN_SECRET, options);
}

export function requireValidToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const options = {
        maxAge: TOKEN_MAX_AGE ?? '1800s'
    }

    if (token == null) {
        return res.redirect(401, '/login');
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
