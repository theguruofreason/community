import { fileURLToPath } from "url";
import { createHandler } from "graphql-http/lib/use/express";
import { readFileSync } from 'fs';
import path from "path";
import { ManagedTransaction, Session } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { EstablishRelationshipInput, Relationship } from "./types.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENTITY_LABELS: string[] = [
    "Person",
    "Place",
    "Thing",
    "Business",
    "Group",
    "Event"
]

const POST_TYPES: string[] = [
    "TextPost",
    "ImagePost",
    "AudioPost",
    "VideoPost",
    "LinkPost"
]

function createArgString(args: object): string {
    return Object.keys(args).map((key) => `${key}: $${key}`).join(", ");
}

function lookupPeople(args: object, session: Session) {
    let cypher = `MATCH (p:Person {${createArgString(args)}}) RETURN p;`;
    return session.executeRead((tx: ManagedTransaction) =>
        tx.run(cypher, args)).then((res) => {
            return res.records.length > 0 ? res.records.map((record) => record.toObject().p.properties) : null;
        }
    );
}

function lookupEntities(args: any, session: Session) {
    const {before, after, labels} = args;
    delete args.labels;
    const entityLabelsString: string = (labels ?? ENTITY_LABELS).join("|");
    let matchString: string = `MATCH (e:${entityLabelsString} {${createArgString(args)}})`;
    let clauses: string[] = [];
    if (args.before || args.after) {
        if (before) {
            clauses.push("e.creationDateTime < $before");
        }
        if (after) {
            clauses.push("e.creationDateTime > $after");
        }
    }
    const whereString: string = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const cypher = `${matchString} ${whereString} RETURN e`;
    return session.executeRead((tx: ManagedTransaction) => 
        tx.run(cypher, args)).then((res) => {
            if (res.records.length < 1) return null;
            return res.records.flatMap((record) => {
                const {e} = record.toObject();
                return {
                    ...e.properties,
                    __typename: e.labels.find((label) => ENTITY_LABELS.includes(label))
                }
            })
        }
    );
}

function getPostsByAuthorId(authorId: string, args: any, session: Session) {
    const {types, before, after} = args;
    delete args.types;
    const typesString: string = types ? ":" + types.join("|") : "";
    let matchString: string = `MATCH (author {id: $authorId})-[r:AUTHORED]->(post${typesString})`
    let clauses: string[] = [];
    
    // Add clauses if present
    if (before) {
        clauses.push("r.creationDateTime < $before");
    }
    if (after) {
        clauses.push("r.creationDateTime > $after");
    }
    const whereString: string = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const cypher = `${matchString} ${whereString} RETURN post, r`;
    return session.executeRead((tx: ManagedTransaction) => 
        tx.run(cypher, {...args, authorId})).then((res) => {
            if (res.records.length < 1) return null;
            return res.records.flatMap((record) => {
                const {post, r} = record.toObject();
                return {
                    ...post.properties,
                    visibility: Array.isArray(post.properties.visibility) ? post.properties.visibility : [post.properties.visibility],
                    __typename: post.labels.find((label) => POST_TYPES.includes(label)),
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
    RETURN tp, r;`
    return session.executeWrite((tx: ManagedTransaction) =>
        tx.run(cypher, args)).then((res) => {
            const {tp, r} = res.records[0].toObject();
            return {
                ...tp.properties,
                creationDateTime: r.properties.creationDateTime,
            };
        }
    );
}

function establishRelationship(args: EstablishRelationshipInput, session: Session) : Promise<Relationship> {
    const matchString: string = `MATCH (subject {id: $subjectId}) MATCH (object {id: $objectId})`;
    const descriptionString: string = args.descriptor ? `{descriptor: $descriptor}` : "";
    const relationshipString: string = `MERGE (subject)-[r:${args.relationshipType} ${descriptionString}]->(object)`;
    const cypher: string = `${matchString} ${relationshipString} RETURN subject, object, r;`;
    return session.executeWrite((tx: ManagedTransaction) =>
        tx.run(cypher, args)).then((res) => {
            const {subject, object, r} = res.records[0].toObject();
            return {
                subject: {
                    ...subject.properties,
                    __typename: subject.labels.find((label) => ENTITY_LABELS.includes(label))
                },
                object: {
                    ...object.properties,
                    __typename: object.labels.find((label) => ENTITY_LABELS.includes(label))
                },
                descriptor: r.properties.descriptor
            };
        }
    );
}

const resolvers = {
    Query: {
        people: (root, args, context, info) => lookupPeople(args, context.n4jDriver.session()),
        posts: (root, args, context, info) => getPostsByAuthorId(args.authorId, args, context.n4jDriver.session()),
        entities: (root, args, context, info) => lookupEntities(args, context.n4jDriver.session())
    },
    Mutation: {
        authorTextPost: (root, args, context, info) => authorTextPost(args, context.n4jDriver.session()),
        establishRelationship: (root, args, context, info) => establishRelationship(args, context.n4jDriver.session())
    },
    Person: {
        posts: (author, args, context, info) =>  getPostsByAuthorId(author.id, args, context.n4jDriver.session()),
    }
}

const typeDefs : string = readFileSync(__dirname + "/types.graphql").toString("utf-8");
const schema: GraphQLSchema = makeExecutableSchema({typeDefs, resolvers});

export const handler = createHandler({
    schema: schema,
    context: req => ({
        n4jDriver: req.raw.n4jDriver
    }),
})
