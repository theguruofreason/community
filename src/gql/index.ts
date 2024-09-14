import { fileURLToPath } from "url";
import { createHandler, Handler } from "graphql-http";
import { buildSchema } from "graphql";
import { readFileSync } from 'fs';
import path from "path";
import { Driver } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs : string = await readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = await buildSchema(typeDefs);

export const handler: Handler = createHandler({
    schema: schema
})
