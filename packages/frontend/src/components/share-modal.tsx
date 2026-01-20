import { Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Props for the ShareModal component
 */
export interface ShareModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Title of the modal */
  title: string;
  /** Optional description text */
  description?: string;
  /** URL of the image preview */
  imageUrl: string;
  /** URL to be shared/copied */
  shareUrl: string;
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  description,
  imageUrl,
  shareUrl,
}: ShareModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `burntop-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-[1.91/1] w-full rounded-lg overflow-hidden border border-border-default bg-bg-elevated">
            <img
              src={imageUrl}
              alt="Share preview"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Share Actions */}
          <div className="space-y-3">
            {/* Copy Profile Link - Primary Action */}
            <Button
              onClick={handleCopyLink}
              className="w-full bg-ember-500 hover:bg-ember-600 text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Profile Link
            </Button>

            {/* Download Image - Secondary Action */}
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              className="w-full"
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download Image'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
