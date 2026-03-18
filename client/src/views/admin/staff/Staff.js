import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import PermissionGate from 'components/auth/PermissionGate';
import ViewStaff from './ViewStaff';
import AddStaff from './AddStaff';
import EditStaff from './EditStaff';
import StaffProfile from './StaffProfile';
import ManageAttendance from './attandance/ManageAttendance';
import ViewAttendance from './attandance/ViewAttendance';

/**
 * Staff module
 *
 * All routes are gated using PermissionGate:
 *   - List/view pages require `manage_staff` module (any read access)
 *   - Add page requires `manage_staff.create`
 *   - Edit page requires `manage_staff.update`
 *   - Delete actions inside ViewStaff should also use PermissionGate or `can('manage_staff','delete')`
 */
const Staff = () => (
  <Switch>
    <Route exact path="/staff" render={() => <Redirect to="/staff/view" />} />

    {/* View — requires any read access to manage_staff */}
    <Route
      exact
      path="/staff/view"
      render={() => (
        <PermissionGate module="manage_staff" action="read">
          <ViewStaff />
        </PermissionGate>
      )}
    />

    {/* Add — requires create */}
    <Route
      exact
      path="/staff/add"
      render={() => (
        <PermissionGate module="manage_staff" action="create" redirect="/staff/view">
          <AddStaff />
        </PermissionGate>
      )}
    />

    {/* Edit — requires update */}
    <Route
      exact
      path="/staff/edit/:id"
      render={() => (
        <PermissionGate module="manage_staff" action="update" redirect="/staff/view">
          <EditStaff />
        </PermissionGate>
      )}
    />

    {/* Profile — requires read */}
    <Route
      exact
      path="/staff/profile/:id"
      render={() => (
        <PermissionGate module="manage_staff" action="read">
          <StaffProfile />
        </PermissionGate>
      )}
    />

    {/* Attendance — requires read on manage_staff */}
    <Route
      exact
      path="/staff/attendance"
      render={() => (
        <PermissionGate module="manage_staff" action="read">
          <ManageAttendance />
        </PermissionGate>
      )}
    />

    <Route
      exact
      path="/staff/attendance/view/:id"
      render={() => (
        <PermissionGate module="manage_staff" action="read">
          <ViewAttendance />
        </PermissionGate>
      )}
    />
  </Switch>
);

export default Staff;