/**
 * MCP tool naming convention: {service}_{verb}_{noun}
 * Examples: momo_create_payment, zalopay_query_order, zalo_oa_send_message
 *
 * Pattern: lowercase letters and digits, separated by underscores,
 * minimum 3 segments (service, verb, noun).
 * Service name can contain underscores (e.g., zalo_oa).
 */
export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*){2,}$/;

/**
 * Validate that a tool name follows the {service}_{verb}_{noun} convention.
 */
export function validateToolName(name: string): boolean {
  return TOOL_NAME_PATTERN.test(name);
}
