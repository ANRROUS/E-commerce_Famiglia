/**
 * TOON (Token-Oriented Object Notation) Parser
 * 
 * Utility to parse the TOON format used for optimized LLM communication.
 * TOON reduces token usage by using a pipe-separated format with schema headers.
 * 
 * Format Example:
 * THOUGHT: Reasoning here
 * TOOL: toolName | param1: value1 | param2: value2
 * FEEDBACK: User feedback here
 */

export function parseToonResponse(text) {
    try {
        const result = {
            reasoning: '',
            steps: [],
            userFeedback: '',
            raw: text
        };

        const lines = text.split('\n');
        let inFeedback = false;
        let feedbackLines = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('THOUGHT:')) {
                result.reasoning = trimmedLine.substring(8).trim();
                inFeedback = false;
            }
            else if (trimmedLine.startsWith('FEEDBACK:')) {
                // Start capturing feedback (multiline)
                feedbackLines = [trimmedLine.substring(9).trim()];
                inFeedback = true;
            }
            else if (trimmedLine.startsWith('TOOL:')) {
                // End feedback capture when we hit a TOOL line
                inFeedback = false;

                // Parse tool line: TOOL: name | param1: val1 | param2: val2
                const parts = trimmedLine.substring(5).split('|').map(p => p.trim());
                const toolName = parts[0];
                const params = {};

                // Parse params (starting from index 1)
                for (let i = 1; i < parts.length; i++) {
                    const paramPart = parts[i];
                    const colonIndex = paramPart.indexOf(':');

                    if (colonIndex !== -1) {
                        const key = paramPart.substring(0, colonIndex).trim();
                        let value = paramPart.substring(colonIndex + 1).trim();

                        // Try to parse numbers or booleans
                        if (value === 'true') value = true;
                        else if (value === 'false') value = false;
                        else if (!isNaN(Number(value)) && value !== '') value = Number(value);

                        // Remove quotes if present
                        if (typeof value === 'string' &&
                            ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'")))) {
                            value = value.substring(1, value.length - 1);
                        }

                        params[key] = value;
                    }
                }

                result.steps.push({
                    tool: toolName,
                    params: params
                });
            }
            else if (inFeedback) {
                // Continue capturing feedback lines
                feedbackLines.push(trimmedLine);
            }
        }

        // Join all feedback lines with newlines
        result.userFeedback = feedbackLines.join('\n');

        // Validation
        if (!result.userFeedback && result.reasoning) {
            // Fallback if no explicit feedback
            result.userFeedback = "Procesando tu solicitud.";
        }

        return result;
    } catch (error) {
        console.error('[TOON Parser] Error parsing response:', error);
        throw new Error(`Failed to parse TOON response: ${error.message}`);
    }
}

export function formatToonSchema(tools) {
    let schema = "TOON.schema: Tool | Description | Params\n";

    for (const tool of tools) {
        const params = Object.entries(tool.parameters?.properties || {})
            .map(([key, prop]) => `${key}:${prop.type}`)
            .join(', ');

        schema += `${tool.name} | ${tool.description} | ${params || 'none'}\n`;
    }

    return schema;
}
