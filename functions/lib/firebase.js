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
exports.admin = void 0;
const firebaseAdmin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
// Initialize synchronously at module load time
if (!firebaseAdmin.apps.length) {
    // Check if running locally with service account credentials
    const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
        // Local development with emulators - use explicit service account
        try {
            // Resolve path relative to functions directory
            const resolvedPath = path.isAbsolute(serviceAccountPath)
                ? serviceAccountPath
                : path.resolve(__dirname, '..', serviceAccountPath);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const serviceAccount = require(resolvedPath);
            firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert(serviceAccount),
                storageBucket: process.env.STORAGE_BUCKET || 'automated-attendence-6fc07.firebasestorage.app'
            });
            console.log('✅ Firebase Admin initialized with service account credentials');
        }
        catch (error) {
            console.warn('⚠️  Failed to load service account, using default initialization:', error);
            firebaseAdmin.initializeApp();
        }
    }
    else {
        // Production - use Application Default Credentials
        firebaseAdmin.initializeApp();
    }
}
// Export initialized admin instance (works for both value and type usage)
exports.admin = firebaseAdmin;
