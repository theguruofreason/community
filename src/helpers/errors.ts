import { Request, Response } from "express";

export interface IErrorWithStatus extends Error {
    readonly status: number;
}

export const ErrorHandler = (
    err: Error | IErrorWithStatus,
    req: Request,
    res: Response,
): void => {
    req.log.error(err, err.message);
    if ("status" in err) {
        res.status(err.status);
    } else {
        res.status(500);
    }
    res.send(err.message);
};
