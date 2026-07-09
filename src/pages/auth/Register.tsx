import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, arrayUnion } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { Logo } from '@/components/Logo';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(firebaseUser, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email,
        displayName,
        role,
        createdAt: new Date(),
      });

      // Resolve pending invitations
      const invRef = collection(db, 'invitations');
      const invQ = query(invRef, where('email', '==', email), where('status', '==', 'pending'));
      const invSnap = await getDocs(invQ);

      if (!invSnap.empty) {
        const batch = writeBatch(db);
        let acceptedCount = 0;
        
        invSnap.docs.forEach((inviteDoc) => {
          const inviteData = inviteDoc.data();
          
          // Add user to project
          const projectRef = doc(db, 'projects', inviteData.projectId);
          batch.update(projectRef, {
            teamMemberIds: arrayUnion(firebaseUser.uid)
          });
          
          // Mark invitation as accepted
          batch.update(inviteDoc.ref, {
            status: 'accepted'
          });
          
          acceptedCount++;
        });
        
        await batch.commit();
        if (acceptedCount > 0) {
           toast.success(`Account created and added to ${acceptedCount} project(s)!`);
        } else {
           toast.success('Account created successfully!');
        }
      } else {
        toast.success('Account created successfully!');
      }

      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-1 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </Link>
          <div className="flex justify-center mb-6">
            <Logo className="h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Join SiteFlow and start managing your job sites
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Full Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Select onValueChange={(value) => setRole(value as UserRole)} defaultValue={role}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Project Manager</SelectItem>
                  <SelectItem value="member">Team Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground px-1">
                Managers can create projects and assign tasks.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
