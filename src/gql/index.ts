import { fileURLToPath } from "url";
import { createHandler } from "graphql-http/lib/use/express";
import { readFileSync } from 'fs';
import path from "path";
import { ManagedTransaction, Session } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
import { makeExecutableSchema } from "graphql-tools";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function lookupPerson(args: any, session: Session) {
    const argString = Object.keys(args).map((key) => { return `${key}: $${key}`}).join(", ");
    let cypher = `MATCH (p:Person {${argString}}) RETURN p;`;
    return session.executeRead((tx: ManagedTransaction) =>
        tx.run(cypher, args)).then((res) => {
            if (res.records.length < 1) return null;
            return {
                ...res.records[0].toObject().p.properties,
            };
        }
    );
}

function getPostsByAuthorId(authorId: string, args: any, session: Session) {
    const {types, before, after} = args;
    const typesString: string = types ? ":" + types?.join(":") : "";
    let cypher: string = `MATCH (author {id: $authorId})-[r:AUTHORED]->(post${typesString})`
    if (args.before || args.after) {
        let whereClause: string[] = ["WHERE"];
        let clauses: string[] = [];
        if (before) {
            clauses.push("r.creationDateTime < $before");
        }
        if (after) {
            clauses.push("r.creationDateTime > $after");
        }
        cypher = [cypher, [whereClause, [clauses].join(" AND ")].join(" ")].join(" ");
    }
    cypher = [cypher, "RETURN post, r, author;"].join(" ");
    return session.executeRead((tx: ManagedTransaction) => 
        tx.run(cypher, {...args, authorId})).then((res) => {
            if (res.records.length < 1) return null;
            return res.records.flatMap((record) => {
                const {post, r, author} = record.toObject();
                return {
                    ...post.properties,
                    __typename: post.labels[0],
                    creationDateTime: r.properties.creationDateTime,
                }
            })
        }
    );
}

function authorTextPost(args: any, session: Session) {
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
            };
        }
    );
}

const resolvers = {
    Query: {
        person: (root, args, context, info) => lookupPerson(args, context.n4jDriver.session()),
        posts: (root, args, context, info) => getPostsByAuthorId(args.authorId, args, context.n4jDriver.session()),
    },
    Mutation: {
        authorTextPost: (root, args, context, info) => authorTextPost(args, context.n4jDriver.session())
    },
    Person: {
        posts: (author, args, context, info) =>  getPostsByAuthorId(author.id, args, context.n4jDriver.session()),
    }
}

const typeDefs : string = readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = makeExecutableSchema({typeDefs, resolvers});

const root2 = {
    person(args: any, context: any, info: any) {
        const session: Session = context.n4jDriver.session();
        const argString = Object.keys(args).map((key) => { return `${key}: $${key}`}).join(", ");
        let cypher = `MATCH (p:Person {${argString}}) RETURN p;`;
        return session.executeRead((tx: ManagedTransaction) =>
            tx.run(cypher, args)).then((res) => {
                if (res.records.length < 1) return null;
                return {
                    ...res.records[0].toObject().p.properties,
                    posts: this.posts
                };
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
        cypher = [cypher, "RETURN post, r, author;"].join(" ");
        return session.executeRead((tx: ManagedTransaction) => 
            tx.run(cypher, args)).then((res) => {
                if (res.records.length < 1) return null;
                return res.records.flatMap((record) => {
                    const {post, r, author} = record.toObject();
                    return {
                        ...post.properties,
                        __typename: post.labels[0],
                        creationDateTime: r.properties.creationDateTime,
                        author: {
                            ...author.properties,
                            __typename: author.labels[0]
                        }
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
})
