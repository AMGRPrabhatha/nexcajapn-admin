import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get('nexca_admin_session');

  // Enforce admin authentication guard for all dashboard routes
  if (!session || session.value !== 'authenticated') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Modern White Sidebar */}
      <AdminSidebar />

      {/* Main Admin Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between pl-14 pr-6 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Admin Control Panel</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Session Active
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 sm:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
