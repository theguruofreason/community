import { fileURLToPath } from "url";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema } from "graphql";
import { readFileSync } from 'fs';
import path from "path";
import { ManagedTransaction, Session } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs : string = readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = buildSchema(typeDefs);
const root = {
    person(args: any, context: any, info: any) {
        const session: Session = context.n4jDriver.session();
        const argString = Object.entries(args).map(([key, val]) => { return `${key}: $${key}`}).join(", ");
        let cypher = `MATCH (p:Person {${argString}}) RETURN p;`;
        return session.executeRead((tx: ManagedTransaction) =>
            tx.run(cypher, args)).then((res) => {
                if (res.records.length < 1) return null;
                let person = {...res.records[0].toObject().p.properties};
                person.posts = this.posts({authorId: person.id}, context, info);
                return person;
            }
        );
    },
    posts(args: any, context: any, info: any) {
        const session: Session = context.n4jDriver.session();
        const {authorId, types} = args;
        const typesString: string = types ? ":" + types?.join(":") : "";
        let cypher: string = `MATCH (author {id: $authorId})-[r:AUTHORED]->(post${typesString})`
        if (args.before || args.after) {
            let whereClause: string[] = ["WHERE"];
            let clauses: string[] = [];
            if (args.before) {
                clauses.push("r.creationDateTime < $before");
            }
            if (args.after) {
                clauses.push("r.creationDateTime > $after");
            }
            cypher = [cypher, [whereClause, [clauses].join(" AND ")].join(" ")].join(" ");
        }
        cypher = [cypher, "RETURN post;"].join(" ");
        return session.executeRead((tx: ManagedTransaction) => 
            tx.run(cypher, args)).then((res) => {
                if (res.records.length < 1) return null;
                return res.records.flatMap((r) => {
                    return {
                        ...r.toObject().post.properties,
                        __typename: r.toObject().post.labels[0]
                    }
                })
            }
        );
    },
    authorTextPost(args: any, context: any, info: any) {
        const session: Session = context.n4jDriver.session();
        args.creationDateTime = new Date().getTime();
        if (!("deactivationDateTime" in args)) args.deactivationDateTime = null;
        if (!("activationDateTime" in args)) args.activationDateTime = args.creationDateTime;
        const cypher = `MATCH (p {id: $authorId})
        CREATE (tp:Post:TextPost {activationDateTime: $activationDateTime, deactivationDateTime: $deactivationDateTime, visibility: $visibility, content: $content})
        CREATE (p)-[r:AUTHORED {creationDateTime: $creationDateTime}]->(tp)
        RETURN tp, p, r;`
        return session.executeWrite((tx: ManagedTransaction) =>
            tx.run(cypher, args)).then((res) => {
                const {tp, p, r}= res.records[0].toObject();
                return {
                    ...tp.properties,
                    creationDateTime: r.properties.creationDateTime,
                    author: {
                        ...p.properties,
                        __typename: p.labels[0]
                    }
                };
            }
        );
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
