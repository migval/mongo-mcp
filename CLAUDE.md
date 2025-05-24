# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run build` - Compiles TypeScript and makes the output executable
- `npm run watch` - Compiles TypeScript in watch mode for development  
- `npm run inspector` - Launches MCP Inspector for debugging the server

## Architecture

This is a MongoDB Model Context Protocol (MCP) server built with TypeScript. The MCP framework enables AI models to interact with external systems through a standardized protocol.

### Core Components

**MongoMcpServer Class** (`src/index.ts`): Main server implementation that:
- Connects to MongoDB using connection string from command line argument
- Implements MCP protocol using `@modelcontextprotocol/sdk`
- Provides single tool `execute_mongo_operation` for database operations
- Supports operations: find, insertOne, updateOne, deleteOne, deleteMany, countDocuments
- Uses stdio transport for communication with MCP clients

**Tool Structure**: The server accepts JSON string arguments containing operation-specific parameters (filter, document, update, options) and returns JSON results.

**Connection Management**: MongoDB client connects per operation and closes after each request to avoid connection leaks.

## Usage Pattern

The server is designed to be used as a CLI tool that takes a MongoDB connection string as its first argument and communicates via stdio with MCP-compatible clients like Claude Desktop.

Configuration for Claude Desktop involves adding the server to `claude_desktop_config.json` with the path to the built executable.