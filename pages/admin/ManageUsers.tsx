import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AppContext';
import { APP_ROLES, type AccountStatus, type AppRole } from '../../src/auth/types';
import { listManagedUsers, updateManagedUser, type ManagedUser } from '../../src/firestore/admin';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const editableRoles = APP_ROLES.filter((role): role is AppRole =>
  role !== 'pending' && role !== 'disabled');
const statuses: AccountStatus[] = ['pending', 'active', 'disabled'];

const ManageUsers: React.FC = () => {
  const { mode, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (mode !== 'firebase' || user?.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      setUsers(await listManagedUsers());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [mode, user?.role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeUser = (uid: string, field: 'role' | 'status', value: string) => {
    setUsers((current) => current.map((item) => item.uid === uid
      ? { ...item, [field]: value }
      : item));
    setNotice(null);
  };

  const saveUser = async (managedUser: ManagedUser) => {
    if (!user || managedUser.uid === user.uid) return;
    setSavingUid(managedUser.uid);
    setError(null);
    try {
      await updateManagedUser(managedUser.uid, {
        role: managedUser.role,
        status: managedUser.status,
      }, user.uid);
      setNotice(`Account ${managedUser.email || managedUser.uid} updated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update user');
      await reload();
    } finally {
      setSavingUid(null);
    }
  };

  if (mode !== 'firebase') {
    return <Card><p className="text-nasa-gray-300">User administration is available in Firebase mode.</p></Card>;
  }
  if (user?.role !== 'admin') {
    return <Card><p className="text-nasa-gray-300">Administrator access is required.</p></Card>;
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">User administration</h2>
        <Button size="sm" variant="secondary" onClick={() => void reload()} disabled={loading}>Refresh</Button>
      </div>
      {error && <p role="alert" className="mb-4 text-red-300">{error}</p>}
      {notice && <p role="status" className="mb-4 text-green-300">{notice}</p>}
      {loading ? <p className="text-nasa-gray-400">Loading users…</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-nasa-gray-700">
            <thead className="bg-nasa-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-nasa-gray-300">Account</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-nasa-gray-300">Role</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-nasa-gray-300">Status</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-nasa-gray-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nasa-gray-700">
              {users.map((managedUser) => {
                const isCurrentUser = managedUser.uid === user.uid;
                return (
                  <tr key={managedUser.uid}>
                    <td className="px-4 py-3 text-sm text-white">
                      <div>{managedUser.displayName || 'Unnamed user'}</div>
                      <div className="text-nasa-gray-400">{managedUser.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Role for ${managedUser.email}`}
                        value={managedUser.role}
                        disabled={isCurrentUser}
                        onChange={(event) => changeUser(managedUser.uid, 'role', event.target.value)}
                        className="bg-nasa-gray-700 text-white rounded px-2 py-1"
                      >
                        {editableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                        {managedUser.role === 'pending' && <option value="pending">pending</option>}
                        {managedUser.role === 'disabled' && <option value="disabled">disabled</option>}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Status for ${managedUser.email}`}
                        value={managedUser.status}
                        disabled={isCurrentUser}
                        onChange={(event) => changeUser(managedUser.uid, 'status', event.target.value)}
                        className="bg-nasa-gray-700 text-white rounded px-2 py-1"
                      >
                        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => void saveUser(managedUser)} disabled={isCurrentUser || savingUid === managedUser.uid}>
                        {savingUid === managedUser.uid ? 'Saving…' : 'Save'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ManageUsers;
