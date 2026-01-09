# Imagen MCP Server

## Status
**Active** - v1.0.0

## Purpose
MCP server providing Google Imagen 3 image generation and Veo video generation capabilities for Claude Code.

## Project ID
GitHub: matthillway/imagen-mcp-server

## Architecture
- TypeScript MCP server using @modelcontextprotocol/sdk
- Connects to Google AI Studio API (generativelanguage.googleapis.com)
- Outputs images to ~/Pictures/imagen-output/

## Environment Variables
- `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY` - Required for API access
- `IMAGEN_OUTPUT_DIR` - Optional, defaults to ~/Pictures/imagen-output/

## Tools Provided
1. `generate_image` - Imagen 3 Fast image generation
2. `generate_video` - Veo video generation (may need Vertex AI)
3. `list_generation_models` - List available models

## MCP Configuration
Add to Claude Code settings:
```json
{
  "mcpServers": {
    "imagen": {
      "command": "node",
      "args": ["/Users/matt/Projects/imagen-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_AI_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Notes
- Video generation via Veo may require Vertex AI access
- Image generation uses Imagen 3 Fast which is available via Google AI Studio
