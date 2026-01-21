import {
  Calendar,
  Code,
  ExternalLink,
  Globe,
  Layers,
  Layout,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';


import type { ProjectResponse } from '@/api/generated.schemas';
import type { ElementType } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getRelativeTime } from '@/lib/utils';

export interface ProjectCardProps {
  project: ProjectResponse;
  isOwner?: boolean;
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (project: ProjectResponse) => void;
  onRefresh?: (project: ProjectResponse) => void;
  className?: string;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Mock data generators based on string hash
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getProjectType(id: string): { label: string; icon: ElementType } {
  const types = [
    { label: 'Web App', icon: Layout },
    { label: 'Library', icon: Code },
    { label: 'Tool', icon: Layers },
    { label: 'API', icon: Globe },
  ];
  return types[hashString(id) % types.length];
}

export function getProjectStatus(id: string): {
  label: string;
  variant: 'success' | 'warning' | 'secondary';
} {
  const statuses = [
    { label: 'Active', variant: 'success' as const },
    { label: 'In Progress', variant: 'warning' as const },
    { label: 'Archived', variant: 'secondary' as const },
  ];
  // Bias towards Active
  const index = hashString(id) % 10;
  if (index < 6) return statuses[0]; // 60% Active
  if (index < 9) return statuses[1]; // 30% In Progress
  return statuses[2]; // 10% Archived
}

function getTechStack(id: string): string[] {
  const techs = [
    'React',
    'TypeScript',
    'Node.js',
    'Python',
    'Go',
    'Rust',
    'Vue',
    'Next.js',
    'Tailwind',
  ];
  const count = (hashString(id) % 3) + 2;
  const result: string[] = [];
  let hash = hashString(id);
  for (let i = 0; i < count; i++) {
    const index = hash % techs.length;
    if (!result.includes(techs[index])) {
      result.push(techs[index]);
    }
    hash = Math.floor(hash / 7);
  }
  return result.length > 0 ? result : ['TypeScript', 'React'];
}

export function ProjectCard({
  project,
  isOwner = false,
  onEdit,
  onDelete,
  onRefresh,
  className,
}: ProjectCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayTitle = project.title || extractDomain(project.url);
  const displayDescription = project.description || project.og_description;

  const type = useMemo(() => getProjectType(project.id), [project.id]);
  const status = useMemo(() => getProjectStatus(project.id), [project.id]);
  const techs = useMemo(() => getTechStack(project.id), [project.id]);
  const timeAgo = getRelativeTime(project.created_at);

  const handleOpenProject = () => {
    window.open(project.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden bg-bg-elevated border-border-default flex flex-col',
        'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 hover:border-ember-500/50',
        'transition-all duration-200 ease-in-out',
        'cursor-pointer h-full',
        className
      )}
      onClick={handleOpenProject}
    >
      {/* Featured Badge */}
      {project.is_featured && (
        <div className="absolute top-2 left-2 z-20">
          <Badge variant="ember" className="gap-1 border-ember-500/30">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit?.(project)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRefresh?.(project)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Metadata
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => onDelete?.(project)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Image Section */}
      <div className="aspect-video relative bg-bg-surface overflow-hidden shrink-0">
        {project.og_image_url && !imageError ? (
          <img
            src={project.og_image_url}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-bg-surface border-b border-border-subtle p-6 text-center">
            <Globe className="h-12 w-12 text-text-tertiary mb-3 opacity-50" />
            <span className="text-sm text-text-tertiary font-mono break-all line-clamp-1 px-4">
              {extractDomain(project.url)}
            </span>
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated via-transparent to-transparent opacity-60" />

        {/* Type Badge on Image (Bottom Left) */}
        <div className="absolute bottom-2 left-2 flex gap-2">
          <Badge
            variant="secondary"
            className="bg-black/50 backdrop-blur-sm border-white/10 text-white/90 hover:bg-black/60"
          >
            <type.icon className="h-3 w-3 mr-1" />
            {type.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col grow gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg text-text-primary line-clamp-1 group-hover:text-ember-500 transition-colors">
            {displayTitle}
          </h3>
          <ExternalLink className="h-4 w-4 shrink-0 text-text-tertiary group-hover:text-ember-500 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 duration-200" />
        </div>

        {/* Description */}
        {displayDescription && (
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
            {displayDescription}
          </p>
        )}

        {/* Tech Stack */}
        <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
          {techs.map((tech) => (
            <span
              key={tech}
              className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-mono"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border-subtle/50 text-xs text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
          <Badge
            variant={status.variant}
            className="h-5 px-1.5 text-[10px] border-none bg-opacity-20 text-opacity-90"
          >
            {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-bg-elevated border-border-default flex flex-col h-full">
      <div className="aspect-video bg-bg-surface relative">
        <Skeleton className="w-full h-full" />
        <div className="absolute bottom-2 left-2">
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-auto pt-4 flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex justify-between pt-2 border-t border-border-subtle/50">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}
