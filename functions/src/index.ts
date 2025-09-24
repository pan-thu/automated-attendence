import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

type SupportedRole = 'admin' | 'employee';

interface SetUserRolePayload {
  uid?: string;
  email?: string;
  role: SupportedRole;
}

const allowedRoles: SupportedRole[] = ['admin', 'employee'];

export const setUserRole = functions.https.onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required to set user roles.');
  }

  const requesterRole = auth.token?.role as SupportedRole | undefined;

  if (requesterRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can assign user roles.');
  }

  if (!data || typeof data !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'A payload with uid/email and role is required.');
  }

  const payload = data as Partial<SetUserRolePayload>;
  const { uid, email, role } = payload;

  if (!role || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Role must be one of: ${allowedRoles.join(', ')}.`
    );
  }

  if (!uid && !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Provide either uid or email to identify the user.');
  }

  let userRecord: admin.auth.UserRecord;

  try {
    if (uid) {
      userRecord = await admin.auth().getUser(uid);
    } else if (email) {
      userRecord = await admin.auth().getUserByEmail(email);
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Unable to resolve target user.');
    }
  } catch (error) {
    throw new functions.https.HttpsError('not-found', 'The specified user does not exist.');
  }

  const mergedClaims = { ...(userRecord.customClaims ?? {}), role };

  await admin.auth().setCustomUserClaims(userRecord.uid, mergedClaims);

  try {
    await admin
      .firestore()
      .collection('USERS')
      .doc(userRecord.uid)
      .set(
        {
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (error) {
    functions.logger.warn('Failed to sync role to Firestore USERS collection', error);
  }

  functions.logger.info('Role updated', {
    targetUid: userRecord.uid,
    newRole: role,
    performedBy: auth.uid,
  });

  return {
    success: true,
    message: `Role for ${userRecord.uid} set to ${role}.`,
  };
});
