'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { Loader2 } from 'lucide-react';

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    danger?: boolean;
    resolve?: (v: boolean) => void;
  }>({ open: false, title: '' });
  const [loading, setLoading] = useState(false);

  function confirm(title: string, description?: string, danger = true): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ open: true, title, description, danger, resolve });
    });
  }

  const dialog = (
    <Modal
      open={state.open}
      onClose={() => { state.resolve?.(false); setState((s) => ({ ...s, open: false })); }}
      title={state.title}
      description={state.description}
      size="sm"
    >
      <div className="flex justify-end gap-2 mt-2">
        <button
          className="btn-outline"
          onClick={() => { state.resolve?.(false); setState((s) => ({ ...s, open: false })); }}
        >
          Cancel
        </button>
        <button
          className={state.danger ? 'btn-danger' : 'btn-primary'}
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            state.resolve?.(true);
            setLoading(false);
            setState((s) => ({ ...s, open: false }));
          }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm
        </button>
      </div>
    </Modal>
  );

  return { confirm, dialog };
}
