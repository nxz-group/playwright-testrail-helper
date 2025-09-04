"use strict";
/**
 * Core module - Optimized for serial execution
 * No worker coordination, no file persistence, minimal parsing
 * Target bundle size: ~25k (70% reduction from full version)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationType = exports.TestTemplate = exports.TestType = exports.Priority = exports.Platform = exports.TestStatus = exports.onTestRailHelper = void 0;
var core_helper_1 = require("./core-helper");
Object.defineProperty(exports, "onTestRailHelper", { enumerable: true, get: function () { return core_helper_1.onTestRailHelper; } });
var constants_1 = require("./utils/constants");
Object.defineProperty(exports, "TestStatus", { enumerable: true, get: function () { return constants_1.TestStatus; } });
Object.defineProperty(exports, "Platform", { enumerable: true, get: function () { return constants_1.Platform; } });
Object.defineProperty(exports, "Priority", { enumerable: true, get: function () { return constants_1.Priority; } });
Object.defineProperty(exports, "TestType", { enumerable: true, get: function () { return constants_1.TestType; } });
Object.defineProperty(exports, "TestTemplate", { enumerable: true, get: function () { return constants_1.TestTemplate; } });
Object.defineProperty(exports, "AutomationType", { enumerable: true, get: function () { return constants_1.AutomationType; } });
