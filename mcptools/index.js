const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require("axios");
const { z } = require("zod");
// 2. Initialisation du Serveur
const server = new McpServer({
    name: "ecommerce-backend-server",
    version: "1.0.0",
});
server.tool(
    "getListUsers",
    {}, // Pas de paramètres
    async () => {
        const response = await axios.get(
            "http://localhost:3001/api/users/getallusers"
        );
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(response.data)
                }
            ]
        };
    }
);
server.tool(
    "list-users",
    'List users optionally filtered by firstname',
    { firstname: z.string().optional().describe('Filter by firstname') },
    async ({ firstname }) => {
        console.error('MCP list-users appelé avec:', firstname);
        const response = await axios.post(
            'http://localhost:3001/api/users/getuserbyname',
            { firstname },
        );
        const users = await response.data;
        if (users.length === 0) {
            return { content: [{ type: 'text', text: `Client de la firstname ${firstname
                    ?? ''} not found.` }] };
        }
        console.error(users);
        return { content: [{ type: "text", text: JSON.stringify(users) }]
        };
    }
);
server.tool(
    "list-articles",
    "Récupère la liste complète des articles",
    {},
    async () => {
        const response = await axios.get("http://localhost:3001/api/articles");
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }]
        };
    }
);
server.tool(
    "get-articles-by-scat",
    "Récupère les articles d'une sous-catégorie via son ID",
    { scategorieID: z.string().describe("L'ID de la sous-catégorie") },
    async ({ scategorieID }) => {
        const response = await axios.get(`http://localhost:3001/api/articles/scat/${scategorieID}`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }]
        };
    }
);
server.tool(
    "get-articles-by-cat",
    "Récupère les articles appartenant à une catégorie spécifique via son ID",
    { categorieID: z.string().describe("L'ID de la catégorie (ex: 65a...)") },
    async ({ categorieID }) => {
        const response = await axios.get(`http://localhost:3001/api/articles/cat/${categorieID}`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }]
        };
    }
);
// Outil pour convertir le NOM en ID
server.tool(
    "find-category-by-name",
    "Trouve l'ID d'une catégorie à partir de son nom",
    { name: z.string().describe("Le nom (ex: Informatique)") },
    async ({ name }) => {
        // Appelle la route /api/categories/search/:name de votre backend
        const response = await axios.get(`http://localhost:3001/api/categories/search/${name}`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }]
        };
    }
);

// 4. Lancement avec Transport STDIO
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server is running on STDIO...");
}
main().catch((err) => {
    console.error("Fatal Error:", err);
    process.exit(1);
});