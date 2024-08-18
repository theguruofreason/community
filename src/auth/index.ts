import jwt from "jsonwebtoken";
import { NextFunction, Request, Response, Router } from "express";
const { TOKEN_SECRET, TOKEN_MAX_AGE , TOKEN_ISSUER } = process.env;

export const router = Router()

router
    .post("/", (req: Request, response: Response, next: NextFunction) => {
        const token = generateAccessToken(req.body.uname);
        response.json(token);
    })

export function generateAccessToken(uname: string, subject?: string) : string {
    var options: jwt.SignOptions = {
        expiresIn: TOKEN_MAX_AGE ?? '1800s',
        issuer: TOKEN_ISSUER,
    }
    if (subject) {
        options.subject = subject;
    }
    return jwt.sign({ uname: uname }, TOKEN_SECRET, options);
}

export function requireToken(req: Request, res: Response, options: jwt.VerifyOptions, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.redirect(401, '/login');
    }

    jwt.verify(token, TOKEN_SECRET, options);
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

// export function require