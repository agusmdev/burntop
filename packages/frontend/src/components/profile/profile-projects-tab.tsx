import { useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AddProjectDialog } from './add-project-dialog';
import { ProjectCard, ProjectCardSkeleton } from './project-card';

import type { ProjectCreate, ProjectResponse, ProjectUpdate } from '@/api/generated.schemas';

import {
  getGetUserProjectsApiV1UsersUsernameProjectsGetQueryKey,
  useCreateProjectApiV1ProjectsPost,
  useDeleteProjectApiV1ProjectsProjectIdDelete,
  useGetUserProjectsApiV1UsersUsernameProjectsGet,
  useRefreshProjectMetadataApiV1ProjectsProjectIdRefreshPost,
  useUpdateProjectApiV1ProjectsProjectIdPatch,
} from '@/api/projects/projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ProfileProjectsTabProps {
  username: string;
  isOwnProfile?: boolean;
  className?: string;
}

export function ProfileProjectsTab({ username, isOwnProfile = false, className }: ProfileProjectsTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectResponse | null>(null);

  const { data: projectsResponse, isLoading } = useGetUserProjectsApiV1UsersUsernameProjectsGet(username);

  const queryKey = getGetUserProjectsApiV1UsersUsernameProjectsGetQueryKey(username);

  const createMutation = useCreateProjectApiV1ProjectsPost({
    mutation: {
      onSuccess: () => {
        toast.success('Project added successfully');
        queryClient.invalidateQueries({ queryKey });
        setIsDialogOpen(false);
      },
      onError: (error) => {
        const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add project';
        toast.error(message);
      },
    },
  });

  const updateMutation = useUpdateProjectApiV1ProjectsProjectIdPatch({
    mutation: {
      onSuccess: () => {
        toast.success('Project updated successfully');
        queryClient.invalidateQueries({ queryKey });
        setEditingProject(null);
        setIsDialogOpen(false);
      },
      onError: (error) => {
        const message = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update project';
        toast.error(message);
      },
    },
  });

  const deleteMutation = useDeleteProjectApiV1ProjectsProjectIdDelete({
    mutation: {
      onSuccess: () => {
        toast.success('Project deleted');
        queryClient.invalidateQueries({ queryKey });
        setDeletingProject(null);
      },
      onError: () => {
        toast.error('Failed to delete project');
      },
    },
  });

  const refreshMutation = useRefreshProjectMetadataApiV1ProjectsProjectIdRefreshPost({
    mutation: {
      onSuccess: () => {
        toast.success('Project metadata refreshed');
        queryClient.invalidateQueries({ queryKey });
      },
      onError: () => {
        toast.error('Failed to refresh project metadata');
      },
    },
  });

  const projects = projectsResponse?.status === 200 ? projectsResponse.data : [];
  const featuredProjects = projects.filter((p) => p.is_featured);
  const regularProjects = projects.filter((p) => !p.is_featured);

  const handleAddProject = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleEditProject = (project: ProjectResponse) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleDeleteProject = (project: ProjectResponse) => {
    setDeletingProject(project);
  };

  const handleRefreshProject = (project: ProjectResponse) => {
    refreshMutation.mutate({ projectId: project.id });
  };

  const handleSubmit = async (data: ProjectCreate | ProjectUpdate) => {
    if (editingProject) {
      await updateMutation.mutateAsync({
        projectId: editingProject.id,
        data: data as ProjectUpdate,
      });
    } else {
      await createMutation.mutateAsync({ data: data as ProjectCreate });
    }
  };

  const handleConfirmDelete = () => {
    if (deletingProject) {
      deleteMutation.mutate({ projectId: deletingProject.id });
    }
  };

  if (isLoading) {
    return <ProfileProjectsTabSkeleton />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {isOwnProfile && (
        <div className="flex justify-end">
          <Button onClick={handleAddProject} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <Card className="bg-bg-elevated border-border-default">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <FolderOpen className="h-12 w-12 text-text-tertiary mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No projects yet</h3>
            <p className="text-text-secondary max-w-md mb-6">
              {isOwnProfile
                ? 'Showcase your work by adding projects you\'ve built or contributed to.'
                : 'This user hasn\'t added any projects yet.'}
            </p>
            {isOwnProfile && (
              <Button onClick={handleAddProject} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {featuredProjects.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                Featured Projects
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isOwner={isOwnProfile}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onRefresh={handleRefreshProject}
                  />
                ))}
              </div>
            </div>
          )}

          {regularProjects.length > 0 && (
            <div className="space-y-4">
              {featuredProjects.length > 0 && (
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                  All Projects
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isOwner={isOwnProfile}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onRefresh={handleRefreshProject}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AddProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        editingProject={editingProject}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <DialogContent className="bg-bg-elevated border-border-default sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Delete Project</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeletingProject(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProfileProjectsTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
