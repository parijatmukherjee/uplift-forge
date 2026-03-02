import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron modules
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
}));

vi.mock('electron-store', () => {
  const data: Record<string, unknown> = { config: null };
  return {
    default: class MockStore {
      constructor() {}
      get(key: string) { return data[key]; }
      set(key: string, value: unknown) { data[key] = value; }
    },
  };
});

// Import after mocks
import { buildUserPrompt, parseAiResponse, SYSTEM_PROMPT } from '../../src/main/services/ai.service.js';
import type { AiSuggestRequest } from '../../src/shared/types.js';

describe('ai.service', () => {
  describe('SYSTEM_PROMPT', () => {
    it('should instruct JSON array output', () => {
      expect(SYSTEM_PROMPT).toContain('JSON array');
    });

    it('should instruct 2-4 suggestions', () => {
      expect(SYSTEM_PROMPT).toContain('2-4');
    });
  });

  describe('buildUserPrompt', () => {
    const baseRequest: AiSuggestRequest = {
      metricKey: 'bug_ratio',
      metricLabel: 'Bug Ratio',
      currentValue: 0.25,
      previousValue: 0.18,
      trendDirection: 'up',
      trendPct: 39,
      helpContent: 'Percentage of completed tickets that are bugs.',
      context: 'team',
    };

    it('should include metric name and key', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('Bug Ratio');
      expect(prompt).toContain('bug_ratio');
    });

    it('should include current value', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('0.25');
    });

    it('should include previous value', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('0.18');
    });

    it('should include trend direction and percentage', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('up');
      expect(prompt).toContain('39%');
    });

    it('should include context level', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('team');
    });

    it('should include engineer name for individual context', () => {
      const req: AiSuggestRequest = {
        ...baseRequest,
        context: 'individual',
        engineerName: 'Alice',
      };
      const prompt = buildUserPrompt(req);
      expect(prompt).toContain('Alice');
      expect(prompt).toContain('individual');
    });

    it('should include team average when provided', () => {
      const req: AiSuggestRequest = {
        ...baseRequest,
        teamAverageValue: 0.15,
      };
      const prompt = buildUserPrompt(req);
      expect(prompt).toContain('0.15');
    });

    it('should include help content', () => {
      const prompt = buildUserPrompt(baseRequest);
      expect(prompt).toContain('Percentage of completed tickets that are bugs.');
    });

    it('should handle null previous value gracefully', () => {
      const req: AiSuggestRequest = {
        ...baseRequest,
        previousValue: null,
        trendDirection: null,
        trendPct: null,
      };
      const prompt = buildUserPrompt(req);
      expect(prompt).not.toContain('Previous period value');
      expect(prompt).not.toContain('Trend');
    });

    it('should handle null current value', () => {
      const req: AiSuggestRequest = {
        ...baseRequest,
        currentValue: null,
      };
      const prompt = buildUserPrompt(req);
      expect(prompt).toContain('N/A');
    });
  });

  describe('parseAiResponse', () => {
    it('should parse a valid JSON array', () => {
      const input = '["Suggestion 1", "Suggestion 2"]';
      expect(parseAiResponse(input)).toEqual(['Suggestion 1', 'Suggestion 2']);
    });

    it('should parse JSON array with whitespace', () => {
      const input = '  [\n  "First suggestion",\n  "Second suggestion"\n]  ';
      expect(parseAiResponse(input)).toEqual(['First suggestion', 'Second suggestion']);
    });

    it('should strip markdown code fences', () => {
      const input = '```json\n["Suggestion 1", "Suggestion 2"]\n```';
      expect(parseAiResponse(input)).toEqual(['Suggestion 1', 'Suggestion 2']);
    });

    it('should strip code fences without language tag', () => {
      const input = '```\n["A", "B", "C"]\n```';
      expect(parseAiResponse(input)).toEqual(['A', 'B', 'C']);
    });

    it('should extract JSON array from surrounding text', () => {
      const input = 'Here are the suggestions:\n["Do this", "Do that"]\nHope that helps!';
      expect(parseAiResponse(input)).toEqual(['Do this', 'Do that']);
    });

    it('should return empty array for non-string arrays', () => {
      const input = '[1, 2, 3]';
      expect(parseAiResponse(input)).toEqual([]);
    });

    it('should return empty array for completely invalid input', () => {
      expect(parseAiResponse('This is not JSON at all')).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(parseAiResponse('')).toEqual([]);
    });

    it('should return empty array for JSON objects (not arrays)', () => {
      expect(parseAiResponse('{"suggestion": "Do this"}')).toEqual([]);
    });

    it('should handle 4 suggestions', () => {
      const input = '["A", "B", "C", "D"]';
      expect(parseAiResponse(input)).toHaveLength(4);
    });
  });
});
