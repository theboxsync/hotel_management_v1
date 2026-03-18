import React from 'react';
import { Redirect } from 'react-router-dom';
import usePermission from 'hooks/usePermission';

/**
 * PermissionGate
 *
 * Wraps any content and only renders it when the user has the required permission.
 * Otherwise renders `fallback`, redirects, or shows a default "Access Denied" message.
 *
 * Props:
 *   module    {string}          - Permission module, e.g. 'manage_staff'
 *   action    {string}          - Specific action, e.g. 'create'. If omitted, uses canAny(module).
 *   fallback  {ReactNode}       - What to render when access is denied. Defaults to AccessDenied UI.
 *   redirect  {string|boolean}  - If a path string, redirects there on deny. If true, redirects to '/'.
 *   silent    {boolean}         - If true, renders nothing (null) on deny instead of the fallback.
 *   children  {ReactNode}
 *
 * Examples:
 *
 *   // Hide a button entirely
 *   <PermissionGate module="manage_staff" action="create" silent>
 *     <Button>Add Staff</Button>
 *   </PermissionGate>
 *
 *   // Show access denied message on a full page
 *   <PermissionGate module="manage_staff" action="read">
 *     <StaffList />
 *   </PermissionGate>
 *
 *   // Redirect to /dashboard on deny
 *   <PermissionGate module="manage_staff" action="read" redirect="/dashboard">
 *     <StaffList />
 *   </PermissionGate>
 *
 *   // Check if ANY action in a module is allowed (for nav visibility)
 *   <PermissionGate module="manage_staff" silent>
 *     <NavLink to="/staff">Staff</NavLink>
 *   </PermissionGate>
 */
const AccessDenied = ({ module, action }) => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center',
            color: 'var(--muted)',
        }}
    >
        <div
            style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(220,53,69,.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                fontSize: 28,
            }}
        >
            🔒
        </div>
        <h5 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--body)' }}>Access Denied</h5>
        <p style={{ fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
            You don't have permission to{' '}
            {action ? <strong>{action}</strong> : 'access this section'}.
            Contact your administrator if you think this is a mistake.
        </p>
    </div>
);

const PermissionGate = ({
    module,
    action,
    fallback,
    redirect: redirectTo,
    silent = false,
    children,
}) => {
    const { can, canAny } = usePermission();

    const allowed = action ? can(module, action) : canAny(module);

    if (allowed) return <>{children}</>;

    // Silent: render nothing (ideal for hiding buttons/nav items)
    if (silent) return null;

    // Redirect
    if (redirectTo) {
        const path = redirectTo === true ? '/' : redirectTo;
        return <Redirect to={path} />;
    }

    // Custom fallback
    if (fallback) return <>{fallback}</>;

    // Default access denied UI
    return <AccessDenied module={module} action={action} />;
};

export default PermissionGate;