import { ResultManager } from '../../../src/managers/ResultManager';
import { TestRailApiClient } from '../../../src/client/TestRailApiClient';
import { TestCaseInfo, TestCase, TestRailError } from '../../../src/types';

// Mock the API client
jest.mock('../../../src/client/TestRailApiClient');
const MockedTestRailApiClient = TestRailApiClient as jest.MockedClass<typeof TestRailApiClient>;

describe('ResultManager', () => {
  let resultManager: ResultManager;
  let mockClient: jest.Mocked<TestRailApiClient>;
  const projectId = 1;
  const runId = 123;
  const sectionId = 456;

  beforeEach(() => {
    mockClient = new MockedTestRailApiClient({} as any) as jest.Mocked<TestRailApiClient>;
    resultManager = new ResultManager(mockClient, projectId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitTestResults', () => {
    const mockTestCases: TestCaseInfo[] = [
      {
        title: 'Test Case 1',
        tags: ['smoke'],
        status: 'passed',
        duration: 5000
      },
      {
        title: 'Test Case 2',
        tags: ['regression'],
        status: 'failed',
        duration: 3000,
        error: { message: 'Test failed', stack: 'Error stack' }
      }
    ];

    const mockExistingCases: TestCase[] = [
      {
        id: 1,
        title: 'Test Case 1',
        section_id: sectionId,
        template_id: 1,
        type_id: 1,
        priority_id: 2,
        custom_case_custom_automation_type: 1,
        custom_case_custom_platform: 1,
        custom_steps_separated: [],
        assignedto_id: 0
      },
      {
        id: 2,
        title: 'Test Case 2',
        section_id: sectionId,
        template_id: 1,
        type_id: 1,
        priority_id: 2,
        custom_case_custom_automation_type: 1,
        custom_case_custom_platform: 1,
        custom_steps_separated: [],
        assignedto_id: 0
      }
    ];

    it('should submit test results successfully', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockExistingCases
      });

      mockClient.addResultsForCases.mockResolvedValue({
        statusCode: 200,
        body: { success: true }
      });

      const result = await resultManager.submitTestResults(
        runId,
        mockTestCases,
        sectionId,
        1
      );

      expect(result.submitted).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.getCases).toHaveBeenCalledWith(projectId, sectionId);
      expect(mockClient.addResultsForCases).toHaveBeenCalledWith(
        runId,
        expect.arrayContaining([
          expect.objectContaining({
            case_id: 1,
            status_id: 1, // Passed
            assignedto_id: 1,
            elapsed: 5
          }),
          expect.objectContaining({
            case_id: 2,
            status_id: 5, // Failed
            assignedto_id: 1,
            elapsed: 3
          })
        ])
      );
    });

    it('should handle missing test cases', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: [mockExistingCases[0]] // Only first case exists
      });

      mockClient.addResultsForCases.mockResolvedValue({
        statusCode: 200,
        body: { success: true }
      });

      const result = await resultManager.submitTestResults(
        runId,
        mockTestCases,
        sectionId
      );

      expect(result.submitted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Test Case 2');
    });

    it('should handle API submission errors', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockExistingCases
      });

      mockClient.addResultsForCases.mockRejectedValue(
        new TestRailError('Submission failed', 500)
      );

      const result = await resultManager.submitTestResults(
        runId,
        mockTestCases,
        sectionId
      );

      expect(result.submitted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to submit batch');
    });

    it('should process results in batches', async () => {
      // Create 75 test cases to test batching (batch size is 50)
      const largeCaseList: TestCaseInfo[] = Array.from({ length: 75 }, (_, i) => ({
        title: `Test Case ${i + 1}`,
        tags: ['test'],
        status: 'passed' as const,
        duration: 1000
      }));

      const largeExistingCases: TestCase[] = Array.from({ length: 75 }, (_, i) => ({
        id: i + 1,
        title: `Test Case ${i + 1}`,
        section_id: sectionId,
        template_id: 1,
        type_id: 1,
        priority_id: 2,
        custom_case_custom_automation_type: 1,
        custom_case_custom_platform: 1,
        custom_steps_separated: [],
        assignedto_id: 0
      }));

      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: largeExistingCases
      });

      mockClient.addResultsForCases.mockResolvedValue({
        statusCode: 200,
        body: { success: true }
      });

      const result = await resultManager.submitTestResults(
        runId,
        largeCaseList,
        sectionId
      );

      expect(result.submitted).toBe(75);
      expect(mockClient.addResultsForCases).toHaveBeenCalledTimes(2); // 2 batches
    });
  });

  describe('validateTestResults', () => {
    it('should validate correct test results', () => {
      const validTestCases: TestCaseInfo[] = [
        {
          title: 'Valid Test',
          tags: ['test'],
          status: 'passed',
          duration: 1000
        }
      ];

      const result = resultManager.validateTestResults(validTestCases);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
    });

    it('should identify invalid test results', () => {
      const invalidTestCases: TestCaseInfo[] = [
        {
          title: '',
          tags: ['test'],
          status: 'passed',
          duration: 1000
        },
        {
          title: 'Test 2',
          tags: 'invalid' as any, // Should be array
          status: 'passed',
          duration: -1 // Invalid duration
        }
      ];

      const result = resultManager.validateTestResults(invalidTestCases);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(2);
      expect(result.invalid[0]).toContain('Title is required');
      expect(result.invalid[1]).toContain('Tags must be an array');
      expect(result.invalid[1]).toContain('Duration must be a non-negative number');
    });
  });

  describe('getResultStatistics', () => {
    it('should return result statistics', async () => {
      const runWithStats = {
        id: runId,
        name: 'Test Run',
        passed_count: 10,
        failed_count: 3,
        blocked_count: 1,
        untested_count: 5,
        retest_count: 2
      };

      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: runWithStats
      });

      const result = await resultManager.getResultStatistics(runId);

      expect(result).toEqual({
        total: 21,
        passed: 10,
        failed: 3,
        blocked: 1,
        untested: 5,
        retest: 2,
        passRate: 48 // 10/21 * 100 rounded
      });
    });

    it('should handle missing statistics', async () => {
      const runWithoutStats = {
        id: runId,
        name: 'Test Run'
      };

      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: runWithoutStats
      });

      const result = await resultManager.getResultStatistics(runId);

      expect(result).toEqual({
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        untested: 0,
        retest: 0,
        passRate: 0
      });
    });
  });

  describe('updateTestResult', () => {
    it('should update individual test result', async () => {
      mockClient.addResultsForCases.mockResolvedValue({
        statusCode: 200,
        body: { success: true }
      });

      await resultManager.updateTestResult(
        runId,
        1,
        'passed',
        'Test passed successfully',
        5,
        1
      );

      expect(mockClient.addResultsForCases).toHaveBeenCalledWith(
        runId,
        [
          {
            case_id: 1,
            status_id: 1,
            assignedto_id: 1,
            comment: 'Test passed successfully',
            elapsed: 5
          }
        ]
      );
    });
  });

  describe('bulkUpdateResults', () => {
    it('should update results in bulk', async () => {
      const results = [
        { caseId: 1, status: 'passed' as const, comment: 'Test 1 passed' },
        { caseId: 2, status: 'failed' as const, comment: 'Test 2 failed' }
      ];

      mockClient.addResultsForCases.mockResolvedValue({
        statusCode: 200,
        body: { success: true }
      });

      const result = await resultManager.bulkUpdateResults(runId, results, 1);

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.addResultsForCases).toHaveBeenCalledTimes(2); // Called twice due to batch size of 1
      expect(mockClient.addResultsForCases).toHaveBeenNthCalledWith(1, runId, [
        expect.objectContaining({
          case_id: 1,
          status_id: 1,
          comment: 'Test 1 passed'
        })
      ]);
      expect(mockClient.addResultsForCases).toHaveBeenNthCalledWith(2, runId, [
        expect.objectContaining({
          case_id: 2,
          status_id: 5,
          comment: 'Test 2 failed'
        })
      ]);
    });

    it('should handle batch failures', async () => {
      const results = Array.from({ length: 30 }, (_, i) => ({
        caseId: i + 1,
        status: 'passed' as const
      }));

      mockClient.addResultsForCases
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { success: true }
        })
        .mockRejectedValueOnce(new TestRailError('Batch failed', 500));

      const result = await resultManager.bulkUpdateResults(runId, results, 25);

      expect(result.updated).toBe(25);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to update batch 2');
    });
  });

  describe('comment generation', () => {
    it('should generate detailed comment for failed test', async () => {
      const failedTest: TestCaseInfo = {
        title: 'Failed Test',
        tags: ['test'],
        status: 'failed',
        duration: 5000,
        error: {
          message: 'Assertion failed',
          stack: 'Error: Assertion failed\n    at test.js:10:5'
        },
        _steps: [
          { category: 'test.step', title: 'Step 1' },
          { category: 'test.step', title: 'Step 2', error: { message: 'Step failed' } }
        ]
      };

      const mockCase: TestCase = {
        id: 1,
        title: 'Failed Test',
        section_id: sectionId,
        template_id: 1,
        type_id: 1,
        priority_id: 2,
        custom_case_custom_automation_type: 1,
        custom_case_custom_platform: 1,
        custom_steps_separated: [],
        assignedto_id: 0
      };

      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: [mockCase]
      });

      mockClient.addResultsForCases.mockImplementation((runId, results: any[]) => {
        const result = results[0];
        expect(result.comment).toContain('Test Status: FAILED');
        expect(result.comment).toContain('Execution Time: 5s');
        expect(result.comment).toContain('Error Details:');
        expect(result.comment).toContain('Assertion failed');
        expect(result.comment).toContain('Stack Trace:');
        expect(result.comment).toContain('Test Steps:');
        expect(result.comment).toContain('1. Step 1');
        expect(result.comment).toContain('2. Step 2');
        expect(result.comment).toContain('Error: Step failed');

        return Promise.resolve({
          statusCode: 200,
          body: { success: true }
        });
      });

      await resultManager.submitTestResults(runId, [failedTest], sectionId);

      expect(mockClient.addResultsForCases).toHaveBeenCalled();
    });

    it('should format duration correctly', async () => {
      const testCases: TestCaseInfo[] = [
        { title: 'Short Test', tags: [], status: 'passed', duration: 1500 }, // 1.5s
        { title: 'Medium Test', tags: [], status: 'passed', duration: 65000 }, // 1m 5s
        { title: 'Long Test', tags: [], status: 'passed', duration: 3665000 } // 1h 1m 5s
      ];

      const mockCases: TestCase[] = testCases.map((tc, i) => ({
        id: i + 1,
        title: tc.title,
        section_id: sectionId,
        template_id: 1,
        type_id: 1,
        priority_id: 2,
        custom_case_custom_automation_type: 1,
        custom_case_custom_platform: 1,
        custom_steps_separated: [],
        assignedto_id: 0
      }));

      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockCases
      });

      mockClient.addResultsForCases.mockImplementation((runId, results: any[]) => {
        expect(results[0].comment).toContain('Execution Time: 1s'); // 1500ms rounds to 1s
        expect(results[1].comment).toContain('Execution Time: 1m 5s');
        expect(results[2].comment).toContain('Execution Time: 1h 1m 5s');

        return Promise.resolve({
          statusCode: 200,
          body: { success: true }
        });
      });

      await resultManager.submitTestResults(runId, testCases, sectionId);

      expect(mockClient.addResultsForCases).toHaveBeenCalled();
    });
  });
});