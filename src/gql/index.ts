import { fileURLToPath } from "url";
import { createHandler, Handler } from "graphql-http";
import { buildSchema } from "graphql";
import { readFileSync } from 'fs';
import path from "path";
import { Driver } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs : string = readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = buildSchema(typeDefs);
const resolvers = {
    Query: {
        entity: undefined
    }
}

export const handler = (neo4jDriver: Driver) : Handler => {
    return createHandler({
        schema: schema,
        context: {
            neo4jDriver: neo4jDriver
        },
    })
}
