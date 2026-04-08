import React from 'react';
import { FileText, Layout } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';

export type PageTemplateType = 'standard' | 'grapesjs';

interface PageTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (type: PageTemplateType) => void;
}

const templates = [
  {
    type: 'standard' as const,
    title: 'Standard Template',
    subtitle: 'News, Blogs & Products',
    description: 'Suitable for News, Blogs, and Product pages. Uses fixed structural layout.',
    icon: FileText,
  },
  {
    type: 'grapesjs' as const,
    title: 'Visual Builder',
    subtitle: 'Landing Pages & Homepages',
    description: 'Suitable for Landing Pages and Custom Homepages. Powered by GrapesJS.',
    icon: Layout,
  },
];

export function PageTemplateModal({ open, onOpenChange, onSelectTemplate }: PageTemplateModalProps) {
  const handleSelect = (type: PageTemplateType) => {
    onOpenChange(false);
    onSelectTemplate(type);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl backdrop-blur-xl bg-white/80 dark:bg-[#0f2942]/90 border border-white/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-bold text-[#0f2942] dark:text-white">
            Select Page Template
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Choose a template type for your new page
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.type}
                className="relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#cec18a] border-2 border-transparent bg-gradient-to-br from-white to-gray-50 dark:from-[#1a3a5c] dark:to-[#0f2942] overflow-hidden group"
                onClick={() => handleSelect(template.type)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f2942] to-[#1a4a6e] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <Icon className="w-8 h-8 text-[#cec18a]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-[#0f2942] dark:text-white">
                      {template.title}
                    </h3>
                    <p className="text-sm text-[#cec18a] font-medium">
                      {template.subtitle}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-[#cec18a] text-[#0f2942] hover:bg-[#cec18a] hover:text-[#0f2942] transition-colors"
                  >
                    Select Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
