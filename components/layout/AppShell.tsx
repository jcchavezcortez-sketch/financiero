import BottomNav from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      <main className="max-w-md mx-auto pb-20 min-h-screen">{children}</main>
      <BottomNav />
    </div>
  );
}
