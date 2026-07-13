'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../../../services/projects';
import { PageHeader } from '../../../../components/ui/page-header';
import { Section } from '../../../../components/ui/section';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { StatusPill } from '../../../../components/ui/status-pill';
import { toast } from '../../../../components/ui/toast';
import { Users, UserPlus, Shield, ShieldCheck, UserCheck, Trash2, Mail } from 'lucide-react';
import { SkeletonRow } from '../../../../components/ui/skeletons';

export default function MembersPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'admin' | 'member' | 'viewer'>('member');

  // Fetch members list
  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsService.listMembers(projectId),
    enabled: !!projectId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => projectsService.inviteMember(projectId, {
      user_id: inviteEmail, // note: API expects user_id or email, using user_id as input field
      role: inviteRole,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      setInviteOpen(false);
      setInviteEmail('');
      toast.success('Successfully invited workspace member.');
    },
    onError: () => {
      toast.error('Failed to invite member. Please verify their user record.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsService.removeMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast.success('Member removed from workspace.');
    },
    onError: () => {
      toast.error('Failed to remove member.');
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviteMutation.isPending) return;
    inviteMutation.mutate();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <ShieldCheck className="h-4 w-4 text-indigo-400" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-cyan-400" />;
      default:
        return <UserCheck className="h-4 w-4 text-zinc-500" />;
    }
  };

  const activeMembers = React.useMemo(() => {
    return members.filter(m => m.user?.full_name);
  }, [members]);

  const pendingMembers = React.useMemo(() => {
    return members.filter(m => !m.user?.full_name);
  }, [members]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title="Workspace Members"
        description="Manage workspace membership roles, permissions, and workspace access access control lists."
        actions={
          <Button
            onClick={() => setInviteOpen(true)}
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/95 border border-indigo-500/20 shadow-md shadow-indigo-950/20 cursor-pointer active:translate-y-[0.5px] gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Member</span>
          </Button>
        }
      />

      {/* 2. Active Members Directory */}
      <Section title="Active Membership Directory">
        <Card className="bg-zinc-900/10 border-zinc-800/40 p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6 text-xs font-semibold text-red-400">
              Failed to load workspace members list.
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-medium">
              No active membership accounts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/40 text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                    <th className="p-4">User</th>
                    <th className="p-4">Role Authority</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {activeMembers.map((member) => (
                    <tr key={member.user_id} className="hover:bg-zinc-900/5 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-[10px] font-bold text-zinc-400 shrink-0">
                          {member.user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <span className="font-semibold text-zinc-200">{member.user?.full_name}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-400 font-mono uppercase bg-indigo-950/30 border border-indigo-900/20 px-2 py-0.5 rounded">
                          {getRoleIcon(member.role)}
                          <span>{member.role}</span>
                        </span>
                      </td>
                      <td className="p-4 text-zinc-400 font-medium">{member.user?.email || member.user_id}</td>
                      <td className="p-4 text-right">
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this member?')) {
                                removeMutation.mutate(member.user_id);
                              }
                            }}
                            disabled={removeMutation.isPending}
                            className="p-1.5 rounded bg-rose-955/20 hover:bg-rose-955/40 border border-rose-900/20 text-rose-400 transition cursor-pointer active:translate-y-[0.5px] disabled:opacity-50"
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      {/* 3. Pending Invites Queue */}
      <Section title="Pending Workspace Invitations">
        <Card className="bg-zinc-900/10 border-zinc-800/40 p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <SkeletonRow />
            </div>
          ) : pendingMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-550 font-medium select-none">
              No pending workspace invites. All tokens are active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/40 text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                    <th className="p-4">Invited Member ID</th>
                    <th className="p-4">Invited Role</th>
                    <th className="p-4">Status Token</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {pendingMembers.map((member) => (
                    <tr key={member.user_id} className="hover:bg-zinc-900/5 transition-colors">
                      <td className="p-4 font-mono text-zinc-300 font-semibold">{member.user_id}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-400 font-mono uppercase bg-zinc-900/50 border border-zinc-800/80 px-2 py-0.5 rounded">
                          {getRoleIcon(member.role)}
                          <span>{member.role}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase border font-mono text-amber-400 bg-amber-955/20 border-amber-900/30 animate-pulse">
                          Awaiting Bind
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to revoke this invitation?')) {
                              removeMutation.mutate(member.user_id);
                            }
                          }}
                          disabled={removeMutation.isPending}
                          className="p-1.5 rounded bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer active:translate-y-[0.5px]"
                          title="Revoke Invitation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      {/* Invite Member Dialog Overlay */}
      <Dialog open={inviteOpen} onOpenChange={(open) => !open && setInviteOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
              <span>Invite Member</span>
            </DialogTitle>
            <DialogDescription>
              Assign roles and grant database workspace credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                User ID / Account Email
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter User ID to associate"
                  className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                  required
                />
                <Mail className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Workspace Role Authority
              </label>
              <select
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
              >
                <option value="admin">Administrator (Write access, manage members)</option>
                <option value="member">Workspace Member (Read/Write documents/chat)</option>
                <option value="viewer">Viewer (Read-only access)</option>
              </select>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInviteOpen(false)}
                className="text-zinc-400"
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/95 border border-indigo-500/20 shadow-md shadow-indigo-950/20 cursor-pointer active:translate-y-[0.5px]"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
