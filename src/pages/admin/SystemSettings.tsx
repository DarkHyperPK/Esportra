import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

type Setting = { key: string; value: string };

const SystemSettings: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Setting[]>('/api/admin/system-settings');
      const map: Record<string, string> = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setMaintenance(map['maintenance_mode'] === 'true');
    } catch (e) {
      console.error('Failed to load system settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only load once on mount

  const save = async () => {
    try {
      await apiClient.put('/api/admin/system-settings', [
        { key: 'maintenance_mode', value: maintenance ? 'true' : 'false' },
        { key: 'public_contact_email', value: settings['public_contact_email'] || '' },
        { key: 'support_portal_url', value: settings['support_portal_url'] || '' },
      ]);
      await auditLog.settingsUpdated('System Settings', settings);
      toast({ title: 'Saved', description: 'System settings updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-700">
                <div>
                  <div className="text-white font-medium">Maintenance Mode</div>
                  <div className="text-gray-400 text-sm">Temporarily disable public features</div>
                </div>
                <Switch checked={maintenance} onCheckedChange={setMaintenance} />
              </div>

              <div className="p-3 bg-gray-900 rounded border border-gray-700 space-y-2">
                <div className="text-white font-medium">Public Contact Email</div>
                <Input value={settings['public_contact_email'] || ''} onChange={(e) => setSettings(s => ({ ...s, public_contact_email: e.target.value }))} className="bg-gray-700 border-gray-600 text-white" />
              </div>

              <div className="p-3 bg-gray-900 rounded border border-gray-700 space-y-2">
                <div className="text-white font-medium">Support Portal URL</div>
                <Input value={settings['support_portal_url'] || ''} onChange={(e) => setSettings(s => ({ ...s, support_portal_url: e.target.value }))} className="bg-gray-700 border-gray-600 text-white" />
              </div>

              <div className="flex justify-end">
                <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;


