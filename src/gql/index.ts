import { fileURLToPath } from "url";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema } from "graphql";
import { readFileSync } from 'fs';
import path from "path";
import { Driver } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs : string = readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = buildSchema(typeDefs);
const root = {
    person(args: any, context: any, info: any) {
        const n4jDriver: Driver = context.n4jDriver;
        const argString = Object.entries(args).map(([key, val]) => { return `${key}: "${val}"`}).join(", ");
        let cypherQuery = `MATCH (p {${argString}}) RETURN p;`
        return n4jDriver.executeQuery(cypherQuery).then(({records}) => {
            if (records.length < 1) { return null };
            return records[0].toObject().p.properties;
        })
    },
    hello() {
        return "Hello, world!";
    }
}

export const handler = createHandler({
    schema: schema,
    context: req => ({
        n4jDriver: req.raw.n4jDriver
    }),
    rootValue: root
})
