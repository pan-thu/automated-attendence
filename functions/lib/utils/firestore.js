"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWithTimestamps = exports.withServerTimestamps = exports.nowTimestamp = exports.runTransaction = exports.firestore = void 0;
const firebase_1 = require("../firebase");
const firestore_1 = require("firebase-admin/firestore");
exports.firestore = firebase_1.admin.firestore();
const runTransaction = async (fn) => {
    return exports.firestore.runTransaction(async (tx) => fn(tx));
};
exports.runTransaction = runTransaction;
const nowTimestamp = () => firestore_1.FieldValue.serverTimestamp();
exports.nowTimestamp = nowTimestamp;
const withServerTimestamps = (data) => ({
    ...data,
    updatedAt: (0, exports.nowTimestamp)(),
});
exports.withServerTimestamps = withServerTimestamps;
const setWithTimestamps = async (ref, data, options) => {
    const payload = { ...data, updatedAt: (0, exports.nowTimestamp)() };
    if (options) {
        return ref.set(payload, options);
    }
    return ref.set(payload, { merge: true });
};
exports.setWithTimestamps = setWithTimestamps;
