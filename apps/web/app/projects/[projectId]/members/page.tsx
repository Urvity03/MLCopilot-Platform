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
import { toast } from '../../../../components/ui/toast';
import { Users, UserPlus, Trash2, Mail } from 'lucide-react';
import { SkeletonRow } from '../../../../components/ui/skeletons';
import { GradientBadge } from '../../../../components/ui/gradient-badge';

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

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'green';
      case 'admin':
        return 'purple';
      case 'member':
        return 'blue';
      default:
        return 'zinc';
    }
  };

  const activeMembers = React.useMemo(() => {
    return members.filter(m => m.user?.full_name);
  }, [members]);

  const pendingMembers = React.useMemo(() => {
    return members.filter(m => !m.user?.full_name);
  }, [members]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 font-sans animate-fade-in">
      {/* 1. Page Header */}
      <PageHeader
        title="Workspace Members"
        description="Manage workspace membership roles, permissions, and workspace access control lists."
        icon={Users}
        actions={
          <Button
            onClick={() => setInviteOpen(true)}
            variant="default"
            size="sm"
            className="bg-[#7C5CFC] hover:bg-[#6B4FE0] text-white border border-[#7C5CFC]/10 active:scale-[0.97] transition-all cursor-pointer gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Member</span>
          </Button>
        }
      />

      {/* 2. Active Members Directory */}
      <Section title="Active Membership Directory">
        <Card className="bg-[#111217] border border-[rgba(255,255,255,0.06)] p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6 text-xs font-semibold text-[#FF5C74]">
              Failed to load workspace members list.
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8B8D98] font-medium">
              No active membership accounts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#181A20]/50 text-[10px] font-bold text-[#56585E] uppercase tracking-wider font-mono">
                    <th className="p-4">User</th>
                    <th className="p-4">Role Authority</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {activeMembers.map((member) => (
                    <tr key={member.user_id} className="hover:bg-[#181A20]/30 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-[#7C5CFC]/10 border border-[#7C5CFC]/15 flex items-center justify-center font-mono text-[9px] font-bold text-[#7C5CFC] shrink-0">
                          {member.user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <span className="font-semibold text-[#F0F0F3]">{member.user?.full_name}</span>
                      </td>
                      <td className="p-4">
                        <GradientBadge variant={getRoleVariant(member.role)}>
                          {member.role}
                        </GradientBadge>
                      </td>
                      <td className="p-4 text-[#8B8D98] font-medium">{member.user?.email || member.user_id}</td>
                      <td className="p-4 text-right">
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this member?')) {
                                removeMutation.mutate(member.user_id);
                              }
                            }}
                            disabled={removeMutation.isPending}
                            className="p-1.5 rounded-lg bg-[#FF5C74]/10 hover:bg-[#FF5C74]/20 border border-[#FF5C74]/15 text-[#FF5C74] transition-all cursor-pointer active:scale-[0.95] disabled:opacity-50"
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
        <Card className="bg-[#111217] border border-[rgba(255,255,255,0.06)] p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <SkeletonRow />
            </div>
          ) : pendingMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#56585E] font-medium select-none">
              No pending workspace invites. All tokens are active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#181A20]/50 text-[10px] font-bold text-[#56585E] uppercase tracking-wider font-mono">
                    <th className="p-4">Invited Member ID</th>
                    <th className="p-4">Invited Role</th>
                    <th className="p-4">Status Token</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {pendingMembers.map((member) => (
                    <tr key={member.user_id} className="hover:bg-[#181A20]/30 transition-colors">
                      <td className="p-4 font-mono text-[#F0F0F3] font-semibold">{member.user_id}</td>
                      <td className="p-4">
                        <GradientBadge variant={getRoleVariant(member.role)}>
                          {member.role}
                        </GradientBadge>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-bold tracking-wide uppercase border font-mono text-[#F5B83D] bg-[#F5B83D]/10 border-[#F5B83D]/15 animate-pulse">
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
                          className="p-1.5 rounded-lg bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] text-[#8B8D98] hover:text-[#FF5C74] transition-all cursor-pointer active:scale-[0.95]"
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
              <UserPlus className="h-4.5 w-4.5 text-[#7C5CFC]" />
              <span>Invite Member</span>
            </DialogTitle>
            <DialogDescription>
              Assign roles and grant database workspace credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
                User ID / Account Email
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter User ID to associate"
                  className="w-full rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 pl-9 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all"
                  required
                />
                <Mail className="absolute left-3 h-3.5 w-3.5 text-[#56585E]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
                Workspace Role Authority
              </label>
              <select
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                className="w-full rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all"
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
                className="text-[#8B8D98]"
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="bg-[#7C5CFC] hover:bg-[#6B4FE0] text-white border border-[#7C5CFC]/10 active:scale-[0.97]"
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
