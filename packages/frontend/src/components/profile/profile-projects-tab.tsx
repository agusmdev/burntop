import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, FolderOpen, LayoutGrid, Plus, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AddProjectDialog } from './add-project-dialog';
import { ProjectCard, ProjectCardSkeleton, getProjectType } from './project-card';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface ProfileProjectsTabProps {
  username: string;
  isOwnProfile?: boolean;
  className?: string;
}

type SortOption = 'newest' | 'oldest' | 'alpha';

export function ProfileProjectsTab({
  username,
  isOwnProfile = false,
  className,
}: ProfileProjectsTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const { data: projectsResponse, isLoading } =
    useGetUserProjectsApiV1UsersUsernameProjectsGet(username);

  const queryKey = getGetUserProjectsApiV1UsersUsernameProjectsGetQueryKey(username);

  const createMutation = useCreateProjectApiV1ProjectsPost({
    mutation: {
      onSuccess: () => {
        toast.success('Project added successfully');
        queryClient.invalidateQueries({ queryKey });
        setIsDialogOpen(false);
      },
      onError: (error) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to add project';
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
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to update project';
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

  const projects = useMemo(() => {
    return projectsResponse?.status === 200 ? projectsResponse.data : [];
  }, [projectsResponse]);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(lowerQuery) ||
          (p.description || '').toLowerCase().includes(lowerQuery) ||
          p.url.toLowerCase().includes(lowerQuery)
      );
    }

    if (filterType !== 'all') {
      result = result.filter((p) => getProjectType(p.id).label === filterType);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'alpha':
          return (a.title || a.url).localeCompare(b.title || b.url);
        default:
          return 0;
      }
    });

    return result;
  }, [projects, searchQuery, filterType, sortBy]);

  const featuredProjects = useMemo(
    () => filteredProjects.filter((p) => p.is_featured),
    [filteredProjects]
  );

  const regularProjects = useMemo(
    () => filteredProjects.filter((p) => !p.is_featured),
    [filteredProjects]
  );

  const isDefaultView = !searchQuery && filterType === 'all' && sortBy === 'newest';

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-bg-surface border-border-default focus-visible:ring-ember-500/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <Tabs value={filterType} onValueChange={setFilterType} className="w-auto">
            <TabsList className="bg-bg-surface border border-border-default h-9 p-0.5">
              <TabsTrigger value="all" className="text-xs px-3">
                All
              </TabsTrigger>
              <TabsTrigger value="Web App" className="text-xs px-3">
                Web Apps
              </TabsTrigger>
              <TabsTrigger value="Library" className="text-xs px-3">
                Libraries
              </TabsTrigger>
              <TabsTrigger value="Tool" className="text-xs px-3">
                Tools
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-border-default bg-bg-surface text-text-secondary hover:text-text-primary"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="alpha">Alphabetical</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {isOwnProfile && (
            <Button
              onClick={handleAddProject}
              size="sm"
              className="h-9 gap-2 bg-ember-500 hover:bg-ember-600 text-white border-0 shadow-lg shadow-ember-500/20"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Project</span>
            </Button>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-bg-elevated/50 border-dashed border-border-default">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-bg-surface flex items-center justify-center mb-4 ring-1 ring-border-default shadow-sm">
              <FolderOpen className="h-8 w-8 text-text-tertiary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">No projects yet</h3>
            <p className="text-text-secondary max-w-md mb-8 leading-relaxed">
              {isOwnProfile
                ? 'Showcase your best work. Add web apps, libraries, tools, or APIs you have built or contributed to.'
                : "This user hasn't added any projects to their portfolio yet."}
            </p>
            {isOwnProfile && (
              <Button
                onClick={handleAddProject}
                className="gap-2 h-10 px-6 bg-ember-500 hover:bg-ember-600 text-white shadow-lg shadow-ember-500/25 transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Add Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-secondary">No projects match your search.</p>
          <Button
            variant="link"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="text-ember-500 mt-2"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          {isDefaultView && featuredProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-ember-500 fill-ember-500" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Featured
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isOwner={isOwnProfile}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                    onRefresh={handleRefreshProject}
                    className="border-ember-500/20 ring-1 ring-ember-500/10 md:col-span-1 shadow-lg shadow-ember-500/5 bg-gradient-to-br from-bg-elevated to-bg-surface"
                  />
                ))}
              </div>
            </div>
          )}

          {(isDefaultView ? regularProjects.length > 0 : filteredProjects.length > 0) && (
            <div className="space-y-4">
              {isDefaultView && featuredProjects.length > 0 && (
                <div className="flex items-center gap-2 pt-4 border-t border-border-subtle/50">
                  <LayoutGrid className="h-4 w-4 text-text-tertiary" />
                  <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                    All Projects
                  </h3>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(isDefaultView ? regularProjects : filteredProjects).map((project) => (
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
        </div>
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
            <Button variant="ghost" onClick={() => setDeletingProject(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
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
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
