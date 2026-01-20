import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface CliCommandProps {
  command: string;
  className?: string;
}

export function CliCommand({ command, className }: CliCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-elevated border border-border-subtle font-mono text-sm group',
        className
      )}
    >
      <span className="text-text-tertiary select-none">$</span>
      <code className="text-text-primary">{command}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 -mr-1.5 rounded-md text-text-tertiary hover:text-ember-500 hover:bg-ember-500/10 transition-colors"
        aria-label={copied ? 'Copied!' : 'Copy command'}
      >
        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
