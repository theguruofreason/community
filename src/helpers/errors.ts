import { NextFunction, Request, Response } from "express";

export class ErrorWithStatus {
    status: number;
    message: string;

    constructor(status: number, message: string) {
        this.status = status;
        this.message = message;
    }
}

export const ErrorHandler = (err: Error | ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
    req.log.error(err);
    next(err);
}