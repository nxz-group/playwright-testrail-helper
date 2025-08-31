import { TestRailApiClient } from '../client/TestRailApiClient';
import { 
  TestCase, 
  TestCaseInfo, 
  TestRailError, 
  ValidationError,
  TestRailSection,
  ApiResponse 
} from '../types';
import { Logger } from '../utils/Logger';
import { 
  TEST_RAIL_TYPE, 
  TEST_RAIL_PRIORITY, 
  TYPE_MAPPING, 
  PRIORITY_MAPPING 
} from '../config/constants';

/**
 * Manages TestRail test case operations including synchronization and updates
 */
export class TestCaseManager {
  private client: TestRailApiClient;
  private logger: Logger;
  private projectId: number;

  constructor(client: TestRailApiClient, projectId: number) {
    this.client = client;
    this.projectId = projectId;
    this.logger = new Logger('TestCaseManager');
  }

  /**
   * Synchronize test cases from Playwright tests to TestRail
   */
  async synchronizeTestCases(
    sectionId: number,
    testCases: TestCaseInfo[]
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    this.logger.info('Starting test case synchronization', {
      sectionId,
      testCaseCount: testCases.length
    });

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Get existing test cases in the section
    const existingCases = await this.getExistingCases(sectionId);
    const existingCaseMap = new Map(
      existingCases.map(testCase => [testCase.title.toLowerCase().trim(), testCase])
    );

    for (const testCase of testCases) {
      try {
        const normalizedTitle = testCase.title.toLowerCase().trim();
        const existingCase = existingCaseMap.get(normalizedTitle);

        if (existingCase) {
          // Update existing case
          await this.updateTestCase(existingCase.id, testCase);
          results.updated++;
          this.logger.debug('Updated test case', { 
            caseId: existingCase.id, 
            title: testCase.title 
          });
        } else {
          // Create new case
          const newCase = await this.createTestCase(sectionId, testCase);
          results.created++;
          this.logger.debug('Created test case', { 
            caseId: newCase.id, 
            title: testCase.title 
          });
        }
      } catch (error) {
        const errorMessage = `Failed to sync case "${testCase.title}": ${(error as Error).message}`;
        results.errors.push(errorMessage);
        this.logger.error('Test case sync error', { 
          title: testCase.title, 
          error: (error as Error).message 
        });
      }
    }

    this.logger.info('Test case synchronization completed', results);
    return results;
  }

