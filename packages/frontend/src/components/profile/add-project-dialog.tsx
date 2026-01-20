import { Globe, Loader2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProjectCreate, ProjectResponse, ProjectUpdate } from '@/api/generated.schemas';
import type React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectCreate | ProjectUpdate) => Promise<void>;
  editingProject?: ProjectResponse | null;
  isLoading?: boolean;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AddProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  editingProject,
  isLoading = false,
}: AddProjectDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [urlError, setUrlError] = useState('');

  const isEditing = !!editingProject;

  useEffect(() => {
    if (editingProject) {
      setUrl(editingProject.url);
      setTitle(editingProject.title || '');
      setDescription(editingProject.description || '');
      setIsFeatured(editingProject.is_featured);
    } else {
      setUrl('');
      setTitle('');
      setDescription('');
      setIsFeatured(false);
    }
    setUrlError('');
  }, [editingProject, open]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value && !isValidUrl(value)) {
      setUrlError('Please enter a valid URL (starting with http:// or https://)');
    } else {
      setUrlError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      setUrlError('URL is required');
      return;
    }

    if (!isValidUrl(url)) {
      setUrlError('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    const data: ProjectCreate | ProjectUpdate = {
      url,
      title: title || undefined,
      description: description || undefined,
      is_featured: isFeatured,
    };

    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-elevated border-border-default sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            {isEditing ? 'Edit Project' : 'Add Project'}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {isEditing
              ? 'Update your project details below.'
              : "Add a project URL and we'll automatically fetch its preview image and metadata."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-text-primary">
              Project URL <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                id="url"
                type="url"
                placeholder="https://myproject.com"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={cn('pl-9', urlError && 'border-red-500')}
                disabled={isLoading}
              />
            </div>
            {urlError && <p className="text-xs text-red-500">{urlError}</p>}
            <p className="text-xs text-text-tertiary">
              We&apos;ll fetch the OG image and description automatically
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-text-primary">
              Custom Title
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Override the auto-detected title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              disabled={isLoading}
            />
            <p className="text-xs text-text-tertiary">
              Leave empty to use the title from the website
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-text-primary">
              Custom Description
            </Label>
            <Textarea
              id="description"
              placeholder="Override the auto-detected description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={isLoading}
              className="bg-bg-elevated border-border-default text-text-primary placeholder:text-text-tertiary resize-none"
            />
            <p className="text-xs text-text-tertiary">
              Leave empty to use the description from the website
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="featured"
              checked={isFeatured}
              onCheckedChange={setIsFeatured}
              disabled={isLoading}
            />
            <Label
              htmlFor="featured"
              className="text-text-secondary cursor-pointer flex items-center gap-1.5"
            >
              <Star className="h-4 w-4 text-ember-500" />
              Mark as featured project
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !url || !!urlError}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Adding...'}
                </>
              ) : isEditing ? (
                'Update Project'
              ) : (
                'Add Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
