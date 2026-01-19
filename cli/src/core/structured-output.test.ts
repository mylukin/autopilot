import { describe, it, expect } from 'vitest';
import { StructuredOutputParser } from './structured-output';

describe('StructuredOutputParser', () => {
  describe('parseImplementationResult - Tool Calling Format', () => {
    it('should parse valid tool call with all fields', () => {
      const output = `
Task completed successfully!

<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"auth.signup.ui","status":"success","verification_passed":true,"tests_passing":"15/15","coverage":92,"files_modified":["src/auth/signup.ts","tests/auth/signup.test.ts"],"duration":"4m32s","acceptance_criteria_met":"3/3","confidence_score":0.95,"low_confidence_decisions":[],"notes":"Implemented signup form with validation"}</input>
</tool_call>

All done!`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('auth.signup.ui');
      expect(result.status).toBe('success');
      expect(result.verification_passed).toBe(true);
      expect(result.tests_passing).toBe('15/15');
      expect(result.coverage).toBe(92);
      expect(result.files_modified).toEqual(['src/auth/signup.ts', 'tests/auth/signup.test.ts']);
      expect(result.confidence_score).toBe(0.95);
      expect(result.notes).toBe('Implemented signup form with validation');
    });

    it('should parse tool call without optional fields', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test.task","status":"success","verification_passed":true,"tests_passing":"5/5","coverage":80,"files_modified":["test.ts"],"duration":"1m","acceptance_criteria_met":"1/1","notes":"Done"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('test.task');
      expect(result.status).toBe('success');
      expect(result.confidence_score).toBeUndefined();
      expect(result.low_confidence_decisions).toBeUndefined();
    });

    it('should parse failed task result', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"auth.login","status":"failed","verification_passed":false,"tests_passing":"0/5","coverage":0,"files_modified":[],"duration":"10m","acceptance_criteria_met":"0/3","notes":"Dependency missing"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.status).toBe('failed');
      expect(result.verification_passed).toBe(false);
      expect(result.notes).toBe('Dependency missing');
    });
  });

  describe('parseImplementationResult - JSON Block Format', () => {
    it('should parse JSON block format', () => {
      const output = `
Here's the result:

\`\`\`json
{
  "task_id": "auth.login.ui",
  "status": "success",
  "verification_passed": true,
  "tests_passing": "10/10",
  "coverage": 88,
  "files_modified": ["src/login.ts"],
  "duration": "3m",
  "acceptance_criteria_met": "2/2",
  "notes": "Login implemented"
}
\`\`\`

Done!`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('auth.login.ui');
      expect(result.status).toBe('success');
      expect(result.coverage).toBe(88);
    });
  });

  describe('parseImplementationResult - Legacy YAML Format', () => {
    it('should parse legacy YAML format with comma-separated arrays', () => {
      const output = `
Task complete!

---IMPLEMENTATION RESULT---
task_id: auth.login.ui
status: success
verification_passed: true
tests_passing: 12/12
coverage: 88
files_modified: src/auth/login.ts, tests/auth/login.test.ts
duration: 3m15s
acceptance_criteria_met: 2/2
notes: Login form implemented
---END IMPLEMENTATION RESULT---

All done!`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('auth.login.ui');
      expect(result.status).toBe('success');
      expect(result.verification_passed).toBe(true);
      expect(result.coverage).toBe(88);
      expect(result.files_modified).toEqual([
        'src/auth/login.ts',
        'tests/auth/login.test.ts',
      ]);
    });

    it('should parse YAML with alternative delimiters', () => {
      const output = `
---IMPLEMENTATION RESULTS---
task_id: test.task
status: success
verification_passed: true
tests_passing: 1/1
coverage: 100
files_modified: test.ts
duration: 1m
acceptance_criteria_met: 1/1
notes: Test
---END IMPLEMENTATION RESULTS---`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('test.task');
      expect(result.status).toBe('success');
    });

    it('should parse YAML with spaced delimiters', () => {
      const output = `
--- IMPLEMENTATION RESULT ---
task_id: spaced.task
status: success
verification_passed: true
tests_passing: 5/5
coverage: 90
files_modified: file.ts
duration: 2m
acceptance_criteria_met: 1/1
notes: Spaced delimiter test
---END  IMPLEMENTATION RESULT ---`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.task_id).toBe('spaced.task');
    });
  });

  describe('parseImplementationResult - Error Cases', () => {
    it('should throw error for output without structured result', () => {
      const output = 'This is just plain text without any structured output';

      expect(() => {
        StructuredOutputParser.parseImplementationResult(output);
      }).toThrow('Agent did not return structured output');
    });

    it('should throw error for invalid schema', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test","status":"invalid_status"}</input>
</tool_call>`;

      expect(() => {
        StructuredOutputParser.parseImplementationResult(output);
      }).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test"}</input>
</tool_call>`;

      expect(() => {
        StructuredOutputParser.parseImplementationResult(output);
      }).toThrow();
    });
  });

  describe('parseHealingResult', () => {
    it('should parse valid healing result', () => {
      const output = `
<tool_call>
<name>report_healing_result</name>
<input>{"task_id":"auth.login","status":"success","verification_passed":true,"attempts":1,"fix_type":"dependency","hypothesis":"Missing bcrypt dependency","solution_applied":"Installed bcrypt@5.1.0","notes":"Successfully installed missing dependency and all tests pass"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseHealingResult(output);

      expect(result.task_id).toBe('auth.login');
      expect(result.status).toBe('success');
      expect(result.verification_passed).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.fix_type).toBe('dependency');
      expect(result.hypothesis).toBe('Missing bcrypt dependency');
      expect(result.solution_applied).toBe('Installed bcrypt@5.1.0');
    });

    it('should parse healing failure', () => {
      const output = `
<tool_call>
<name>report_healing_result</name>
<input>{"task_id":"auth.login","status":"failed","verification_passed":false,"attempts":3,"fix_type":"unknown","hypothesis":"Could not determine root cause","notes":"Failed after 3 attempts"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseHealingResult(output);

      expect(result.status).toBe('failed');
      expect(result.verification_passed).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.fix_type).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiline notes in YAML', () => {
      const output = `
---IMPLEMENTATION RESULT---
task_id: test
status: success
verification_passed: true
tests_passing: 1/1
coverage: 100
files_modified: test.ts
duration: 1m
acceptance_criteria_met: 1/1
notes: This is a long note
---END IMPLEMENTATION RESULT---`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.notes).toBe('This is a long note');
    });

    it('should handle empty files_modified array', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test","status":"success","verification_passed":true,"tests_passing":"0/0","coverage":0,"files_modified":[],"duration":"1s","acceptance_criteria_met":"1/1","notes":"No files"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.files_modified).toEqual([]);
    });

    it('should handle confidence score edge values', () => {
      const output = `
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"test","status":"success","verification_passed":true,"tests_passing":"1/1","coverage":100,"files_modified":["test.ts"],"duration":"1m","acceptance_criteria_met":"1/1","confidence_score":1.0,"low_confidence_decisions":[],"notes":"Perfect confidence"}</input>
</tool_call>`;

      const result = StructuredOutputParser.parseImplementationResult(output);

      expect(result.confidence_score).toBe(1.0);
    });
  });
});
