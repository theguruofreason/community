/*
Copyright 2024, James Iden Busia

This file is part of Community.

Community is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Community is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Community. If not, see <https://www.gnu.org/licenses/>. 
*/
import { fileURLToPath } from "url";
import { createHandler } from "graphql-http/lib/use/express";
import { readFileSync } from 'fs';
import path from "path";
import { ManagedTransaction, QueryResult, Session } from "neo4j-driver";
import { GraphQLSchema } from "graphql/type";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { Entity, EntityLookupArgs, EstablishRelationshipArgs, Person, Post, PostsByAuthorIdArgs, Relationship, AuthorTextPostArgs, TextPost, ENTITY_LABELS, EntityLabel, LookupRelatedEntitiesArgs, EntityAndRelationship, RelationshipPath } from "./types.js";
import { UUID } from "crypto";
import { v4 as uuidv4 } from "uuid";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface EntityResult {
    properties: Entity;
    labels: string[];
}

function createPropertiesString(args: object): string {
    return Object.keys(args).map((key) => `${key}: $${key}`).join(", ");
}

function lookupPeople(args: object, session: Session) : Promise<Person[]> {
    const p = 'p';
    const cypher = `MATCH (${p}:Person {${createPropertiesString(args)}}) RETURN ${p};`;
    return session.executeRead<Person[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[p]: {properties: Person}}> = await tx.run(cypher, args);
        return result.records.map(record => record.get(p).properties);
    });
}


function lookupRelatedEntities(primaryId: UUID, session: Session, args: LookupRelatedEntitiesArgs) : Promise<EntityAndRelationship[]> {
    const {relationshipTypes, descriptorSearch, direction = "BIDIRECTIONAL"} = args;
    const [p, r, s, relationshipOut] = ['p' as const, 'r' as const, 's' as const, 'relOut' as const];
    const relationshipTypesString: string = relationshipTypes ? ":" + relationshipTypes.join("|") : "";
    const matchString = `MATCH (${p} {id: $primaryId})-[${r}${relationshipTypesString}]-(${s})`;
    const descriptorString = descriptorSearch ? `WHERE ${r}.descriptor =~ '${descriptorSearch}' `: "";
    const cypher = `${matchString} ${descriptorString} RETURN (endNode(${r}) = ${s}) as ${relationshipOut}, ${r}, ${s}`;
    return session.executeRead<EntityAndRelationship[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[relationshipOut]: boolean, [r]: {properties: Relationship}; [s]: EntityResult}> = await tx.run(cypher, { primaryId: primaryId });
        return result.records.filter(record => {
            if (direction === "OUT") return record.get(relationshipOut);
            if (direction === "IN") return !record.get(relationshipOut);
            return true;
        })
        .map(record => {
                return {
                    entity: {
                        ...record.get(s).properties,
                        __typename: record.get(s).labels.find(label => ENTITY_LABELS.includes(label)) as EntityLabel
                    },
                    relationship: {
                        ...record.get(r).properties
                    },
                    direction: record.get(relationshipOut) ? "OUT" : "IN"
            }
        });
    });
}

function lookupEntities(args: EntityLookupArgs, session: Session): Promise<Entity[]> {
    const {before, after, labels} = args;
    delete args.labels;
    const e = 'e';
    const entityLabelsString: string = labels ? ":" + labels.join("|") : "";
    const matchString = `MATCH (${e}${entityLabelsString} {${createPropertiesString(args)}})`;
    const clauses: string[] = [];
    if (args.before ?? args.after) {
        if (before) {
            clauses.push(`${e}.creationDateTime < $before`);
        }
        if (after) {
            clauses.push(`${e}.creationDateTime > $after`);
        }
    }
    const whereString: string = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const cypher = `${matchString} ${whereString} RETURN ${e}`;
    return session.executeRead<Entity[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[e]: EntityResult}> = await tx.run(cypher, args);
        return result.records.map(record => record.get(e).properties);
    });
}

async function getPostsByAuthorId(authorId: string, args: PostsByAuthorIdArgs, session: Session): Promise<Post[]> {
    const {types, before, after} = args;
    delete args.types;
    const [a, p, r] = ["a" as const, "p" as const, "r" as const];
    const typesString: string = types ? ":" + types.join("|") : "";
    const matchString = `MATCH (${a} {id: $authorId})-[${r}:AUTHORED]->(${p}${typesString})`
    const clauses: string[] = [];
    
    // Add clauses if present
    if (before) {
        clauses.push(`${r}.creationDateTime < $before`);
    }
    if (after) {
        clauses.push(`${r}.creationDateTime > $after`);
    }
    const whereString: string = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const cypher = `${matchString} ${whereString} RETURN ${p}`;
    return session.executeRead<Post[]>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[p]: {properties: Post}}> = await tx.run(cypher, {...args, authorId});
        return result.records.map(record => record.get(p).properties);
    });
}

