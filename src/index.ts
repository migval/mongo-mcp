#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  Collection,
  CountDocumentsOptions,
  Db,
  DeleteOptions,
  FindOptions,
  InsertOneOptions,
  MongoClient,
  UpdateOptions,
} from "mongodb";

const CONNECTION_STRING = process.argv[2];

if (!CONNECTION_STRING) {
  console.error(
    "Error: MongoDB connection string is required as a command line argument."
  );
  process.exit(1);
}

interface ExecuteMongoOperationArgs {
  collectionName: string;
  operation:
    | "find"
    | "insertOne"
    | "updateOne"
    | "deleteOne"
    | "countDocuments";
  args: string; // JSON string representing arguments for the specific operation
}

const isValidExecuteMongoOperationArgs = (
  params: any
): params is ExecuteMongoOperationArgs => {
  return (
    typeof params === "object" &&
    params !== null &&
    typeof params.collectionName === "string" &&
    typeof params.operation === "string" &&
    ["find", "insertOne", "updateOne", "deleteOne", "countDocuments"].includes(
      params.operation
    ) &&
    typeof params.args === "string"
  );
};

class MongoMcpServer {
  private server: Server;
  public mongoClient: MongoClient;

  constructor(connectionString: string) {
    this.server = new Server(
      {
        name: "mongo-mcp",
        version: "0.1.1", // Incremented version
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mongoClient = new MongoClient(connectionString);
    this.setupToolHandlers();

    this.server.onerror = (error) => console.error("[MCP Error]", error);
    const signalHandler = async (signal: string) => {
      console.log(`${signal} received, closing server and MongoDB client...`);
      await this.server.close();
      await this.mongoClient.close();
      process.exit(0);
    };
    process.on("SIGINT", () => signalHandler("SIGINT"));
    process.on("SIGTERM", () => signalHandler("SIGTERM"));
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "execute_mongo_operation",
          description:
            "Ejecuta una operación especificada (find, insertOne, updateOne, deleteOne, countDocuments) en una colección de MongoDB.",
          inputSchema: {
            type: "object",
            properties: {
              collectionName: {
                type: "string",
                description: "Nombre de la colección donde operar.",
              },
              operation: {
                type: "string",
                enum: [
                  "find",
                  "insertOne",
                  "updateOne",
                  "deleteOne",
                  "countDocuments",
                ],
                description: "La operación de MongoDB a ejecutar.",
              },
              args: {
                type: "string",
                description:
                  'Objeto JSON (como string) con los argumentos para la operación. Ej: para find: \'{"filter": {}, "options": {}}\', para insertOne: \'{"document": {}}\'.',
              },
            },
            required: ["collectionName", "operation", "args"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "execute_mongo_operation") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidExecuteMongoOperationArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid arguments for execute_mongo_operation."
        );
      }

      const {
        collectionName,
        operation,
        args: argsStr,
      } = request.params.arguments;
      let parsedArgs: any;

      try {
        parsedArgs = JSON.parse(argsStr);
      } catch (e) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid JSON in 'args': ${(e as Error).message}`
        );
      }

      try {
        await this.mongoClient.connect();
        const db: Db = this.mongoClient.db();
        const collection: Collection = db.collection(collectionName);
        let result: any;

        switch (operation) {
          case "find":
            result = await collection
              .find(parsedArgs.filter || {}, parsedArgs.options as FindOptions)
              .toArray();
            break;
          case "insertOne":
            if (!parsedArgs.document)
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing 'document' in args for insertOne"
              );
            result = await collection.insertOne(
              parsedArgs.document,
              parsedArgs.options as InsertOneOptions
            );
            break;
          case "updateOne":
            if (!parsedArgs.filter)
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing 'filter' in args for updateOne"
              );
            if (!parsedArgs.update)
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing 'update' in args for updateOne"
              );
            result = await collection.updateOne(
              parsedArgs.filter,
              parsedArgs.update,
              parsedArgs.options as UpdateOptions
            );
            break;
          case "deleteOne":
            if (!parsedArgs.filter)
              throw new McpError(
                ErrorCode.InvalidParams,
                "Missing 'filter' in args for deleteOne"
              );
            result = await collection.deleteOne(
              parsedArgs.filter,
              parsedArgs.options as DeleteOptions
            );
            break;
          case "countDocuments":
            result = await collection.countDocuments(
              parsedArgs.filter || {},
              parsedArgs.options as CountDocumentsOptions
            );
            break;
          default:
            throw new McpError(
              ErrorCode.InvalidParams,
              `Unsupported operation: ${operation}`
            );
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        if (error instanceof McpError) throw error;
        console.error("MongoDB operation failed:", error);
        throw new McpError(
          ErrorCode.InternalError,
          `MongoDB operation failed: ${(error as Error).message}`
        );
      } finally {
        await this.mongoClient.close();
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    try {
      await this.server.connect(transport);
      console.error(
        "Mongo MCP server (v0.1.1) running on stdio. Waiting for requests..."
      );
    } catch (error) {
      console.error("Failed to start Mongo MCP server:", error);
      await this.mongoClient.close();
      process.exit(1);
    }
  }
}

let serverInstance: MongoMcpServer | null = null;
try {
  serverInstance = new MongoMcpServer(CONNECTION_STRING);
  serverInstance.run().catch(async (error) => {
    console.error("Unhandled error during server execution:", error);
    if (serverInstance && serverInstance.mongoClient) {
      await serverInstance.mongoClient.close();
    }
    process.exit(1);
  });
} catch (error) {
  console.error("Failed to initialize MongoMcpServer:", error);
  if (serverInstance && serverInstance.mongoClient) {
    serverInstance.mongoClient
      .close()
      .catch((e) =>
        console.error("Error closing mongoClient on init fail:", e)
      );
  }
  process.exit(1);
}
