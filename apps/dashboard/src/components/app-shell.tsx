import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';

interface AppShellProps {
  userEmail: string;
  onSignOut: () => void;
}

export function AppShell({ userEmail, onSignOut }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden below md */}
      <div className="hidden md:flex">
        <Sidebar userEmail={userEmail} onSignOut={onSignOut} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar — visible below md only */}
        <MobileNav userEmail={userEmail} onSignOut={onSignOut} />

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
