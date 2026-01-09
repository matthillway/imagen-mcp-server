# Imagen MCP Server

MCP server for Google Imagen 3 image generation and Veo video generation.

## Installation

```bash
npm install
npm run build
```

## Configuration

Set your Google AI API key:
```bash
export GOOGLE_AI_API_KEY="your-api-key"
```

Add to your MCP settings (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "imagen": {
      "command": "node",
      "args": ["/path/to/imagen-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_AI_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

### generate_image
Generate images using Google Imagen 3.

```json
{
  "prompt": "A serene mountain landscape at sunset",
  "numberOfImages": 1,
  "aspectRatio": "16:9",
  "outputFormat": "png"
}
```

### generate_video
Generate videos using Google Veo (requires Vertex AI access).

```json
{
  "prompt": "A drone shot flying over a city",
  "durationSeconds": 4,
  "aspectRatio": "16:9"
}
```

### list_generation_models
List available image/video generation models.

## Output

Generated files are saved to `~/Pictures/imagen-output/` by default.
Override with `IMAGEN_OUTPUT_DIR` environment variable.

## License

MIT
