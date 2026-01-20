/**
 * Settings Page (Profile Editing)
 *
 * Allows authenticated users to edit their profile information.
 * Protected route requiring authentication.
 *
 * @see Plan Phase 3.4 - Profile Settings Page
 */

import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { useUpdateOwnProfileApiV1UsersMePatch } from '@/api/users/users';
import { DashboardLayout, DashboardLayoutSkeleton } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { handleLogout, useUser } from '@/lib/auth/client';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  head: () => ({
    meta: [
      {
        title: 'Settings - burntop.dev',
      },
      {
        name: 'description',
        content:
          'Manage your burntop profile settings. Update your display name, bio, location, website, and privacy preferences.',
      },
    ],
  }),
});

interface ExtendedUser {
  name: string;
  email: string;
  image: string | null;
  username?: string;
  bio?: string | null;
  location?: string | null;
  website_url?: string | null;
  is_public?: boolean;
}

function SettingsPage() {
  const { user, isLoading } = useUser();

  // Show skeleton while loading user data
  if (isLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return null; // Auth middleware ensures user exists
  }

  const extendedUser = user as unknown as ExtendedUser;

  return <SettingsForm user={extendedUser} />;
}

interface SettingsFormProps {
  user: ExtendedUser;
}

/**
 * Settings form component with state initialized from user data.
 * Separated to allow direct state initialization from props (no useEffect sync needed).
 */
function SettingsForm({ user }: SettingsFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state - initialized directly from user data (no sync needed)
  const [name, setName] = useState(() => user.name || '');
  const [bio, setBio] = useState(() => user.bio || '');
  const [location, setLocation] = useState(() => user.location || '');
  const [websiteUrl, setWebsiteUrl] = useState(() => user.website_url || '');
  const [isPublic, setIsPublic] = useState(() => user.is_public || false);

  // Profile update mutation using Orval-generated hook with optimistic updates
  const updateProfileMutation = useUpdateOwnProfileApiV1UsersMePatch({
    mutation: {
      onMutate: async (newData) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['auth', 'me'] });

        // Snapshot the previous value
        const previous = queryClient.getQueryData(['auth', 'me']);

        // Optimistically update the cache
        queryClient.setQueryData(
          ['auth', 'me'],
          (old: { data: ExtendedUser; status: number } | undefined) => ({
            ...old,
            data: {
              ...old?.data,
              name: newData.data.name,
              bio: newData.data.bio,
              location: newData.data.location,
              website_url: newData.data.website_url,
              is_public: newData.data.is_public,
            },
          })
        );

        return { previous };
      },
      onError: (err, _, context) => {
        // Rollback on error
        if (context?.previous) {
          queryClient.setQueryData(['auth', 'me'], context.previous);
        }
        toast.error(err instanceof Error ? err.message : 'Failed to update profile');
      },
      onSuccess: () => {
        toast.success('Profile updated successfully!');
      },
      onSettled: () => {
        // Invalidate to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      },
    },
  });

  // Prepare user data for TopNav
  const topNavUser = {
    name: user.name || '',
    username: user.username || user.email?.split('@')[0] || '',
    avatarUrl: user.image || undefined,
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      data: {
        name,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        is_public: isPublic,
      },
    });
  };

  return (
    <DashboardLayout user={topNavUser} onSignOut={() => handleLogout('/')}>
      <div className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
            <p className="text-text-secondary">Manage your profile and account settings.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="bg-bg-elevated border-border-default mb-6">
              <CardHeader>
                <CardTitle className="text-text-primary">Profile Information</CardTitle>
                <CardDescription className="text-text-secondary">
                  Update your public profile information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-text-primary">
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e: ChangeEvent) => {
                      setName((e.target as HTMLInputElement).value);
                    }}
                    placeholder="Your display name"
                    maxLength={50}
                    className="bg-bg-surface border-border-default text-text-primary"
                  />
                  <p className="text-sm text-text-tertiary">{name.length}/50 characters</p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-text-primary">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e: ChangeEvent) => {
                      setBio((e.target as HTMLTextAreaElement).value);
                    }}
                    placeholder="Tell us about yourself..."
                    maxLength={160}
                    rows={3}
                    className="bg-bg-surface border-border-default text-text-primary resize-none"
                  />
                  <p className="text-sm text-text-tertiary">{bio.length}/160 characters</p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-text-primary">
                    Location
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e: ChangeEvent) => {
                      setLocation((e.target as HTMLInputElement).value);
                    }}
                    placeholder="e.g., San Francisco, CA"
                    maxLength={100}
                    className="bg-bg-surface border-border-default text-text-primary"
                  />
                  <p className="text-sm text-text-tertiary">{location.length}/100 characters</p>
                </div>

                {/* Website URL */}
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="text-text-primary">
                    Website
                  </Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e: ChangeEvent) => {
                      setWebsiteUrl((e.target as HTMLInputElement).value);
                    }}
                    placeholder="https://example.com"
                    maxLength={200}
                    className="bg-bg-surface border-border-default text-text-primary"
                  />
                  <p className="text-sm text-text-tertiary">{websiteUrl.length}/200 characters</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-bg-elevated border-border-default mb-6">
              <CardHeader>
                <CardTitle className="text-text-primary">Privacy</CardTitle>
                <CardDescription className="text-text-secondary">
                  Control who can see your profile and stats.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-text-primary font-medium">
                      Public Profile
                    </Label>
                    <p className="text-sm text-text-tertiary">
                      Make your profile and stats visible to everyone.
                    </p>
                  </div>
                  <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="bg-ember-500 hover:bg-ember-600 text-white"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigate({ to: '/dashboard' });
                }}
                disabled={updateProfileMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
