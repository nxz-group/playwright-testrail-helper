import { TestRunManager } from '../../../src/managers/TestRunManager';
import { TestRailApiClient } from '../../../src/client/TestRailApiClient';
import { TestRun, TestCase, TestRailError, ValidationError } from '../../../src/types';

// Mock the API client
jest.mock('../../../src/client/TestRailApiClient');
const MockedTestRailApiClient = TestRailApiClient as jest.MockedClass<typeof TestRailApiClient>;

describe('TestRunManager', () => {
  let testRunManager: TestRunManager;
  let mockClient: jest.Mocked<TestRailApiClient>;
  const projectId = 1;

  beforeEach(() => {
    mockClient = new MockedTestRailApiClient({} as any) as jest.Mocked<TestRailApiClient>;
    testRunManager = new TestRunManager(mockClient, projectId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTestRun', () => {
    const mockRun: TestRun = {
      id: 1,
      name: 'Test Run 1',
      assignedto_id: 1,
      include_all: false,
      case_ids: [1, 2, 3]
    };

    it('should create test run with specific cases', async () => {
      mockClient.addRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      const result = await testRunManager.createTestRun({
        name: 'Test Run 1',
        caseIds: [1, 2, 3],
        assignedToId: 1
      });

      expect(result).toEqual(mockRun);
      expect(mockClient.addRun).toHaveBeenCalledWith(projectId, {
        name: 'Test Run 1',
        include_all: false,
        assignedto_id: 1,
        case_ids: [1, 2, 3]
      });
    });

    it('should create test run with all cases', async () => {
      const allCasesRun = { ...mockRun, include_all: true };
      mockClient.addRun.mockResolvedValue({
        statusCode: 200,
        body: allCasesRun
      });

      const result = await testRunManager.createTestRun({
        name: 'Test Run 1',
        includeAll: true
      });

      expect(result.include_all).toBe(true);
      expect(mockClient.addRun).toHaveBeenCalledWith(projectId, {
        name: 'Test Run 1',
        include_all: true
      });
    });

    it('should create test run with section cases', async () => {
      const mockCases: TestCase[] = [
        { id: 1, title: 'Case 1' } as TestCase,
        { id: 2, title: 'Case 2' } as TestCase
      ];

      mockClient.getCases.mockResolvedValue({
        statusCode: 200,
        body: mockCases
      });

      mockClient.addRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      const result = await testRunManager.createTestRun({
        name: 'Test Run 1',
        sectionId: 123
      });

      expect(mockClient.getCases).toHaveBeenCalledWith(projectId, 123);
      expect(mockClient.addRun).toHaveBeenCalledWith(projectId, {
        name: 'Test Run 1',
        include_all: false,
        case_ids: [1, 2]
      });
    });

    it('should validate required fields', async () => {
      await expect(
        testRunManager.createTestRun({ name: '' })
      ).rejects.toThrow(ValidationError);

      await expect(
        testRunManager.createTestRun({ 
          name: 'Test Run',
          includeAll: false
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should handle API errors', async () => {
      mockClient.addRun.mockResolvedValue({
        statusCode: 400,
        body: { error: 'Bad request' }
      });

      await expect(
        testRunManager.createTestRun({
          name: 'Test Run 1',
          includeAll: true
        })
      ).rejects.toThrow(TestRailError);
    });
  });

  describe('getTestRun', () => {
    const mockRun: TestRun = {
      id: 1,
      name: 'Test Run 1',
      assignedto_id: 1,
      include_all: false
    };

    it('should get test run by ID', async () => {
      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      const result = await testRunManager.getTestRun(1);

      expect(result).toEqual(mockRun);
      expect(mockClient.getRun).toHaveBeenCalledWith(1);
    });

    it('should handle not found error', async () => {
      mockClient.getRun.mockResolvedValue({
        statusCode: 404,
        body: { error: 'Not found' }
      });

      await expect(
        testRunManager.getTestRun(999)
      ).rejects.toThrow('Test run 999 not found');
    });
  });

  describe('updateTestRun', () => {
    const mockRun: TestRun = {
      id: 1,
      name: 'Updated Run',
      assignedto_id: 2,
      include_all: false
    };

    it('should update test run', async () => {
      mockClient.updateRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      const result = await testRunManager.updateTestRun(1, {
        name: 'Updated Run',
        assignedToId: 2
      });

      expect(result).toEqual(mockRun);
      expect(mockClient.updateRun).toHaveBeenCalledWith(1, {
        name: 'Updated Run',
        assignedto_id: 2
      });
    });

    it('should validate update data', async () => {
      await expect(
        testRunManager.updateTestRun(1, {})
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('closeTestRun', () => {
    const mockRun: TestRun = {
      id: 1,
      name: 'Closed Run',
      assignedto_id: 1,
      include_all: false
    };

    it('should close test run', async () => {
      mockClient.closeRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      const result = await testRunManager.closeTestRun(1);

      expect(result).toEqual(mockRun);
      expect(mockClient.closeRun).toHaveBeenCalledWith(1);
    });
  });

  describe('getTestRuns', () => {
    const mockRuns: TestRun[] = [
      { id: 1, name: 'Run 1', assignedto_id: 1, include_all: false },
      { id: 2, name: 'Run 2', assignedto_id: 1, include_all: false }
    ];

    it('should get all test runs', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: mockRuns
      });

      const result = await testRunManager.getTestRuns();

      expect(result).toEqual(mockRuns);
      expect(mockClient.getRuns).toHaveBeenCalledWith(projectId, undefined);
    });

    it('should get completed test runs', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: mockRuns
      });

      const result = await testRunManager.getTestRuns({ isCompleted: true });

      expect(result).toEqual(mockRuns);
      expect(mockClient.getRuns).toHaveBeenCalledWith(projectId, true);
    });

    it('should apply pagination', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: mockRuns
      });

      const result = await testRunManager.getTestRuns({ 
        offset: 1, 
        limit: 1 
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockRuns[1]);
    });
  });

  describe('findTestRunByName', () => {
    const mockRuns: TestRun[] = [
      { id: 1, name: 'Run 1', assignedto_id: 1, include_all: false },
      { id: 2, name: 'Run 2', assignedto_id: 1, include_all: false }
    ];

    it('should find test run by name', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: mockRuns
      });

      const result = await testRunManager.findTestRunByName('Run 1');

      expect(result).toEqual(mockRuns[0]);
    });

    it('should return null for non-existent run', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: mockRuns
      });

      const result = await testRunManager.findTestRunByName('Non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateTestRun', () => {
    const mockRun: TestRun = {
      id: 1,
      name: 'Test Run',
      assignedto_id: 1,
      include_all: true
    };

    it('should return existing run when found', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: [mockRun]
      });

      const result = await testRunManager.getOrCreateTestRun({
        name: 'Test Run',
        includeAll: true
      });

      expect(result.run).toEqual(mockRun);
      expect(result.created).toBe(false);
      expect(mockClient.addRun).not.toHaveBeenCalled();
    });

    it('should create new run when not found', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: []
      });

      mockClient.addRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      const result = await testRunManager.getOrCreateTestRun({
        name: 'Test Run',
        includeAll: true
      });

      expect(result.run).toEqual(mockRun);
      expect(result.created).toBe(true);
      expect(mockClient.addRun).toHaveBeenCalled();
    });

    it('should reset existing run when requested', async () => {
      mockClient.getRuns.mockResolvedValue({
        statusCode: 200,
        body: [mockRun]
      });

      mockClient.closeRun.mockResolvedValue({
        statusCode: 200,
        body: mockRun
      });

      mockClient.addRun.mockResolvedValue({
        statusCode: 200,
        body: { ...mockRun, id: 2 }
      });

      const result = await testRunManager.getOrCreateTestRun({
        name: 'Test Run',
        includeAll: true,
        resetIfExists: true
      });

      expect(result.created).toBe(true);
      expect(mockClient.closeRun).toHaveBeenCalledWith(1);
      expect(mockClient.addRun).toHaveBeenCalled();
    });
  });

  describe('isTestRunCompleted', () => {
    it('should return true for completed run', async () => {
      const completedRun = {
        id: 1,
        name: 'Completed Run',
        assignedto_id: 1,
        include_all: false,
        completed_on: Date.now()
      };

      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: completedRun
      });

      const result = await testRunManager.isTestRunCompleted(1);

      expect(result).toBe(true);
    });

    it('should return false for active run', async () => {
      const activeRun = {
        id: 1,
        name: 'Active Run',
        assignedto_id: 1,
        include_all: false
      };

      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: activeRun
      });

      const result = await testRunManager.isTestRunCompleted(1);

      expect(result).toBe(false);
    });
  });

  describe('getTestRunStats', () => {
    it('should return test run statistics', async () => {
      const runWithStats = {
        id: 1,
        name: 'Test Run',
        assignedto_id: 1,
        include_all: false,
        passed_count: 5,
        failed_count: 2,
        blocked_count: 1,
        untested_count: 3,
        retest_count: 1
      };

      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: runWithStats
      });

      const result = await testRunManager.getTestRunStats(1);

      expect(result).toEqual({
        totalTests: 12,
        passedTests: 5,
        failedTests: 2,
        blockedTests: 1,
        untestedTests: 3,
        retestTests: 1
      });
    });

    it('should handle missing statistics', async () => {
      const runWithoutStats = {
        id: 1,
        name: 'Test Run',
        assignedto_id: 1,
        include_all: false
      };

      mockClient.getRun.mockResolvedValue({
        statusCode: 200,
        body: runWithoutStats
      });

      const result = await testRunManager.getTestRunStats(1);

      expect(result).toEqual({
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        blockedTests: 0,
        untestedTests: 0,
        retestTests: 0
      });
    });
  });
});