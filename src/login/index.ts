import Router, { Response, Request } from "express";
import path from "path";
import { getLoginDb } from "../db";
import bcrypt from "bcrypt";
import { pino as logger } from "pino";
const log = logger();
const { LOGIN_TABLE } = process.env;
import { NEO4J_DRIVER_NAME } from "../helpers/configs";
export const router = Router();

type LoginResult = {
  status: number;
  message: string;
};

router
  .get("/", (_, res: Response) => {
    res.sendFile(path.join(__dirname, "index.html"));
  })
  .post("/", async (req: Request, res: Response) => {
    const neo4jDriver = req.app.get(NEO4J_DRIVER_NAME);
    const uname: string = req.body.uname;
    const pass: string = req.body.pass;
    if (!uname || !pass) {
      req.log.info(`Invalid request to login: ${JSON.stringify(req.body)}`);
      res.status(400).send("Username and password required.");
      return;
    }
    log.info(`Successful login: ${uname}`);
    const result: LoginResult = await login(uname, pass);
    res.status(result.status).send(result.message);
  });

async function login(uname: string, pass: string): Promise<LoginResult> {
  const db = await getLoginDb();
  if (!db) {
    return {
      status: 500,
      message: "Failed to load login db",
    };
  }
  const stmt = `SELECT * FROM ${LOGIN_TABLE} WHERE uname=:uname`;
  const result = await db.get(stmt, {
    ":uname": uname,
  });
  if (!result) {
    return {
      status: 400,
      message: `Username ${uname} not registered...`,
    };
  }
  try {
    if (bcrypt.compareSync(pass, result.password)) {
      return {
        status: 200,
        message: `User ${uname} successfully logged in!`,
      };
    } else {
      return {
        status: 400,
        message: `Bad password!`,
      };
    }
  } catch (e) {
    return {
      status: 500,
      message: (e as Error).message,
    };
  }
}
