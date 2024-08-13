import { Driver } from "neo4j-driver";
import Router, { Response, Request, NextFunction } from "express";

export const router = Router();

router
    .post('/', (req: Request, res: Response, next: NextFunction) =>{
        const n4jDriver: Driver = req.n4jDriver;
        
    })