async function generateFreshPostUUID(session: Session, retry = 5): Promise<string | Error> {
    if (retry === 0) {
        console.error("Failed to generate post UUID!");
        return new Error("Failed to generate post UUID!");
    }
    const uuid = uuidv4();
    const foundPost: boolean = await session.executeRead(async (tx: ManagedTransaction) => {
        return !!(await tx.run<Post>(`MATCH (p:Post) {id: $postId} RETURN p`)).records.length;
    });
    if (foundPost) return generateFreshPostUUID(session, retry - 1);
    return uuid;
}

function authorTextPost(args: AuthorTextPostArgs, session: Session): Promise<TextPost> {
    const [p, r, tp] = ['p' as const, 'r' as const, 'tp' as const];
    args.creationDateTime = new Date().getTime();
    const postId = generateFreshPostUUID(session);
    if (!("activationDateTime" in args)) args.activationDateTime = args.creationDateTime;
    const cypher = `MATCH (${p} {id: $authorId})
    CREATE (${tp}:Post:TextPost {id: $postId, creationDateTime: $creationDateTime, activationDateTime: $activationDateTime, deactivationDateTime: $deactivationDateTime, visibility: $visibility, content: $content})
    CREATE (${p})-[${r}:AUTHORED]->(${tp})
    RETURN ${tp};`
    return session.executeWrite<TextPost>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[tp]: {properties: TextPost}}> = await tx.run(cypher, {...args, postId: postId});
        return result.records[0].get(tp).properties;
    });
}

function establishRelationship(args: EstablishRelationshipArgs, session: Session) : Promise<RelationshipPath> {
    const [s, r, o] = ['s' as const, 'r' as const, 'o' as const];
    const matchString = `MATCH (${s} {id: $subjectId}) MATCH (${o} {id: $objectId})`;
    const descriptionString: string = args.descriptor ? `{descriptor: $descriptor}` : "";
    const relationshipString = `MERGE (${s})-[${r}:${args.relationshipType} ${descriptionString}]->(${o})`;
    const cypher = `${matchString} ${relationshipString} RETURN ${s}, ${o}, ${r};`;
    return session.executeWrite<RelationshipPath>(async (tx: ManagedTransaction) => {
        const result: QueryResult<{[s]: EntityResult; [r]: {properties: RelationshipPath}; [o]: EntityResult}> = await tx.run(cypher, args);
        const subject = result.records[0].get(s);
        const object = result.records[0].get(o);
        const relationship = result.records[0].get(r);
        return {
            subject: {
                ...subject.properties,
                __typename: subject.labels.find(label => ENTITY_LABELS.includes(label)) as EntityLabel
            },
            object: {
                ...object.properties,
                __typename: object.labels.find(label => ENTITY_LABELS.includes(label)) as EntityLabel
            },
            descriptor: relationship.properties.descriptor
        };
    });
}

interface Context { n4jDriver: { session: () => Session; }; }

const resolvers = {
    Query: {
        people: (root, args: object, context: Context) => lookupPeople(args, context.n4jDriver.session()),
        posts: (root, args: PostsByAuthorIdArgs, context: Context) => getPostsByAuthorId(args.authorId, args, context.n4jDriver.session()),
        entities: (root, args: EntityLookupArgs, context: Context) => lookupEntities(args, context.n4jDriver.session())
    },
    Mutation: {
        authorTextPost: (root, args: AuthorTextPostArgs, context: Context) => authorTextPost(args, context.n4jDriver.session()),
        establishRelationship: (root, args: EstablishRelationshipArgs, context: Context) => establishRelationship(args, context.n4jDriver.session())
    },
    Person: {
        posts: (author: { id: UUID; }, args: PostsByAuthorIdArgs, context: Context) => getPostsByAuthorId(author.id, args, context.n4jDriver.session()),
        people: (primary: { id: UUID; }, args: LookupRelatedEntitiesArgs, context: Context) => lookupRelatedEntities(primary.id, context.n4jDriver.session(), args)
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
