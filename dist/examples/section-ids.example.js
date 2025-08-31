"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLE_SECTION_IDS = void 0;
/**
 * Example section ID configuration
 * Copy this file and customize for your project's TestRail sections
 */
exports.EXAMPLE_SECTION_IDS = {
    backOffice: {
        merchantProfilePage: {
            validation: 402,
            business: 410
        },
        allTransactionsPage: 414,
        allClientsPage: 415,
        transactionDetailPage: 504,
        pageRedirects: 1968
    },
    // Add your own sections here
    api: {
        authentication: 100,
        userManagement: 101,
        payments: 102
    },
    frontend: {
        login: 200,
        dashboard: 201,
        settings: 202
    }
};
// Usage example:
// await testRailHelper.updateTestResult(
//   "My Test Run",
//   EXAMPLE_SECTION_IDS.backOffice.merchantProfilePage.validation, // 402
//   Platform.WEB_DESKTOP,
//   testResults
// );
