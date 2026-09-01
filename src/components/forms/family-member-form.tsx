'use client';

import { useState } from 'react';
import { addFamilyMember } from '@/lib/actions/settings';
import { useAction, fieldError } from '@/lib/use-action';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ROLES = [
  { value: 'ADMIN', label: 'Admin — full access, can add/remove family members' },
  { value: 'MEMBER', label: 'Member — can add and edit transactions' },
  { value: 'VIEWER', label: 'Viewer — read-only' },
  { value: 'REPORTS_ONLY', label: 'Reports Only — read-only, reports view' },
];

export function FamilyMemberForm({ onSuccess }: { onSuccess: () => void }) {
  const [values, setValues] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
  const { run, pending, fieldErrors } = useAction(addFamilyMember, () => {
    toast.success('Family member added — share their email and password with them so they can sign in.');
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); run(values); }} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This creates a new login inside your household — they'll see and edit the exact same data as you, at whatever
        permission level you choose below.
      </p>
      <div>
        <label className="label">Name</label>
        <input required className="input" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        {fieldError(fieldErrors, 'name') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'name')}</p>}
      </div>
      <div>
        <label className="label">Email</label>
        <input required type="email" className="input" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
        {fieldError(fieldErrors, 'email') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'email')}</p>}
      </div>
      <div>
        <label className="label">Password</label>
        <input required type="password" className="input" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
        <p className="text-xs text-muted-foreground mt-1">At least 8 characters, with a letter and a number. They can change it later in Settings → Security.</p>
        {fieldError(fieldErrors, 'password') && <p className="text-xs text-danger mt-1">{fieldError(fieldErrors, 'password')}</p>}
      </div>
      <div>
        <label className="label">Role</label>
        <select className="select" value={values.role} onChange={(e) => setValues({ ...values, role: e.target.value })}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add family member
      </button>
    </form>
  );
}
