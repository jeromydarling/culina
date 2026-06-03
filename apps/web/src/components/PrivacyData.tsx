import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, ShieldAlert, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { isLive } from '@/lib/config';
import { dataApi } from '@/lib/dataApi';
import { notifyError } from '@/lib/errors';
import { getToken } from '@/lib/authApi';

/** GDPR-style data controls: export everything, or permanently delete the account. */
export function PrivacyData() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function exportData() {
    if (!isLive() || !getToken()) {
      toast.info('Data export is available on a real (live) account.');
      return;
    }
    // Authenticated download via fetch → blob (so the Authorization header is sent).
    try {
      const res = await fetch(dataApi.exportUrl(), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'culina-my-data.json';
      a.click();
      toast.success('Your data export has downloaded.');
    } catch (e) {
      notifyError(e, { action: 'exportData' });
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      if (isLive() && getToken()) await dataApi.deleteAccount();
      toast.success('Your account and data have been deleted.');
      await logout(); // performs a full reset + redirect
    } catch (e) {
      setBusy(false);
      notifyError(e, { action: 'deleteAccount' });
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /> Privacy & Data</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          You control your data. <Link to="/privacy" className="text-primary hover:underline">Read our privacy policy</Link>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}><Download className="h-4 w-4" /> Export my data</Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4" /> Delete my account</Button>
        </div>
      </CardContent>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete your account?" description="This permanently erases your account and all associated data. This cannot be undone.">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Type <strong>DELETE</strong> to confirm.</p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={confirmText !== 'DELETE' || busy} onClick={deleteAccount}>
              {busy ? 'Deleting…' : 'Permanently delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