  /**
   * Get existing test cases in a section
   */
  private async getExistingCases(sectionId: number): Promise<TestCase[]> {
    try {
      const response = await this.client.getCases(this.projectId, sectionId);
      
      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get test cases: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      return Array.isArray(response.body) ? response.body as TestCase[] : [];
    } catch (error) {
      this.logger.error('Failed to get existing test cases', { 
        sectionId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Create a new test case in TestRail
   */
  private async createTestCase(sectionId: number, testCase: TestCaseInfo): Promise<TestCase> {
    const testRailCase = this.convertToTestRailCase(testCase);
    
    try {
      const response = await this.client.addCase(sectionId, testRailCase);
      
      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to create test case: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      return response.body as TestCase;
    } catch (error) {
      this.logger.error('Failed to create test case', { 
        title: testCase.title, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Update an existing test case in TestRail
   */
  private async updateTestCase(caseId: number, testCase: TestCaseInfo): Promise<TestCase> {
    const testRailCase = this.convertToTestRailCase(testCase);
    
    try {
      const response = await this.client.updateCase(caseId, testRailCase);
      
      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to update test case: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      return response.body as TestCase;
    } catch (error) {
      this.logger.error('Failed to update test case', { 
        caseId, 
        title: testCase.title, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Convert Playwright test case to TestRail format
   */
  private convertToTestRailCase(testCase: TestCaseInfo): Partial<TestCase> {
    const { type, priority, platform } = this.extractTagInfo(testCase.tags);
    
    const testRailCase: Partial<TestCase> = {
      title: testCase.title,
      template_id: 1, // Text template
      type_id: TYPE_MAPPING[type] || TEST_RAIL_TYPE.OTHER,
      priority_id: PRIORITY_MAPPING[priority] || TEST_RAIL_PRIORITY.MEDIUM,
      custom_case_custom_automation_type: 1, // Automated
      custom_case_custom_platform: platform || 1 // Default platform
    };

    // Add test steps if available
    if (testCase._steps && testCase._steps.length > 0) {
      testRailCase.template_id = 2; // Steps template
      testRailCase.custom_steps_separated = testCase._steps.map(step => ({
        content: step.title,
        expected: step.error ? `Should not fail: ${step.error.message}` : 'Step should complete successfully'
      }));
    }

    return testRailCase;
  }

  /**
   * Extract type, priority, and platform information from test tags
   */
  private extractTagInfo(tags: string[]): {
    type: keyof typeof TYPE_MAPPING;
    priority: keyof typeof PRIORITY_MAPPING;
    platform: number;
  } {
    let type: keyof typeof TYPE_MAPPING = 'other';
    let priority: keyof typeof PRIORITY_MAPPING = 'medium';
    let platform = 1; // Default platform

    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      
      // Extract type information
      if (lowerTag.includes('smoke')) {
        type = 'smoke';
      } else if (lowerTag.includes('regression')) {
        type = 'regression';
      } else if (lowerTag.includes('functional')) {
        type = 'functional';
      } else if (lowerTag.includes('integration')) {
        type = 'integration';
      } else if (lowerTag.includes('performance')) {
        type = 'performance';
      } else if (lowerTag.includes('security')) {
        type = 'security';
      } else if (lowerTag.includes('usability')) {
        type = 'usability';
      } else if (lowerTag.includes('compatibility')) {
        type = 'compatibility';
      }

      // Extract priority information
      if (lowerTag.includes('critical') || lowerTag.includes('high')) {
        priority = 'high';
      } else if (lowerTag.includes('low')) {
        priority = 'low';
      } else if (lowerTag.includes('medium')) {
        priority = 'medium';
      }

      // Extract platform information (simplified mapping)
      if (lowerTag.includes('web') || lowerTag.includes('browser')) {
        platform = 1;
      } else if (lowerTag.includes('mobile') || lowerTag.includes('android') || lowerTag.includes('ios')) {
        platform = 2;
      } else if (lowerTag.includes('api')) {
        platform = 3;
      }
    }

    return { type, priority, platform };
  }

  /**
   * Get test case by title
   */
  async getTestCaseByTitle(sectionId: number, title: string): Promise<TestCase | null> {
    try {
      const cases = await this.getExistingCases(sectionId);
      const normalizedTitle = title.toLowerCase().trim();
      
      return cases.find(testCase => 
        testCase.title.toLowerCase().trim() === normalizedTitle
      ) || null;
    } catch (error) {
      this.logger.error('Failed to get test case by title', { 
        title, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Validate section exists and is accessible
   */
  async validateSection(sectionId: number): Promise<boolean> {
    try {
      const response = await this.client.getSections(this.projectId);
      
      if (response.statusCode !== 200) {
        throw new TestRailError(
          `Failed to get sections: ${response.statusCode}`,
          response.statusCode,
          response.body
        );
      }

      const sections = response.body as TestRailSection[];
      return sections.some(section => section.id === sectionId);
    } catch (error) {
      this.logger.error('Failed to validate section', { 
        sectionId, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  /**
   * Bulk create test cases with batch processing
   */
  async bulkCreateTestCases(
    sectionId: number, 
    testCases: TestCaseInfo[],
    batchSize = 10
  ): Promise<{ created: TestCase[]; errors: string[] }> {
    this.logger.info('Starting bulk test case creation', {
      sectionId,
      testCaseCount: testCases.length,
      batchSize
    });

    const results = {
      created: [] as TestCase[],
      errors: [] as string[]
    };

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (testCase) => {
        try {
          const created = await this.createTestCase(sectionId, testCase);
          results.created.push(created);
        } catch (error) {
          const errorMessage = `Failed to create case "${testCase.title}": ${(error as Error).message}`;
          results.errors.push(errorMessage);
        }
      });

      await Promise.all(batchPromises);
      
      // Add small delay between batches to respect rate limits
      if (i + batchSize < testCases.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.info('Bulk test case creation completed', {
      created: results.created.length,
      errors: results.errors.length
    });

    return results;
  }
}