"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = exports.Priority = exports.AutomationType = exports.TestType = exports.TestTemplate = exports.TestStatus = void 0;
var TestStatus;
(function (TestStatus) {
    TestStatus[TestStatus["PASSED"] = 1] = "PASSED";
    TestStatus[TestStatus["INTERRUPTED"] = 2] = "INTERRUPTED";
    TestStatus[TestStatus["SKIPPED"] = 3] = "SKIPPED";
    TestStatus[TestStatus["TIMEOUT"] = 4] = "TIMEOUT";
    TestStatus[TestStatus["FAILED"] = 5] = "FAILED";
})(TestStatus || (exports.TestStatus = TestStatus = {}));
var TestTemplate;
(function (TestTemplate) {
    TestTemplate[TestTemplate["TEST_CASE_TEXT"] = 1] = "TEST_CASE_TEXT";
    TestTemplate[TestTemplate["TEST_CASE_STEP"] = 2] = "TEST_CASE_STEP";
    TestTemplate[TestTemplate["EXPLORATORY"] = 3] = "EXPLORATORY";
    TestTemplate[TestTemplate["BDD"] = 4] = "BDD";
})(TestTemplate || (exports.TestTemplate = TestTemplate = {}));
var TestType;
(function (TestType) {
    TestType[TestType["ACCEPTANCE"] = 1] = "ACCEPTANCE";
    TestType[TestType["ACCESSIBILITY"] = 2] = "ACCESSIBILITY";
    TestType[TestType["AUTOMATED"] = 3] = "AUTOMATED";
    TestType[TestType["COMPATIBILITY"] = 4] = "COMPATIBILITY";
    TestType[TestType["DESTRUCTIVE"] = 5] = "DESTRUCTIVE";
    TestType[TestType["FUNCTIONAL"] = 6] = "FUNCTIONAL";
    TestType[TestType["OTHER"] = 7] = "OTHER";
    TestType[TestType["PERFORMANCE"] = 8] = "PERFORMANCE";
    TestType[TestType["REGRESSION"] = 9] = "REGRESSION";
    TestType[TestType["SECURITY"] = 10] = "SECURITY";
    TestType[TestType["SMOKE_AND_SANITY"] = 11] = "SMOKE_AND_SANITY";
    TestType[TestType["USABILITY"] = 12] = "USABILITY";
    TestType[TestType["EXPLORATORY"] = 13] = "EXPLORATORY";
})(TestType || (exports.TestType = TestType = {}));
var AutomationType;
(function (AutomationType) {
    AutomationType[AutomationType["MANUAL"] = 1] = "MANUAL";
    AutomationType[AutomationType["AUTOMATABLE"] = 2] = "AUTOMATABLE";
    AutomationType[AutomationType["AUTOMATED"] = 3] = "AUTOMATED";
})(AutomationType || (exports.AutomationType = AutomationType = {}));
var Priority;
(function (Priority) {
    Priority[Priority["LOW"] = 1] = "LOW";
    Priority[Priority["MEDIUM"] = 2] = "MEDIUM";
    Priority[Priority["HIGH"] = 3] = "HIGH";
    Priority[Priority["CRITICAL"] = 4] = "CRITICAL";
})(Priority || (exports.Priority = Priority = {}));
var Platform;
(function (Platform) {
    Platform[Platform["API"] = 1] = "API";
    Platform[Platform["WEB_DESKTOP"] = 2] = "WEB_DESKTOP";
    Platform[Platform["WEB_RESPONSIVE"] = 3] = "WEB_RESPONSIVE";
    Platform[Platform["WEB_DESKTOP_AND_RESPONSIVE"] = 4] = "WEB_DESKTOP_AND_RESPONSIVE";
    Platform[Platform["MOBILE_APPLICATION"] = 5] = "MOBILE_APPLICATION";
    Platform[Platform["MIGRATION"] = 6] = "MIGRATION";
    Platform[Platform["OTHER"] = 7] = "OTHER";
})(Platform || (exports.Platform = Platform = {}));
