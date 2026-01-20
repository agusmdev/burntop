import { ExternalLink, Globe, MoreHorizontal, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { ProjectResponse } from '@/api/generated.schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  const domain = extractDomain(project.url);

  const handleOpenProject = () => {
    window.open(project.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden bg-bg-elevated border-border-default',
        'hover:border-ember-500/50 transition-all duration-200',
        'cursor-pointer',
        className
      )}
      onClick={handleOpenProject}
    >
      {project.is_featured && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-ember-500/20 border border-ember-500/30">
            <Star className="h-3 w-3 text-ember-500 fill-ember-500" />
            <span className="text-xs text-ember-500 font-medium">Featured</span>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-bg-elevated/80 backdrop-blur">
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

      <div className="aspect-video relative bg-bg-surface overflow-hidden">
        {project.og_image_url && !imageError ? (
          <img
            src={project.og_image_url}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Globe className="h-12 w-12 text-text-tertiary" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated/90 via-transparent to-transparent" />
      </div>

      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary line-clamp-1 group-hover:text-ember-500 transition-colors">
            {displayTitle}
          </h3>
          <ExternalLink className="h-4 w-4 shrink-0 text-text-tertiary group-hover:text-ember-500 transition-colors" />
        </div>

        {displayDescription && (
          <p className="text-sm text-text-secondary line-clamp-2">{displayDescription}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {project.favicon_url ? (
            <img
              src={project.favicon_url}
              alt=""
              className="h-4 w-4 rounded-sm"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="h-4 w-4 text-text-tertiary" />
          )}
          <span className="text-xs text-text-tertiary truncate">{domain}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-bg-elevated border-border-default">
      <div className="aspect-video bg-bg-surface">
        <Skeleton className="w-full h-full" />
      </div>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
