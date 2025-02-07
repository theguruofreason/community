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
import { Entity, EntityLookupArgs, EstablishRelationshipInput, Person, Post, PostsByAuthorIdArgs, Relationship, RelationshipType, POST_TYPES, ENTITY_LABELS, AuthorTextPost, TextPost, TextPostQueryResult, RelationshipQueryResult } from "./types.js";
import { UUID } from "crypto";
const __dirname = path.dirname(fileURLToPath(import.meta.url));


function createPropertiesString(args: object): string {
    return Object.keys(args).map((key) => `${key}: $${key}`).join(", ");
}

function lookupPeople(args: object, session: Session) : Promise<Person[]> {
    const cypher = `MATCH (p:Person {${createPropertiesString(args)}}) RETURN p;`;
    return session.executeRead((tx: ManagedTransaction) =>
        tx.run(cypher, args)).then((res) => {
            return res.records.map(
                (record) => record.get("p").properties
            ) as Person[];
        }
    );
}

function lookupRelatedEntities(primaryId: UUID, session: Session, relationshipTypes?: RelationshipType[], descriptorSearch?: string) : Promise<Entity[]> {
    const relationshipTypesString: string = relationshipTypes ? ":" + relationshipTypes.join("|") : "";
    const cypher = `MATCH (p {id: $primaryId})-[r${relationshipTypesString}]-(s)`;
    if (descriptorSearch) {
        cypher.concat(` WHERE r.descriptor =~ '${descriptorSearch}`);
    }
    return session.executeRead((tx: ManagedTransaction) => 
        tx.run(cypher, { primaryId: primaryId }).then((res) => {
            return res.records.map(
                (record) => {
                    const recordObject = record.toObject();
                    return {
                        ...recordObject.s.properties,
                        __typename: recordObject.s.labels.find((label) => ENTITY_LABELS.includes(label))
                    }
                }
            ) as Entity[];
        })
    )
}

function lookupEntities(args: EntityLookupArgs, session: Session): Promise<Entity[]> {
    const {before, after, labels} = args;
    delete args.labels;
    const entityLabelsString: string = (labels ?? ENTITY_LABELS).join("|");
    const matchString = `MATCH (e:${entityLabelsString} {${createPropertiesString(args)}})`;
    const clauses: string[] = [];
    if (args.before ?? args.after) {
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
            }) as Entity[];
        }
    );
}

function getPostsByAuthorId(authorId: string, args: PostsByAuthorIdArgs, session: Session) {
    const {types, before, after} = args;
    delete args.types;
    const typesString: string = types ? ":" + types.join("|") : "";
    const matchString = `MATCH (author {id: $authorId})-[r:AUTHORED]->(post${typesString})`
    const clauses: string[] = [];
    
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
                const {post} = record.toObject();
                return {
                    ...post.properties,
                    visibility: Array.isArray(post.properties.visibility) ? post.properties.visibility : [post.properties.visibility],
                    __typename: post.labels.find((label) => POST_TYPES.includes(label)),
                    creationDateTime: post.creationDateTime,
                }
            }) as Post[];
        }
    );
}

function authorTextPost(args: AuthorTextPost, session: Session): Promise<TextPost> {
    args.creationDateTime = new Date().getTime();
    if (!("activationDateTime" in args)) args.activationDateTime = args.creationDateTime;
    const cypher = `MATCH (p {id: $authorId})
    CREATE (tp:Post:TextPost {activationDateTime: $activationDateTime, deactivationDateTime: $deactivationDateTime, visibility: $visibility, content: $content})
    CREATE (p)-[r:AUTHORED {creationDateTime: $creationDateTime}]->(tp)
    RETURN tp, r;`
    return session.executeWrite<QueryResult<TextPostQueryResult>>((tx: ManagedTransaction) =>
        tx.run(cypher, args)).then((res) => {
            const {tp, r} = res.records[0].toObject();
            return {
                ...tp.properties,
                creationDateTime: r.properties.creationDateTime,
            } as TextPost;
        }
    );
}

function establishRelationship(args: EstablishRelationshipInput, session: Session) : Promise<Relationship> {
    const matchString = `MATCH (subject {id: $subjectId}) MATCH (object {id: $objectId})`;
    const descriptionString: string = args.descriptor ? `{descriptor: $descriptor}` : "";
    const relationshipString = `MERGE (subject)-[r:${args.relationshipType} ${descriptionString}]->(object)`;
    const cypher = `${matchString} ${relationshipString} RETURN subject, object, r;`;
    return session.executeWrite<QueryResult<RelationshipQueryResult>>((tx: ManagedTransaction) =>
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
            } as Relationship;
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
        familyOut: (primary, args, context, info) => lookupPeople
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
