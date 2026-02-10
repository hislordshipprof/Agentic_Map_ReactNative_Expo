/**
 * Clarification Prompts - Templates for generating clarifying questions
 *
 * Used by the Understanding Agent when NLU detects ambiguity.
 */

/**
 * System prompt for generating clarification questions
 */
export const CLARIFICATION_SYSTEM_PROMPT = `You are a helpful navigation assistant. Your task is to generate a natural, conversational clarifying question when the user's request is ambiguous.

Guidelines:
1. Be concise and friendly
2. Offer specific options when available
3. Don't ask multiple questions at once
4. Use natural speech patterns suitable for voice
5. Keep questions under 20 words when possible

Examples:
- "Did you mean the Starbucks on Main Street or the one near the mall?"
- "I found 3 gas stations nearby. Would you like Shell, BP, or Chevron?"
- "Just to confirm, you want to go to your home address, right?"
- "Which Walmart - the one on Oak Avenue or Highway 101?"`;

/**
 * Types of ambiguity that can trigger clarification
 */
export type AmbiguityType =
  | 'multiple_places' // Multiple places match the query
  | 'unclear_destination' // Destination is vague
  | 'unclear_intent' // Intent is uncertain
  | 'missing_info' // Required information is missing
  | 'confirmation_needed'; // Action needs confirmation

/**
 * Context for generating a clarification
 */
export interface ClarificationContext {
  type: AmbiguityType;
  originalUtterance: string;
  intent?: string;
  confidence?: number;

  // For multiple_places
  candidates?: Array<{
    name: string;
    address?: string;
    distance?: string;
    rating?: number;
  }>;

  // For unclear_destination
  possibleDestinations?: string[];

  // For unclear_intent
  possibleIntents?: Array<{
    intent: string;
    description: string;
  }>;

  // For missing_info
  missingFields?: string[];

  // For confirmation_needed
  actionToConfirm?: string;
  details?: string;
}

/**
 * Generate prompt for clarification
 */
export function buildClarificationPrompt(context: ClarificationContext): string {
  const parts: string[] = [];

  parts.push(CLARIFICATION_SYSTEM_PROMPT);
  parts.push('\n---\n');
  parts.push(`User said: "${context.originalUtterance}"`);

  switch (context.type) {
    case 'multiple_places':
      parts.push('\nSituation: Multiple places match the request.');
      if (context.candidates && context.candidates.length > 0) {
        parts.push('Options found:');
        context.candidates.slice(0, 4).forEach((c, i) => {
          let desc = `${i + 1}. ${c.name}`;
          if (c.address) desc += ` (${c.address})`;
          if (c.distance) desc += ` - ${c.distance}`;
          parts.push(desc);
        });
      }
      parts.push('\nGenerate a question asking which one they prefer.');
      break;

    case 'unclear_destination':
      parts.push('\nSituation: The destination is unclear or vague.');
      if (context.possibleDestinations && context.possibleDestinations.length > 0) {
        parts.push(`Possible interpretations: ${context.possibleDestinations.join(', ')}`);
      }
      parts.push('\nGenerate a question to clarify the destination.');
      break;

    case 'unclear_intent':
      parts.push('\nSituation: The user\'s intent is uncertain.');
      parts.push(`Confidence level: ${(context.confidence || 0) * 100}%`);
      if (context.possibleIntents && context.possibleIntents.length > 0) {
        parts.push('Possible intents:');
        context.possibleIntents.forEach((i) => {
          parts.push(`- ${i.intent}: ${i.description}`);
        });
      }
      parts.push('\nGenerate a question to understand what they want.');
      break;

    case 'missing_info':
      parts.push('\nSituation: Required information is missing.');
      if (context.missingFields && context.missingFields.length > 0) {
        parts.push(`Missing: ${context.missingFields.join(', ')}`);
      }
      parts.push('\nGenerate a question to get the missing information.');
      break;

    case 'confirmation_needed':
      parts.push('\nSituation: The action needs user confirmation.');
      if (context.actionToConfirm) {
        parts.push(`Action: ${context.actionToConfirm}`);
      }
      if (context.details) {
        parts.push(`Details: ${context.details}`);
      }
      parts.push('\nGenerate a confirmation question.');
      break;
  }

  parts.push('\n---\n');
  parts.push('Generate ONLY the clarifying question, nothing else:');

  return parts.join('\n');
}

/**
 * Pre-built clarification templates for common scenarios
 * (Used when LLM is not needed for simple cases)
 */
export const CLARIFICATION_TEMPLATES = {
  // Multiple places found
  multiplePlaces: (category: string, count: number) =>
    `I found ${count} ${category} options nearby. Which one would you prefer?`,

  multiplePlacesWithOptions: (options: string[]) => {
    if (options.length === 2) {
      return `Would you like ${options[0]} or ${options[1]}?`;
    }
    const last = options.pop();
    return `Would you like ${options.join(', ')}, or ${last}?`;
  },

  // Destination unclear
  destinationUnclear: () =>
    `I'm not sure where you'd like to go. Could you give me an address or place name?`,

  destinationAmbiguous: (name: string) =>
    `There are a few places called ${name}. Could you be more specific?`,

  // Intent unclear
  intentUnclear: () =>
    `I'm not quite sure what you'd like to do. Could you tell me more?`,

  // Missing destination
  missingDestination: () =>
    `Where would you like to go?`,

  // Missing stops
  missingStops: () =>
    `Would you like to add any stops along the way?`,

  // Confirm route
  confirmRoute: (destination: string, stops: string[]) => {
    if (stops.length === 0) {
      return `Ready to navigate to ${destination}?`;
    }
    return `Ready to navigate to ${destination} with a stop at ${stops.join(' and ')}?`;
  },

  // Confirm significant detour
  confirmDetour: (stopName: string, extraTime: number) =>
    `Adding ${stopName} would add ${extraTime} minutes. Is that okay?`,

  // Confirm removal
  confirmRemoval: (stopName: string) =>
    `Should I remove ${stopName} from your route?`,
};

/**
 * Detect if clarification is needed based on NLU result
 */
export function needsClarification(nluResult: {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
}): { needed: boolean; type?: AmbiguityType; reason?: string } {
  // Low confidence - unclear intent
  if (nluResult.confidence < 0.6) {
    return {
      needed: true,
      type: 'unclear_intent',
      reason: `Confidence too low: ${nluResult.confidence}`,
    };
  }

  // Navigation without destination
  if (
    ['navigate', 'navigate_with_stops', 'navigate_direct'].includes(nluResult.intent) &&
    !nluResult.entities.destination
  ) {
    return {
      needed: true,
      type: 'missing_info',
      reason: 'Navigation intent but no destination specified',
    };
  }

  // Medium confidence with navigation - might want confirmation
  if (
    nluResult.confidence < 0.8 &&
    nluResult.confidence >= 0.6 &&
    ['navigate', 'navigate_with_stops', 'navigate_direct'].includes(nluResult.intent)
  ) {
    return {
      needed: true,
      type: 'confirmation_needed',
      reason: `Medium confidence: ${nluResult.confidence}`,
    };
  }

  return { needed: false };
}
