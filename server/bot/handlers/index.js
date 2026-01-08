"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdminTextInput = exports.handleAdminBack = exports.handleAdminBroadcast = exports.handleAdminMakeAdmin = exports.handleAdminUnban = exports.handleAdminBan = exports.handleAdminAddBalance = exports.handleAdminFindUser = exports.handleAdminJobs = exports.handleAdminRejectTx = exports.handleAdminApproveTx = exports.handleAdminPendingTx = exports.handleAdminTransactions = exports.handleAdminUsers = exports.handleAdminStats = exports.handleAdmin = exports.creditAgentCommission = exports.handleAgentBack = exports.handleAgentWithdraw = exports.handleAgentShare = exports.handleAgentReferrals = exports.handleAgentCancel = exports.handleAgentRegister = exports.handleAgent = exports.handleHelp = exports.handleSettingsCallback = exports.handleSettings = exports.handlePricing = exports.handleTopupCancel = exports.handleTransactionIdMessage = exports.handleTopupProviderCallback = exports.handleTopupAmountCallback = exports.handleTopup = exports.handleBalance = exports.handleDocument = exports.handleUpload = exports.handleLanguageCallback = exports.handleLanguage = exports.handleStart = void 0;
__exportStar(require("./types"), exports);
var startHandler_1 = require("./startHandler");
Object.defineProperty(exports, "handleStart", { enumerable: true, get: function () { return startHandler_1.handleStart; } });
var languageHandler_1 = require("./languageHandler");
Object.defineProperty(exports, "handleLanguage", { enumerable: true, get: function () { return languageHandler_1.handleLanguage; } });
Object.defineProperty(exports, "handleLanguageCallback", { enumerable: true, get: function () { return languageHandler_1.handleLanguageCallback; } });
var uploadHandler_1 = require("./uploadHandler");
Object.defineProperty(exports, "handleUpload", { enumerable: true, get: function () { return uploadHandler_1.handleUpload; } });
Object.defineProperty(exports, "handleDocument", { enumerable: true, get: function () { return uploadHandler_1.handleDocument; } });
var balanceHandler_1 = require("./balanceHandler");
Object.defineProperty(exports, "handleBalance", { enumerable: true, get: function () { return balanceHandler_1.handleBalance; } });
var topupHandler_1 = require("./topupHandler");
Object.defineProperty(exports, "handleTopup", { enumerable: true, get: function () { return topupHandler_1.handleTopup; } });
Object.defineProperty(exports, "handleTopupAmountCallback", { enumerable: true, get: function () { return topupHandler_1.handleTopupAmountCallback; } });
Object.defineProperty(exports, "handleTopupProviderCallback", { enumerable: true, get: function () { return topupHandler_1.handleTopupProviderCallback; } });
Object.defineProperty(exports, "handleTransactionIdMessage", { enumerable: true, get: function () { return topupHandler_1.handleTransactionIdMessage; } });
Object.defineProperty(exports, "handleTopupCancel", { enumerable: true, get: function () { return topupHandler_1.handleTopupCancel; } });
var pricingHandler_1 = require("./pricingHandler");
Object.defineProperty(exports, "handlePricing", { enumerable: true, get: function () { return pricingHandler_1.handlePricing; } });
var settingsHandler_1 = require("./settingsHandler");
Object.defineProperty(exports, "handleSettings", { enumerable: true, get: function () { return settingsHandler_1.handleSettings; } });
Object.defineProperty(exports, "handleSettingsCallback", { enumerable: true, get: function () { return settingsHandler_1.handleSettingsCallback; } });
var helpHandler_1 = require("./helpHandler");
Object.defineProperty(exports, "handleHelp", { enumerable: true, get: function () { return helpHandler_1.handleHelp; } });
var agentHandler_1 = require("./agentHandler");
Object.defineProperty(exports, "handleAgent", { enumerable: true, get: function () { return agentHandler_1.handleAgent; } });
Object.defineProperty(exports, "handleAgentRegister", { enumerable: true, get: function () { return agentHandler_1.handleAgentRegister; } });
Object.defineProperty(exports, "handleAgentCancel", { enumerable: true, get: function () { return agentHandler_1.handleAgentCancel; } });
Object.defineProperty(exports, "handleAgentReferrals", { enumerable: true, get: function () { return agentHandler_1.handleAgentReferrals; } });
Object.defineProperty(exports, "handleAgentShare", { enumerable: true, get: function () { return agentHandler_1.handleAgentShare; } });
Object.defineProperty(exports, "handleAgentWithdraw", { enumerable: true, get: function () { return agentHandler_1.handleAgentWithdraw; } });
Object.defineProperty(exports, "handleAgentBack", { enumerable: true, get: function () { return agentHandler_1.handleAgentBack; } });
Object.defineProperty(exports, "creditAgentCommission", { enumerable: true, get: function () { return agentHandler_1.creditAgentCommission; } });
var adminHandler_1 = require("./adminHandler");
Object.defineProperty(exports, "handleAdmin", { enumerable: true, get: function () { return adminHandler_1.handleAdmin; } });
Object.defineProperty(exports, "handleAdminStats", { enumerable: true, get: function () { return adminHandler_1.handleAdminStats; } });
Object.defineProperty(exports, "handleAdminUsers", { enumerable: true, get: function () { return adminHandler_1.handleAdminUsers; } });
Object.defineProperty(exports, "handleAdminTransactions", { enumerable: true, get: function () { return adminHandler_1.handleAdminTransactions; } });
Object.defineProperty(exports, "handleAdminPendingTx", { enumerable: true, get: function () { return adminHandler_1.handleAdminPendingTx; } });
Object.defineProperty(exports, "handleAdminApproveTx", { enumerable: true, get: function () { return adminHandler_1.handleAdminApproveTx; } });
Object.defineProperty(exports, "handleAdminRejectTx", { enumerable: true, get: function () { return adminHandler_1.handleAdminRejectTx; } });
Object.defineProperty(exports, "handleAdminJobs", { enumerable: true, get: function () { return adminHandler_1.handleAdminJobs; } });
Object.defineProperty(exports, "handleAdminFindUser", { enumerable: true, get: function () { return adminHandler_1.handleAdminFindUser; } });
Object.defineProperty(exports, "handleAdminAddBalance", { enumerable: true, get: function () { return adminHandler_1.handleAdminAddBalance; } });
Object.defineProperty(exports, "handleAdminBan", { enumerable: true, get: function () { return adminHandler_1.handleAdminBan; } });
Object.defineProperty(exports, "handleAdminUnban", { enumerable: true, get: function () { return adminHandler_1.handleAdminUnban; } });
Object.defineProperty(exports, "handleAdminMakeAdmin", { enumerable: true, get: function () { return adminHandler_1.handleAdminMakeAdmin; } });
Object.defineProperty(exports, "handleAdminBroadcast", { enumerable: true, get: function () { return adminHandler_1.handleAdminBroadcast; } });
Object.defineProperty(exports, "handleAdminBack", { enumerable: true, get: function () { return adminHandler_1.handleAdminBack; } });
Object.defineProperty(exports, "handleAdminTextInput", { enumerable: true, get: function () { return adminHandler_1.handleAdminTextInput; } });
//# sourceMappingURL=index.js.map