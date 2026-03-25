import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';

interface MobileNavProps {
  userEmail: string;
  onSignOut: () => void;
}

export function MobileNav({ userEmail, onSignOut }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex md:hidden h-14 items-center gap-3 border-b border-border bg-sidebar px-4">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">VN</span>
          </div>
          <span className="font-semibold text-sm">MCP Hub</span>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[240px]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            userEmail={userEmail}
            onSignOut={onSignOut}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
