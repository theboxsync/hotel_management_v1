import { useAuth } from 'contexts/AuthContext';

/**
 * usePermission
 *
 * Returns helpers to check permissions stored in:
 *   AuthContext → user.permissions
 *
 * Permission shape example:
 *   {
 *     manage_staff:     { read, create, update, delete },
 *     manage_bookings:  { read, create, update, delete, cancel },
 *     manage_inventory: { read, create, update, delete },
 *     manage_rooms:     { read, create, update, delete },
 *     manage_payments:  { view, refund },
 *     view_analytics:   { dashboard, reports, export },
 *     manage_settings:  { hotel_info, pricing, integrations },
 *     manage_customers: { read, create, update, delete },
 *   }
 *
 * Usage:
 *   const { can, canAny, hasModule } = usePermission();
 *
 *   can('manage_staff', 'create')   // true / false
 *   canAny('manage_staff')          // true if ANY action is true
 *   hasModule('manage_staff')       // alias for canAny
 */
const usePermission = () => {
    const { user } = useAuth();
    const permissions = user?.permissions || {};

    /**
     * Check a specific action inside a module.
     * @param {string} module  - e.g. 'manage_staff'
     * @param {string} action  - e.g. 'create'
     */
    const can = (module, action) => {
        return !!permissions[module]?.[action];
    };

    /**
     * Returns true if the user has at least one truthy action in the module.
     * Use this to decide whether to show a nav section at all.
     * @param {string} module - e.g. 'manage_staff'
     */
    const canAny = (module) => {
        const mod = permissions[module];
        if (!mod) return false;
        return Object.values(mod).some(Boolean);
    };

    /** Alias – reads more naturally in nav/route guards */
    const hasModule = canAny;

    return { can, canAny, hasModule, permissions };
};

export default usePermission;