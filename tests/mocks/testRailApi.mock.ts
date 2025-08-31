import type { ApiResponse } from '../../src/types';

/**
 * Mock responses for TestRail API calls
 */
export const mockApiResponses = {
  // User responses
  getUserByEmail: {
    success: {
      statusCode: 200,
      body: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        is_active: true,
      },
    } as ApiResponse,
    notFound: {
      statusCode: 400,
      body: {
        error: 'Field :email is not a valid email address.',
      },
    } as ApiResponse,
  },

  // Test case responses
  getCases: {
    success: {
      statusCode: 200,
      body: {
        cases: [
          {
            id: 1,
            title: 'Test Case 1',
            section_id: 100,
            type_id: 1,
            priority_id: 2,
          },
          {
            id: 2,
            title: 'Test Case 2',
            section_id: 100,
            type_id: 2,
            priority_id: 3,
          },
        ],
        _links: {
          next: null,
          prev: null,
        },
      },
    } as ApiResponse,
    empty: {
      statusCode: 200,
      body: {
        cases: [],
        _links: {
          next: null,
          prev: null,
        },
      },
    } as ApiResponse,
  },

  addCase: {
    success: {
      statusCode: 200,
      body: {
        id: 123,
        title: 'New Test Case',
        section_id: 100,
        type_id: 1,
        priority_id: 2,
        created_on: 1640995200,
        created_by: 1,
      },
    } as ApiResponse,
  },

  updateCase: {
    success: {
      statusCode: 200,
      body: {
        id: 123,
        title: 'Updated Test Case',
        section_id: 100,
        type_id: 1,
        priority_id: 2,
        updated_on: 1640995200,
        updated_by: 1,
      },
    } as ApiResponse,
  },

  // Test run responses
  addRun: {
    success: {
      statusCode: 200,
      body: {
        id: 456,
        name: 'Test Run',
        assignedto_id: 1,
        include_all: false,
        case_ids: [1, 2, 3],
        is_completed: false,
        created_on: 1640995200,
        created_by: 1,
      },
    } as ApiResponse,
  },

  getRun: {
    success: {
      statusCode: 200,
      body: {
        id: 456,
        name: 'Test Run',
        assignedto_id: 1,
        include_all: false,
        case_ids: [1, 2, 3],
        is_completed: false,
        created_on: 1640995200,
        created_by: 1,
      },
    } as ApiResponse,
    completed: {
      statusCode: 200,
      body: {
        id: 456,
        name: 'Test Run',
        assignedto_id: 1,
        include_all: false,
        case_ids: [1, 2, 3],
        is_completed: true,
        completed_on: 1640995300,
        created_on: 1640995200,
        created_by: 1,
      },
    } as ApiResponse,
  },

  updateRun: {
    success: {
      statusCode: 200,
      body: {
        id: 456,
        name: 'Updated Test Run',
        assignedto_id: 1,
        include_all: false,
        case_ids: [1, 2, 3, 4],
        is_completed: false,
        updated_on: 1640995250,
        created_on: 1640995200,
        created_by: 1,
      },
    } as ApiResponse,
  },

  closeRun: {
    success: {
      statusCode: 200,
      body: {
        id: 456,
        name: 'Test Run',
        assignedto_id: 1,
        include_all: false,
        case_ids: [1, 2, 3],
        is_completed: true,
        completed_on: 1640995300,
        created_on: 1640995200,
        created_by: 1,
      },
    } as ApiResponse,
  },

  // Test result responses
  addResultsForCases: {
    success: {
      statusCode: 200,
      body: [
        {
          id: 1001,
          test_id: 1,
          status_id: 1,
          comment: 'Test passed',
          created_on: 1640995200,
          created_by: 1,
        },
        {
          id: 1002,
          test_id: 2,
          status_id: 5,
          comment: 'Test failed',
          created_on: 1640995200,
          created_by: 1,
        },
      ],
    } as ApiResponse,
  },

  // Project responses
  getProject: {
    success: {
      statusCode: 200,
      body: {
        id: 1,
        name: 'Test Project',
        announcement: '',
        show_announcement: false,
        is_completed: false,
        completed_on: null,
        suite_mode: 1,
        default_role_id: 7,
      },
    } as ApiResponse,
  },

  // Section responses
  getSections: {
    success: {
      statusCode: 200,
      body: {
        sections: [
          {
            id: 100,
            name: 'Test Section 1',
            parent_id: null,
            depth: 0,
            display_order: 1,
          },
          {
            id: 101,
            name: 'Test Section 2',
            parent_id: 100,
            depth: 1,
            display_order: 2,
          },
        ],
      },
    } as ApiResponse,
  },

  // Error responses
  errors: {
    unauthorized: {
      statusCode: 401,
      body: {
        error: 'Authentication failed: invalid or missing user/password or session cookie.',
      },
    } as ApiResponse,
    forbidden: {
      statusCode: 403,
      body: {
        error: 'Forbidden: You are not allowed to access this resource.',
      },
    } as ApiResponse,
    notFound: {
      statusCode: 404,
      body: {
        error: 'Not Found: The requested resource does not exist or has been deleted.',
      },
    } as ApiResponse,
    serverError: {
      statusCode: 500,
      body: {
        error: 'Internal Server Error: An error occurred while processing the request.',
      },
    } as ApiResponse,
    rateLimited: {
      statusCode: 429,
      body: {
        error: 'Too Many Requests: Rate limit exceeded.',
      },
    } as ApiResponse,
  },
};

/**
 * Mock fetch function for testing
 */
export const createMockFetch = (responses: Record<string, ApiResponse>) => {
  return jest.fn().mockImplementation((url: string, options: RequestInit) => {
    const method = options.method || 'GET';
    const endpoint = url.split('?')[1] || '';
    const key = `${method}:${endpoint}`;

    const response = responses[key];
    if (!response) {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Mock endpoint not found' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Mock endpoint not found' })),
        headers: new Map([['content-type', 'application/json']]),
      });
    }

    return Promise.resolve({
      ok: response.statusCode >= 200 && response.statusCode < 300,
      status: response.statusCode,
      statusText: response.statusCode === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(response.body),
      text: () => Promise.resolve(JSON.stringify(response.body)),
      headers: new Map([
        ['content-type', 'application/json'],
        ...Object.entries(response.headers || {}),
      ]),
    });
  });
};

/**
 * Helper to create delayed mock responses (for testing timeouts)
 */
export const createDelayedMockFetch = (delay: number, response: ApiResponse) => {
  return jest.fn().mockImplementation(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusCode === 200 ? 'OK' : 'Error',
          json: () => Promise.resolve(response.body),
          text: () => Promise.resolve(JSON.stringify(response.body)),
          headers: new Map(),
        });
      }, delay);
    });
  });
};

/**
 * Helper to create mock fetch that fails after certain attempts
 */
export const createRetryMockFetch = (failAttempts: number, finalResponse: ApiResponse) => {
  let attemptCount = 0;

  return jest.fn().mockImplementation(() => {
    attemptCount++;

    if (attemptCount <= failAttempts) {
      return Promise.reject(new Error('Network error'));
    }

    return Promise.resolve({
      ok: finalResponse.statusCode >= 200 && finalResponse.statusCode < 300,
      status: finalResponse.statusCode,
      statusText: finalResponse.statusCode === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(finalResponse.body),
      text: () => Promise.resolve(JSON.stringify(finalResponse.body)),
      headers: new Map(),
    });
  });
};
