# MongoDB MCP Server

Un servidor de Model Context Protocol (MCP) para MongoDB que permite a los modelos de IA interactuar con bases de datos MongoDB de forma directa y eficiente.

## Características

### Herramientas Disponibles

**`execute_mongo_operation`** - Ejecuta operaciones de MongoDB en cualquier colección
- **Operaciones soportadas:**
  - `find` - Buscar documentos con filtros y opciones
  - `insertOne` - Insertar un documento
  - `updateOne` - Actualizar un documento
  - `deleteOne` - Eliminar un documento
  - `deleteMany` - Eliminar múltiples documentos
  - `countDocuments` - Contar documentos que coincidan con un filtro

### Parámetros

Todas las operaciones requieren:
- `collectionName` - Nombre de la colección de MongoDB
- `operation` - Tipo de operación a ejecutar
- `args` - Objeto JSON (como string) con argumentos específicos para la operación

#### Ejemplos de uso:

**Buscar documentos:**
```json
{
  "collectionName": "users",
  "operation": "find",
  "args": "{\"filter\": {\"age\": {\"$gte\": 18}}, \"options\": {\"limit\": 10}}"
}
```

**Insertar documento:**
```json
{
  "collectionName": "users",
  "operation": "insertOne",
  "args": "{\"document\": {\"name\": \"Juan\", \"age\": 25, \"email\": \"juan@example.com\"}}"
}
```

**Actualizar documento:**
```json
{
  "collectionName": "users",
  "operation": "updateOne",
  "args": "{\"filter\": {\"_id\": \"...\"},\"update\": {\"$set\": {\"age\": 26}}}"
}
```

**Eliminar documentos:**
```json
{
  "collectionName": "users",
  "operation": "deleteMany",
  "args": "{\"filter\": {\"active\": false}}"
}
```

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Configuración

### Requisitos
- Node.js 18+
- Acceso a una instancia de MongoDB
- Claude Desktop (para uso con IA)

### Instalación y Configuración

1. **Construir el servidor:**
```bash
npm install
npm run build
```

2. **Configurar en Claude Desktop:**

**En MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**En Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mongo-mcp": {
      "command": "/ruta/completa/a/mongo-mcp/build/index.js",
      "args": ["mongodb://localhost:27017/mi_base_datos"]
    }
  }
}
```

3. **Cadena de conexión MongoDB:**
El servidor requiere una cadena de conexión MongoDB como primer argumento:
- Local: `mongodb://localhost:27017/nombre_bd`
- MongoDB Atlas: `mongodb+srv://usuario:password@cluster.mongodb.net/nombre_bd`
- Con autenticación: `mongodb://usuario:password@host:puerto/nombre_bd`

### Ejemplo de configuración completa:

```json
{
  "mcpServers": {
    "mongo-mcp": {
      "command": "/Users/usuario/proyectos/mongo-mcp/build/index.js",
      "args": ["mongodb+srv://miusuario:mipassword@cluster0.xyz.mongodb.net/tienda"]
    }
  }
}
```

## Uso

Una vez configurado, puedes usar el servidor MCP para realizar operaciones de MongoDB directamente desde Claude Desktop. Ejemplos:

- "Busca todos los usuarios mayores de 18 años en la colección users"
- "Inserta un nuevo producto en la colección productos"
- "Actualiza el precio del producto con ID xyz"
- "Cuenta cuántos pedidos hay en estado 'pendiente'"

## Debugging

Para depurar el servidor MCP, utiliza el MCP Inspector:

```bash
npm run inspector
```

El Inspector proporcionará una URL para acceder a las herramientas de depuración en tu navegador.

## Seguridad

- **Nunca** incluyas credenciales de MongoDB directamente en el código
- Usa variables de entorno para cadenas de conexión sensibles
- Limita permisos de la base de datos según sea necesario
- Considera usar conexiones cifradas (SSL/TLS) para MongoDB Atlas
