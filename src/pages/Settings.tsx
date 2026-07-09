import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Lock, 
  Check,
  Loader2
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';
import { seedMockData } from '@/lib/seedMockData';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedMockData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await toast.promise(seedMockData(user.uid, user.displayName || 'Demo User'), {
        loading: 'Seeding demo projects, tasks, and events...',
        success: 'Dashboard populated with mock data!',
        error: 'Failed to seed mock data',
      }).unwrap();
    } catch {
      // toast.promise already surfaced the error
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation */}
        <div className="space-y-1">
          <Button 
            variant={activeTab === 'profile' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start gap-3 ${activeTab === 'profile' ? '' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
          <Button 
            variant={activeTab === 'notifications' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start gap-3 ${activeTab === 'notifications' ? '' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </Button>
          <Button 
            variant={activeTab === 'security' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start gap-3 ${activeTab === 'security' ? '' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock className="w-4 h-4" />
            Security
          </Button>
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          
          {activeTab === 'profile' && (
            <>
              {/* Profile Section */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Display Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          className="pl-10" 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                        <Input 
                          className="pl-10 opacity-50 cursor-not-allowed" 
                          value={user?.email || ''} 
                          disabled 
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
                    </div>
                    <Button type="submit" disabled={isUpdating || displayName === user?.displayName}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Account Role Section */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Account Role</CardTitle>
                  <CardDescription>Your current permissions level.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{user?.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {user?.role === 'manager' 
                            ? 'Full access to projects and team management.' 
                            : 'Access to assigned tasks and projects.'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-background">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance Section */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant={theme === 'light' ? 'default' : 'outline'} 
                      className="flex-1"
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </Button>
                    <Button 
                      variant={theme === 'dark' ? 'default' : 'outline'} 
                      className="flex-1"
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </Button>
                    <Button 
                      variant={theme === 'system' ? 'default' : 'outline'} 
                      className="flex-1"
                      onClick={() => setTheme('system')}
                    >
                      System
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-border/50 animate-in fade-in zoom-in-95 duration-200">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose what updates you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium">Email Notifications</h4>
                      <p className="text-xs text-muted-foreground">Receive daily digests and mentions via email.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Push Notifications</h4>
                        <p className="text-xs text-muted-foreground">Get instantly notified in your browser.</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Task Updates</h4>
                        <p className="text-xs text-muted-foreground">When a task is assigned to you or status changes.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="border-border/50 animate-in fade-in zoom-in-95 duration-200">
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your password and security preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success('Password updated successfully (mock)'); }}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Password</label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Password</label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <Button type="submit">Update Password</Button>
                  </form>

                  <div className="pt-6 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                        <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
                      </div>
                      <Button variant="outline" size="sm">Enable 2FA</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demo Data */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Demo Data</CardTitle>
                  <CardDescription>Populate your dashboard with sample projects, tasks, and events.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium">Seed Mock Data</h4>
                      <p className="text-xs text-muted-foreground">Adds 5 sample projects, 15 tasks, and 5 events assigned to you, so the dashboard isn't empty.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSeeding}
                      onClick={handleSeedMockData}
                    >
                      {isSeeding ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Seeding...
                        </>
                      ) : (
                        'Seed Mock Data'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account and data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-medium text-destructive">Wipe All Database Data</h4>
                      <p className="text-xs text-muted-foreground">This will permanently delete all projects, tasks, activities, and user profiles.</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm('ARE YOU SURE? This will delete ALL projects, tasks, and users permanently. This cannot be undone.')) {
                          const { wipeAllData } = await import('@/lib/wipeData');
                          toast.promise(wipeAllData(), {
                            loading: 'Wiping database...',
                            success: () => {
                              auth.signOut();
                              return 'Database wiped successfully! Logging out...';
                            },
                            error: 'Failed to wipe database'
                          });
                        }
                      }}
                    >
                      Wipe Everything
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
