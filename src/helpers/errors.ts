import { NextFunction, Request, Response } from "express";
import { RequestWithLogger } from "./types.js";

export interface IErrorWithStatus extends Error {
    readonly status: number;
}

export const ErrorHandler = (err: Error | IErrorWithStatus, req: RequestWithLogger, res: Response, next: NextFunction): void => {
    req.log.error(err, err.message);
    if ('status' in err) {
        res.status(err.status);
    } else {
        res.status(500);
    }
    res.send(err.message);
}