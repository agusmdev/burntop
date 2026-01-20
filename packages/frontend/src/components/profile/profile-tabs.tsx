import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type ProfileTabValue = 'overview' | 'activity' | 'projects' | 'tools' | 'models';

export interface ProfileTabsProps {
  activeTab: ProfileTabValue;
  onTabChange: (tab: ProfileTabValue) => void;
  children: ReactNode;
  className?: string;
}

const tabs: { value: ProfileTabValue; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'projects', label: 'Projects' },
  { value: 'tools', label: 'Tools' },
  { value: 'models', label: 'Models' },
];

export function ProfileTabs({ activeTab, onTabChange, children, className }: ProfileTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ProfileTabValue)}
      className={cn('w-full', className)}
    >
      <div className="sticky top-0 z-10 bg-bg-base/95 backdrop-blur-sm border-b border-border-default -mx-4 px-4 md:-mx-0 md:px-0">
        <TabsList className="h-12 w-full justify-start gap-0 bg-transparent p-0 rounded-none">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'relative h-12 px-4 md:px-6 rounded-none border-b-2 border-transparent',
                'text-text-secondary hover:text-text-primary transition-colors',
                'data-[state=active]:text-ember-500 data-[state=active]:border-ember-500',
                'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                'focus-visible:ring-0 focus-visible:ring-offset-0'
              )}
            >
              <span className="font-medium">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="mt-6">{children}</div>
    </Tabs>
  );
}

export { TabsContent as ProfileTabContent };
