#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Output directory for generated files
const OUTPUT_DIR = process.env.IMAGEN_OUTPUT_DIR || path.join(process.env.HOME || "/tmp", "Pictures/imagen-output");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface ImagenResponse {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

interface GenerateImageParams {
  prompt: string;
  numberOfImages?: number;
  aspectRatio?: string;
  outputFormat?: string;
  filename?: string;
}

interface GenerateVideoParams {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  filename?: string;
}

async function generateImage(params: GenerateImageParams): Promise<string> {
  if (!API_KEY) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable not set"
    );
  }

  const {
    prompt,
    numberOfImages = 1,
    aspectRatio = "1:1",
    outputFormat = "png",
    filename,
  } = params;

  // Use Imagen 3 Fast (the one that actually works for image generation)
  const model = "imagen-3.0-fast-generate-001";
  const url = `${BASE_URL}/models/${model}:predict?key=${API_KEY}`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: numberOfImages,
      aspectRatio,
      outputOptions: {
        mimeType: outputFormat === "jpeg" ? "image/jpeg" : "image/png",
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const data = (await response.json()) as ImagenResponse;

  if (data.error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Imagen API error: ${data.error.message}`
    );
  }

  if (!data.predictions || data.predictions.length === 0) {
    throw new McpError(ErrorCode.InternalError, "No images generated");
  }

  const results: string[] = [];

  for (let i = 0; i < data.predictions.length; i++) {
    const prediction = data.predictions[i];
    if (prediction.bytesBase64Encoded) {
      const timestamp = Date.now();
      const ext = outputFormat === "jpeg" ? "jpg" : "png";
      const outputFilename = filename
        ? `${filename}${numberOfImages > 1 ? `-${i + 1}` : ""}.${ext}`
        : `imagen-${timestamp}-${i + 1}.${ext}`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);

      fs.writeFileSync(
        outputPath,
        Buffer.from(prediction.bytesBase64Encoded, "base64")
      );
      results.push(outputPath);
    }
  }

  return results.length === 1
    ? `Image saved to: ${results[0]}`
    : `${results.length} images saved to:\n${results.join("\n")}`;
}

async function generateVideo(params: GenerateVideoParams): Promise<string> {
  if (!API_KEY) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable not set"
    );
  }

  // Note: Veo video generation may require Vertex AI rather than the generativelanguage API
  // This is a placeholder - actual implementation depends on API availability

  const { prompt, durationSeconds = 4, aspectRatio = "16:9", filename } = params;

  // Try the Veo endpoint (may need adjustment based on actual API)
  const model = "veo-2.0-generate-001";
  const url = `${BASE_URL}/models/${model}:predict?key=${API_KEY}`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      durationSeconds,
      aspectRatio,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
      // If Veo isn't available via this API, provide helpful message
      if (data.error.code === 404 || data.error.message?.includes("not found")) {
        return `Video generation via Veo requires Vertex AI access.

To use Veo 3:
1. Enable Vertex AI API in your GCP project
2. Use the Vertex AI endpoint instead
3. Or access via Google AI Studio web interface

Prompt saved for reference: "${prompt}"`;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Veo API error: ${data.error.message}`
      );
    }

    // Handle successful video generation
    const timestamp = Date.now();
    const outputFilename = filename ? `${filename}.mp4` : `veo-${timestamp}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    if (data.predictions?.[0]?.bytesBase64Encoded) {
      fs.writeFileSync(
        outputPath,
        Buffer.from(data.predictions[0].bytesBase64Encoded, "base64")
      );
      return `Video saved to: ${outputPath}`;
    }

    return JSON.stringify(data, null, 2);
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(
      ErrorCode.InternalError,
      `Video generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function listModels(): Promise<string> {
  if (!API_KEY) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable not set"
    );
  }

  const url = `${BASE_URL}/models?key=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new McpError(ErrorCode.InternalError, `API error: ${data.error.message}`);
  }

  // Filter to image/video generation models
  const generationModels = data.models?.filter((m: { name: string }) =>
    m.name.includes("imagen") || m.name.includes("veo")
  ) || [];

  if (generationModels.length === 0) {
    return "No image/video generation models found. Available models may require Vertex AI access.";
  }

  return generationModels
    .map((m: { name: string; displayName?: string; description?: string }) =>
      `${m.name}\n  ${m.displayName || ""}\n  ${m.description || ""}`
    )
    .join("\n\n");
}

// Create MCP server
const server = new Server(
  {
    name: "imagen-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_image",
      description:
        "Generate images using Google Imagen 3. Creates high-quality images from text prompts.",
      inputSchema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description: "Text description of the image to generate",
          },
          numberOfImages: {
            type: "number",
            description: "Number of images to generate (1-4)",
            default: 1,
          },
          aspectRatio: {
            type: "string",
            description: "Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4",
            default: "1:1",
          },
          outputFormat: {
            type: "string",
            enum: ["png", "jpeg"],
            description: "Output image format",
            default: "png",
          },
          filename: {
            type: "string",
            description: "Optional filename (without extension)",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "generate_video",
      description:
        "Generate videos using Google Veo. Creates short videos from text prompts. Note: May require Vertex AI access.",
      inputSchema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description: "Text description of the video to generate",
          },
          durationSeconds: {
            type: "number",
            description: "Video duration in seconds (4, 6, or 8)",
            default: 4,
          },
          aspectRatio: {
            type: "string",
            description: "Aspect ratio: 16:9 or 9:16",
            default: "16:9",
          },
          filename: {
            type: "string",
            description: "Optional filename (without extension)",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "list_generation_models",
      description:
        "List available image and video generation models from Google AI",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "generate_image": {
        const result = await generateImage(args as unknown as GenerateImageParams);
        return { content: [{ type: "text", text: result }] };
      }
      case "generate_video": {
        const result = await generateVideo(args as unknown as GenerateVideoParams);
        return { content: [{ type: "text", text: result }] };
      }
      case "list_generation_models": {
        const result = await listModels();
        return { content: [{ type: "text", text: result }] };
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Imagen MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
