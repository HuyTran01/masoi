# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Global Default Deny**: Any path not explicitly matched under `/databases/{database}/documents` is unconditionally denied (`allow read, write: if false;`).
2. **Identity Integrity**: A `PlayerAccount` document at `/player_accounts/{accountId}` can only be created or updated by a verified authenticated user whose `request.auth.uid == accountId` and `incoming().ownerId == request.auth.uid`.
3. **Path Variable Hardening**: `accountId` must match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
4. **Strict Schema & Key Allowlist**: `create` requires and allows only `['ownerId', 'username', 'displayName', 'avatar', 'region', 'elo', 'matchesPlayed', 'wins', 'createdAt', 'updatedAt']`.
5. **Action-Based Updates & Immutable Fields**: `ownerId`, `username`, and `createdAt` are strictly immutable during updates; `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Write**: `auth = null`, creating `/player_accounts/user_1`.
2. **Unverified Email Spoof**: `auth = { uid: 'user_1', token: { email_verified: false } }`, creating `/player_accounts/user_1`.
3. **Cross-User Identity Spoof**: `auth.uid = 'attacker_1'`, writing `ownerId: 'victim_1'` to `/player_accounts/victim_1`.
4. **Shadow Field Injection on Create**: Adding `isAdmin: true` to `/player_accounts/user_1`.
5. **Shadow Field Injection on Update**: Updating `elo` along with an undeclared field `hacked: true`.
6. **Immutable `ownerId` Mutation**: Updating `ownerId` to another UID after creation.
7. **Immutable `createdAt` Mutation**: Modifying `createdAt` during a profile update.
8. **Client Timestamp Forgery**: Supplying a forged past/future timestamp instead of `request.time` for `createdAt` or `updatedAt`.
9. **Oversized String DoW Attack**: Sending a 5,000-character `displayName` (`> 40` max).
10. **Invalid Enum Value**: Setting `region: 'MARS'` outside `['VN', 'SEA', 'GLOBAL']`.
11. **Out-of-Bounds Numeric State**: Setting `elo: -500` or `elo: 999999`.
12. **Unauthorized Blanket List Query**: Attempting to list `/player_accounts` for documents not owned by `request.auth.uid`.
