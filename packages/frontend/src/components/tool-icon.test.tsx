import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  formatToolName,
  getToolColor,
  getToolConfig,
  ToolBadge,
  ToolIcon,
} from './tool-icon';

describe('getToolConfig', () => {
  it('returns config for known tools', () => {
    const cursorConfig = getToolConfig('cursor');
    expect(cursorConfig.name).toBe('Cursor');
    expect(cursorConfig.color).toBe('#00D4AA');
  });

  it('returns config for claude-code', () => {
    const config = getToolConfig('claude-code');
    expect(config.name).toBe('Claude Code');
    expect(config.color).toBe('#D97706');
  });

  it('returns config for chatgpt', () => {
    const config = getToolConfig('chatgpt');
    expect(config.name).toBe('ChatGPT');
    expect(config.color).toBe('#10A37F');
  });

  it('returns config for copilot', () => {
    const config = getToolConfig('copilot');
    expect(config.name).toBe('GitHub Copilot');
    expect(config.color).toBe('#6E40C9');
  });

  it('normalizes tool names to lowercase with hyphens', () => {
    expect(getToolConfig('Claude Code').name).toBe('Claude Code');
    expect(getToolConfig('CURSOR').name).toBe('Cursor');
    expect(getToolConfig('GitHub Copilot').name).toBe('GitHub Copilot');
  });

  it('returns default config for unknown tools', () => {
    const config = getToolConfig('unknown-tool');
    expect(config.color).toBe('#6B7280');
  });

  it('formats unknown tool name for display', () => {
    const config = getToolConfig('my-custom-tool');
    expect(config.name).toBe('My Custom Tool');
  });
});

describe('formatToolName', () => {
  it('returns formatted name for known tools', () => {
    expect(formatToolName('cursor')).toBe('Cursor');
    expect(formatToolName('claude-code')).toBe('Claude Code');
    expect(formatToolName('chatgpt')).toBe('ChatGPT');
  });

  it('formats unknown tools with capitalization', () => {
    expect(formatToolName('my-tool')).toBe('My Tool');
    expect(formatToolName('another-ai-tool')).toBe('Another Ai Tool');
  });

  it('handles single word tools', () => {
    expect(formatToolName('test')).toBe('Test');
  });
});

describe('getToolColor', () => {
  it('returns correct color for known tools', () => {
    expect(getToolColor('cursor')).toBe('#00D4AA');
    expect(getToolColor('claude-code')).toBe('#D97706');
    expect(getToolColor('chatgpt')).toBe('#10A37F');
  });

  it('returns gray for unknown tools', () => {
    expect(getToolColor('unknown')).toBe('#6B7280');
  });
});

describe('ToolIcon', () => {
  it('renders tool icon with correct name', () => {
    render(<ToolIcon source="cursor" showLabel />);

    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders icon without label by default', () => {
    render(<ToolIcon source="cursor" />);

    expect(screen.queryByText('Cursor')).not.toBeInTheDocument();
  });

  it('renders SVG icon', () => {
    const { container } = render(<ToolIcon source="cursor" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  describe('size variants', () => {
    it('applies small size styles', () => {
      const { container } = render(<ToolIcon source="cursor" size="sm" />);

      const iconWrapper = container.querySelector('.w-6');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('applies medium size styles (default)', () => {
      const { container } = render(<ToolIcon source="cursor" size="md" />);

      const iconWrapper = container.querySelector('.w-8');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('applies large size styles', () => {
      const { container } = render(<ToolIcon source="cursor" size="lg" />);

      const iconWrapper = container.querySelector('.w-10');
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ToolIcon source="cursor" className="custom-icon" />
    );

    expect(container.firstChild).toHaveClass('custom-icon');
  });

  it('applies tool-specific background color', () => {
    const { container } = render(<ToolIcon source="cursor" />);

    const iconWrapper = container.querySelector('[style*="background-color"]');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('renders different icons for different tools', () => {
    const { container: container1 } = render(<ToolIcon source="cursor" />);
    const { container: container2 } = render(<ToolIcon source="chatgpt" />);

    // Different tools should have different styling
    const icon1Style = container1.querySelector('[style*="color"]')?.getAttribute('style');
    const icon2Style = container2.querySelector('[style*="color"]')?.getAttribute('style');

    expect(icon1Style).not.toBe(icon2Style);
  });
});

describe('ToolBadge', () => {
  it('renders tool name', () => {
    render(<ToolBadge source="cursor" />);

    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders SVG icon', () => {
    const { container } = render(<ToolBadge source="cursor" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies tool-specific styling', () => {
    const { container } = render(<ToolBadge source="cursor" />);

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveStyle({ backgroundColor: 'rgba(0, 212, 170, 0.15)' });
    expect(badge).toHaveStyle({ color: '#00D4AA' });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ToolBadge source="cursor" className="custom-badge" />
    );

    expect(container.firstChild).toHaveClass('custom-badge');
  });

  it('renders different tools correctly', () => {
    const { rerender } = render(<ToolBadge source="cursor" />);
    expect(screen.getByText('Cursor')).toBeInTheDocument();

    rerender(<ToolBadge source="claude-code" />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();

    rerender(<ToolBadge source="chatgpt" />);
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
  });
});
