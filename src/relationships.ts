import { Driver } from "neo4j-driver";
import Router, { Response, Request } from "express";

export const router = Router();

router
    .post('/', (req: Request, res: Response) =>{
        const n4jDriver: Driver = req.n4jDriver;

    })