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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertActiveEmployee = exports.assertActiveAdmin = exports.requireAuthUid = exports.assertEmployee = exports.assertAdmin = exports.assertAuthenticated = exports.AuthenticationError = exports.AuthorizationError = void 0;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = require("../firebase");
class AuthorizationError extends functions.https.HttpsError {
    constructor(message) {
        super('permission-denied', message);
    }
}
exports.AuthorizationError = AuthorizationError;
class AuthenticationError extends functions.https.HttpsError {
    constructor(message) {
        super('unauthenticated', message);
    }
}
exports.AuthenticationError = AuthenticationError;
const assertAuthenticated = (context) => {
    if (!context.auth) {
        throw new AuthenticationError('Authentication required.');
    }
};
exports.assertAuthenticated = assertAuthenticated;
const assertAdmin = (context) => {
    (0, exports.assertAuthenticated)(context);
    const role = context.auth?.token?.role;
    if (role !== 'admin') {
        throw new AuthorizationError('Admin privileges required.');
    }
};
exports.assertAdmin = assertAdmin;
const assertEmployee = (context) => {
    (0, exports.assertAuthenticated)(context);
    const role = context.auth?.token?.role;
    if (role !== 'employee') {
        throw new AuthorizationError('Employee privileges required.');
    }
};
exports.assertEmployee = assertEmployee;
const requireAuthUid = (context) => {
    (0, exports.assertAuthenticated)(context);
    return context.auth.uid;
};
exports.requireAuthUid = requireAuthUid;
/**
 * Assert that user is authenticated, has admin role, AND has active status.
 * Bug Fix #5: Add status check to prevent inactive admins from accessing functions.
 */
const assertActiveAdmin = async (context) => {
    (0, exports.assertAdmin)(context);
    const uid = context.auth.uid;
    const userDoc = await firebase_1.admin.firestore().collection('USERS').doc(uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found.');
    }
    const userData = userDoc.data();
    if (userData?.status !== 'active') {
        throw new AuthorizationError('User account is not active.');
    }
    return uid;
};
exports.assertActiveAdmin = assertActiveAdmin;
/**
 * Assert that user is authenticated, has employee role, AND has active status.
 * Bug Fix #5: Add status check to prevent inactive employees from accessing functions.
 */
const assertActiveEmployee = async (context) => {
    (0, exports.assertEmployee)(context);
    const uid = context.auth.uid;
    const userDoc = await firebase_1.admin.firestore().collection('USERS').doc(uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found.');
    }
    const userData = userDoc.data();
    if (userData?.status !== 'active') {
        throw new AuthorizationError('User account is not active.');
    }
    return uid;
};
exports.assertActiveEmployee = assertActiveEmployee;
