# MVP Test Checklist

Run these checks after `npm run build`, `npm run lint`, and `npm test` pass.

## Setup

Use a local app with at least two login-capable users, such as Admin and Staff.

Recommended target:

```txt
http://localhost:8000
```

## Manual Validation

1. Create a project named `Local Test App` with `http://localhost:8000`.
2. Create an Admin role profile.
3. Create a Staff role profile.
4. Open the Admin role tab and log in as admin.
5. Open the Staff role tab and log in as staff.
6. Refresh both tabs and confirm each role stays logged in as the correct user.
7. Restart RolesTab and confirm restored tabs keep their role sessions.
8. Reset the Admin session from the toolbar.
9. Confirm the Admin tab is logged out or requires login again.
10. Confirm the Staff tab remains logged in.
11. Open DevTools on the active tab.
12. Trigger a failed localhost connection, such as `http://localhost:59999`, and confirm the error banner offers Retry and Close.
13. Delete the project and confirm related open tabs close safely.

## Expected Results

- Admin and Staff do not share cookies, localStorage, IndexedDB, cache, or login state.
- Role sessions persist across app restarts until cleared.
- Clearing one role session does not clear another role session.
- Recent URLs and restored tabs stay scoped to valid projects and roles.
- DevTools, Inspect Element, keyboard shortcuts, and error fallbacks remain usable.
