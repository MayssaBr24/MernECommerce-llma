var express = require('express');
var router = express.Router();
const dotenv =require('dotenv')
const path = require('path');

var fetch = require ('node-fetch');
var { Client } = require ('@modelcontextprotocol/sdk/client/index.js');
var { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
dotenv.config();

/* =========================================
MCP CLIENT
========================================= */
let mcpClient;
let availableTools = [];
async function initializeMCP() {
    mcpClient = new Client({ name: 'ollama-mcp-client', version: '1.0.0' });
    const transport = new StdioClientTransport({
        command: 'node',
        args: [path.resolve(__dirname, '../mcptools/index.js')]
    });
    await mcpClient.connect(transport);
    const toolsList = await mcpClient.listTools();
    availableTools = toolsList.tools || [];
    console.log(` MCP connecté – ${availableTools.length} outil(s)`);
    availableTools.forEach(t =>
        console.log(` • ${t.name}: ${t.description}`)
    );
}
initializeMCP().catch(err => {
    console.error(' Erreur MCP', err);
    process.exit(1);
});
/* =========================================
MCP TOOL EXEC
========================================= */
async function executeToolViaMCP(toolName, args) {
    console.log(` MCP call → ${toolName}`, args);
    const result = await mcpClient.callTool({
        name: toolName,
        arguments: args
    });
    const text = result?.content?.find(c => c.type === 'text')?.text;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
/* =========================================
OLLAMA CALL
========================================= */
async function callOllama(messages) {
    const res = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3.1',
            messages,
            stream: false,
            options: {
                temperature: 0.1
            }
        })
    });
    const data = await res.json();
    return data.message.content;
}
/* =========================================
ROUTE PRINCIPALE
========================================= */
router.post('/', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message manquant' });
    }
    const systemPrompt = `
Tu es un assistant spécialisé dans la gestion d'un catalogue d'articles e-commerce. Tu dois STRICTEMENT suivre ces règles :\\n\\n1. FORMAT DE RÉPONSE :\\n   - Réponds UNIQUEMENT en JSON valide\\n   - Commence toujours par '{' et termine par '}'\\n   - JAMAIS de texte avant/après le JSON\\n   - JAMAIS de blocs de code Markdown (pas de \`\`\`json \`\`\`)\\n   - Les réponses doivent être brutes, directes\\n\\n2. LOGIQUE DE TRAITEMENT :\\n   - Quand l'utilisateur donne un NOM de catégorie (ex: \\"Informatique\\"):\\n     a) Utilise d'abord \\"find-category-by-name\\" pour obtenir l'ID\\n     b) Utilise ensuite cet ID avec \\"get-articles-by-cat\\"\\n     c) Renvoie uniquement la liste des articles\\n   - Pour les autres demandes, utilise l'outil approprié\\n\\n3. RÈGLES STRICTES :\\n   - NE montre JAMAIS les IDs dans la réponse finale\\n   - Réponds PRÉCISÉMENT à ce qui est demandé, sans ajouter d'explications\\n   - Garde les réponses simples, réduites et claires\\n   - Évite les retours à la ligne inutiles\\n   - Structure les données de manière lisible\\n\\n4. OUTILS DISPONIBLES :\\n   - find-category-by-name(name) : Cherche l'ID d'une catégorie par son nom\\n   - get-articles-by-cat(categorieID) : Liste les articles d'une catégorie (nécessite ID)\\n   - get-articles-by-scat(scategorieID) : Liste les articles d'une sous-catégorie\\n   - list-articles() : Liste tous les articles\\n   - list-users(firstname?) : Liste les utilisateurs (filtre optionnel par prénom)\\n   - getListUsers() : Liste tous les utilisateurs\\n\\n5. EXEMPLE DE RÉPONSE :\\n   Pour \\"Donne-moi les articles de la catégorie Informatique\\" :\\n   {\\n     \\"articles\\": [\\n       {\\"nom\\": \\"Ordinateur portable\\"},\\n       {\\"nom\\": \\"Clavier\\"},\\n       {\\"nom\\": \\"Souris\\"}\\n     ]\\n   }\\n\\n6. IMPORTANT :\\n   - Traite chaque demande indépendamment\\n   - N'anticipe pas les besoins non exprimés\\n   - Si tu ne sais pas, retourne un JSON avec \\"error\\"\\n   - Priorise la simplicité et la rapidité

`.trim();
    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
    ];
    let history = [];
    let turns = 0;
    const MAX_TURNS = 8;
    try {
        while (turns < MAX_TURNS) {
            turns++;
            const raw = await callOllama(messages);
            console.log('🧠 Ollama:', raw);
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return res.json({ success: true, message: raw });
            }
// FIN
            if (parsed.final) {
                return res.json({
                    success: true,
                   message: parsed.final,
                    turns,
                    toolsCalled: history
                });
            }
// TOOL
            if (parsed.tool) {
                const toolResult = await executeToolViaMCP(
                    parsed.tool,
                    parsed.arguments || {}
                );
                history.push({
                    tool: parsed.tool,
                    args: parsed.arguments,
                    result: toolResult
                });
                messages.push({
                    role: 'assistant',
                    content: raw
                });
                messages.push({
                    role: 'tool',
                    content: JSON.stringify(toolResult)
                });
                continue;
            }
            return res.json({ message: raw });
        }
        return res.status(500).json({
            error: 'Limite de tours atteinte',
            toolsCalled: history
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Erreur serveur',
            message: err.message
        });
    }
});
module.exports = router;
