"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Images, 
  Globe, 
  ExternalLink, 
  LogOut, 
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      router.push('/login');
    }
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      name: 'Add Vehicle',
      href: '/add',
      icon: PlusCircle,
      isActive: pathname === '/add',
    },
    {
      name: 'Manage Gallery',
      href: '/gallery',
      icon: Images,
      isActive: pathname === '/gallery',
    },
  ];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-3 left-4 z-50 p-2 bg-white rounded-md shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-screen fixed md:sticky top-0 z-40 shadow-xl md:shadow-[1px_0_10px_0_rgba(0,0,0,0.02)] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Top Section */}
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
            <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md group-hover:scale-105 transition-transform bg-[#0b101e] border border-gray-100 flex-shrink-0">
                <img 
                  src="/logo.PNG" 
                  alt="Nexca Logo" 
                  className="w-full h-full object-cover scale-110" 
                />
              </div>
              <div>
                <span className="text-base font-extrabold text-gray-900 tracking-tight block leading-tight">
                  Nexca
                </span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Admin Panel
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-6">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Main Menu
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      item.isActive
                        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm border-l-4 border-blue-600'
                        : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
                    }`}
                  >
                    <Icon 
                      size={18} 
                      className={item.isActive ? 'text-blue-600' : 'text-gray-400'} 
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Quick External Link */}
            <div className="pt-6 mt-6 border-t border-gray-100">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Website
              </p>
              <Link
                href="/"
                target="_blank"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-950 hover:bg-gray-50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-gray-400 group-hover:text-gray-700" />
                  <span>View Public Site</span>
                </div>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-700" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom User & Security Profile Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between gap-3 mb-3 p-2 rounded-xl bg-white border border-gray-200/80 shadow-2xl shadow-gray-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Administrator</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] text-gray-500 font-medium">Protected</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-all active:scale-98 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
