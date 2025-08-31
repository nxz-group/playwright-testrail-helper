import { TestCaseManager } from '../../../src/managers/TestCaseManager';
import { TestRailApiClient } from '../../../src/client/TestRailApiClient';
import { TestCaseInfo, TestCase, TestRailError } from '../../../src/types';

// Mock the API client
jest.mock('../../../src/client/TestRailApiClient');
const MockedTestRailApiClient = TestRailApiClient as jest.MockedClass<typeof TestRailApiClient>;

describe('TestCaseManager', () => {
  let testCaseManager: TestCaseManager;
  let mockClient: jest.Mocked<TestRailApiClient>;
  const projectId = 1;
  const sectionId = 123;

  beforeEach(() => {
    mockClient = new MockedTestRailApiClient({} as any) as jest.Mocked<TestRailApiClient>;
    testCaseManager = new TestCaseManager(mockClient, projectId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('synchronizeTestCases', () => {
    const mockTestCases: TestCaseInfo[] = [
      {
        title: 'Test Case 1',
        tags: ['smoke', 'high'],
        status: 'passed',
        duration: 5000
      },
      {
        title: 'Test Case 2',
        tags: ['regression', 'medium'],
        status: 'failed',
        duration: 3000,
        error: { message: 'Test failed' }
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
      }
    ];

    it('should synchronize test cases successfully', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockExistingCases
      });

      mockClient.updateCase.mockResolvedValue({
        statusCode: 200,
        body: mockExistingCases[0]
      });

      mockClient.addCase.mockResolvedValue({
        statusCode: 200,
        body: { id: 2, title: 'Test Case 2' } as TestCase
      });

      const result = await testCaseManager.synchronizeTestCases(sectionId, mockTestCases);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.getCases).toHaveBeenCalledWith(projectId, sectionId);
      expect(mockClient.updateCase).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockClient.addCase).toHaveBeenCalledWith(sectionId, expect.any(Object));
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: []
      });

      mockClient.addCase.mockRejectedValue(new TestRailError('API Error', 500));

      const result = await testCaseManager.synchronizeTestCases(sectionId, mockTestCases);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Test Case 1');
      expect(result.errors[1]).toContain('Test Case 2');
    });

    it('should handle empty test case list', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: []
      });

      const result = await testCaseManager.synchronizeTestCases(sectionId, []);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.getCases).toHaveBeenCalledWith(projectId, sectionId);
    });
  });

  describe('getTestCaseByTitle', () => {
    const mockCases: TestCase[] = [
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
      }
    ];

    it('should find test case by title', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockCases
      });

      const result = await testCaseManager.getTestCaseByTitle(sectionId, 'Test Case 1');

      expect(result).toEqual(mockCases[0]);
      expect(mockClient.getCases).toHaveBeenCalledWith(projectId, sectionId);
    });

    it('should return null for non-existent test case', async () => {
      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockCases
      });

      const result = await testCaseManager.getTestCaseByTitle(sectionId, 'Non-existent Case');

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      mockClient.getCases.mockRejectedValue(new TestRailError('API Error', 500));

      await expect(
        testCaseManager.getTestCaseByTitle(sectionId, 'Test Case 1')
      ).rejects.toThrow('API Error');
    });
  });

  describe('validateSection', () => {
    it('should return true for valid section', async () => {
      mockClient.getSections.mockResolvedValue({
        statusCode: 200,
        body: [
          { id: sectionId, name: 'Test Section', depth: 0, display_order: 1 }
        ]
      });

      const result = await testCaseManager.validateSection(sectionId);

      expect(result).toBe(true);
      expect(mockClient.getSections).toHaveBeenCalledWith(projectId);
    });

    it('should return false for invalid section', async () => {
      mockClient.getSections.mockResolvedValue({
        statusCode: 200,
        body: [
          { id: 999, name: 'Other Section', depth: 0, display_order: 1 }
        ]
      });

      const result = await testCaseManager.validateSection(sectionId);

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockClient.getSections.mockRejectedValue(new TestRailError('API Error', 500));

      const result = await testCaseManager.validateSection(sectionId);

      expect(result).toBe(false);
    });
  });

  describe('bulkCreateTestCases', () => {
    const mockTestCases: TestCaseInfo[] = [
      {
        title: 'Bulk Test 1',
        tags: ['smoke'],
        status: 'passed',
        duration: 1000
      },
      {
        title: 'Bulk Test 2',
        tags: ['regression'],
        status: 'passed',
        duration: 2000
      }
    ];

    it('should create test cases in bulk', async () => {
      mockClient.addCase.mockResolvedValue({
        statusCode: 200,
        body: { id: 1, title: 'Created Case' } as TestCase
      });

      const result = await testCaseManager.bulkCreateTestCases(sectionId, mockTestCases, 1);

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.addCase).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk creation', async () => {
      mockClient.addCase
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { id: 1, title: 'Created Case' } as TestCase
        })
        .mockRejectedValueOnce(new TestRailError('Creation failed', 400));

      const result = await testCaseManager.bulkCreateTestCases(sectionId, mockTestCases, 1);

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Bulk Test 2');
    });
  });

  describe('tag extraction', () => {
    it('should extract type information from tags', async () => {
      const testCase: TestCaseInfo = {
        title: 'Smoke Test',
        tags: ['smoke', 'high', 'web'],
        status: 'passed',
        duration: 1000
      };

      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: []
      });

      mockClient.addCase.mockImplementation((sectionId, caseData: any) => {
        expect(caseData.type_id).toBeDefined();
        expect(caseData.priority_id).toBeDefined();
        expect(caseData.custom_case_custom_platform).toBeDefined();
        return Promise.resolve({
          statusCode: 200,
          body: { id: 1, title: testCase.title } as TestCase
        });
      });

      await testCaseManager.synchronizeTestCases(sectionId, [testCase]);

      expect(mockClient.addCase).toHaveBeenCalled();
    });

    it('should handle test cases with steps', async () => {
      const testCase: TestCaseInfo = {
        title: 'Step Test',
        tags: ['functional'],
        status: 'passed',
        duration: 1000,
        _steps: [
          { category: 'test.step', title: 'Step 1' },
          { category: 'test.step', title: 'Step 2' }
        ]
      };

      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: []
      });

      mockClient.addCase.mockImplementation((sectionId, caseData: any) => {
        expect(caseData.template_id).toBe(2); // Steps template
        expect(caseData.custom_steps_separated).toHaveLength(2);
        return Promise.resolve({
          statusCode: 200,
          body: { id: 1, title: testCase.title } as TestCase
        });
      });

      await testCaseManager.synchronizeTestCases(sectionId, [testCase]);

      expect(mockClient.addCase).toHaveBeenCalled();
    });
  });
});