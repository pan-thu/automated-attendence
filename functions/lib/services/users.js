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
exports.toggleUserStatus = exports.updateEmployee = exports.createEmployee = exports.DEFAULT_LEAVE_KEYS = void 0;
const firebase_1 = require("../firebase");
const firestore_1 = require("../utils/firestore");
const USERS_COLLECTION = 'USERS';
exports.DEFAULT_LEAVE_KEYS = [
    'fullLeaveBalance',
    'halfLeaveBalance',
    'medicalLeaveBalance',
    'maternityLeaveBalance',
];
// Map leave policy keys to user document field names
const leavePolicyToFieldMap = {
    full: 'fullLeaveBalance',
    half: 'halfLeaveBalance',
    medical: 'medicalLeaveBalance',
    maternity: 'maternityLeaveBalance',
};
const createEmployee = async (input, performedBy) => {
    const { email, password, fullName, department, position, phoneNumber, leaveBalances } = input;
    const userRecord = await firebase_1.admin.auth().createUser({
        email,
        password,
        displayName: fullName,
        phoneNumber,
        disabled: false,
    });
    const uid = userRecord.uid;
    await firebase_1.admin.auth().setCustomUserClaims(uid, { role: 'employee' });
    // Fetch initial leave balances from company settings
    const { getCompanySettings } = await Promise.resolve().then(() => __importStar(require('./settings')));
    const companySettings = await getCompanySettings();
    const leavePolicy = companySettings?.leavePolicy ?? {};
    // Build initial leave balances from company settings, mapping to proper field names
    const initialLeaveBalances = {};
    for (const [key, value] of Object.entries(leavePolicy)) {
        const fieldName = leavePolicyToFieldMap[key.toLowerCase()] ?? `${key}LeaveBalance`;
        initialLeaveBalances[fieldName] = value ?? 0;
    }
    const userDoc = firestore_1.firestore.collection(USERS_COLLECTION).doc(uid);
    await userDoc.set({
        userId: uid,
        email,
        fullName,
        department: department ?? null,
        position: position ?? null,
        phoneNumber: phoneNumber ?? null,
        role: 'employee',
        isActive: true,
        createdAt: (0, firestore_1.nowTimestamp)(),
        updatedAt: (0, firestore_1.nowTimestamp)(),
        createdBy: performedBy,
        ...initialLeaveBalances,
        ...(leaveBalances ?? {}),
    });
    return { uid };
};
exports.createEmployee = createEmployee;
const updateEmployee = async (input) => {
    const { uid, fullName, department, position, phoneNumber, leaveBalances } = input;
    const updates = {
        updatedAt: (0, firestore_1.nowTimestamp)(),
    };
    if (fullName !== undefined)
        updates.fullName = fullName;
    if (department !== undefined)
        updates.department = department;
    if (position !== undefined)
        updates.position = position;
    if (phoneNumber !== undefined)
        updates.phoneNumber = phoneNumber;
    if (leaveBalances) {
        for (const [key, value] of Object.entries(leaveBalances)) {
            if (typeof value === 'number' && value >= 0) {
                // Map policy keys to proper field names
                const fieldName = leavePolicyToFieldMap[key.toLowerCase()] ?? key;
                updates[fieldName] = value;
            }
        }
    }
    if (fullName !== undefined || phoneNumber !== undefined) {
        await firebase_1.admin.auth().updateUser(uid, {
            displayName: fullName,
            phoneNumber: phoneNumber ?? undefined,
        });
    }
    await firestore_1.firestore.collection(USERS_COLLECTION).doc(uid).set(updates, { merge: true });
};
exports.updateEmployee = updateEmployee;
const toggleUserStatus = async (uid, disable) => {
    await firebase_1.admin.auth().updateUser(uid, { disabled: disable });
    await firestore_1.firestore.collection(USERS_COLLECTION).doc(uid).set({
        isActive: !disable,
        updatedAt: (0, firestore_1.nowTimestamp)(),
    }, { merge: true });
};
exports.toggleUserStatus = toggleUserStatus;
