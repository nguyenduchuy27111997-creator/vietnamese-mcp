import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createTestClient, callTool, validateToolName, formatToolError } from '@vn-mcp/shared';

describe('Integration: shared package end-to-end', () => {
  it('creates MCP server, registers a tool with inline Zod schema, calls it via in-memory transport', async () => {
    // 1. Create a server with a sample tool
    const server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    // 2. Validate tool name follows convention
    const toolName = 'test_create_payment';
    expect(validateToolName(toolName)).toBe(true);

    // 3. Register tool with INLINE Zod schema (INFRA-05 pattern: each server owns its schemas)
    //    VND amounts must be positive integers — this is the validation pattern servers will follow
    const VndAmountSchema = z.number().int().positive();

    server.tool(
      toolName,
      'Create a test payment',
      { amount: z.number(), orderId: z.string() },
      async (args) => {
        // Validate amount using inline schema (per-server pattern, not shared)
        const parsed = VndAmountSchema.safeParse(args.amount);
        if (!parsed.success) {
          return formatToolError(new Error('Invalid VND amount: must be a positive integer'));
        }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ payUrl: 'https://example.com/pay', amount: args.amount, orderId: args.orderId, _mock: true }) }],
        };
      },
    );

    // 4. Connect via in-memory transport
    const client = await createTestClient(server);

    // 5. Call the tool
    const result = await callTool(client, toolName, { amount: 150000, orderId: 'ORD-001' });

    // 6. Verify response
    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe('text');
    const parsed = JSON.parse(content[0].text);
    expect(parsed.payUrl).toBe('https://example.com/pay');
    expect(parsed.amount).toBe(150000);
    expect(parsed._mock).toBe(true);
  });

  it('returns isError response for invalid input', async () => {
    const server = new McpServer({
      name: 'test-server',
      version: '0.0.1',
    });

    // Inline Zod schema for VND validation (per-server pattern)
    const VndAmountSchema = z.number().int().positive();

    server.tool(
      'test_validate_amount',
      'Validate a VND amount',
      { amount: z.number() },
      async (args) => {
        const parsed = VndAmountSchema.safeParse(args.amount);
        if (!parsed.success) {
          return formatToolError(new Error('Invalid VND amount: must be a positive integer'));
        }
        return { content: [{ type: 'text' as const, text: 'ok' }] };
      },
    );

    const client = await createTestClient(server);

    // Call with invalid amount (negative)
    const result = await callTool(client, 'test_validate_amount', { amount: -100 });
    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain('Invalid VND amount');
  });
});
