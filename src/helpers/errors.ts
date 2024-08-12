import { NextFunction, Request, Response } from "express";

export class ErrorWithStatus {
    status: number;
    message: string;

    constructor(status: number, message: string) {
        this.status = status;
        this.message = message;
    }
}

export const ErrorHandler = (err: Error | ErrorWithStatus, req: Request, res: Response, next: NextFunction): void => {
    req.log.error(err);
    if (err instanceof ErrorWithStatus) {
        res.status(err.status);
    } else {
        res.status(500);
    }
    res.send(err.message);
}