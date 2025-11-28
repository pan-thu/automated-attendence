"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditLog = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("../utils/firestore");
const AUDIT_COLLECTION = 'AUDIT_LOGS';
const recordAuditLog = async (payload) => {
    await firestore_2.firestore.collection(AUDIT_COLLECTION).add({
        ...payload,
        timestamp: firestore_1.FieldValue.serverTimestamp(),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
};
exports.recordAuditLog = recordAuditLog;
