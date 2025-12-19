#!/bin/bash

clear
echo "=========================================="
echo " Lancement via CONCURRENTLY..."
echo "=========================================="

# Lancement des services en parallèle
npx concurrently \
  --names "API,MCP-SRV" \
  --prefix-colors "blue,green" \
  "nodemon app.js" \
  "nodemon server.js mcptools/index.js"




