import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  HomeIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  AcademicCapIcon,
  PlusIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [gamify, setGamify] = useState({ level: 0, coins: 0, expPoints: 0, neededForNext: 200 });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await axios.get('/api/gamification/me');
        if (!ignore) setGamify(res.data);
      } catch (_) {}
    }
    if (user) load();
    return () => { ignore = true; };
  }, [user]);

  // Listen for gamification updates dispatched by the reward helper
  useEffect(() => {
    function onUpdate(e) {
      if (e?.detail?.state) setGamify(e.detail.state);
    }
    window.addEventListener('gamification:update', onUpdate);
    return () => window.removeEventListener('gamification:update', onUpdate);
  }, []);

  const getNavigationItems = () => {
    const commonItems = [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Courses', href: '/courses', icon: BookOpenIcon },
      { name: 'Resources', href: '/resources', icon: DocumentTextIcon },
      { name: 'Todo List', href: '/todos', icon: ClipboardDocumentListIcon },
      { name: 'Direct & Groupchats', href: '/chat', icon: ChatBubbleLeftIcon },
    ];

    if (user?.role === 'student') {
      return [
        ...commonItems,
        { name: 'My Courses', href: '/my-courses', icon: AcademicCapIcon },
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...commonItems,
  { name: 'User Management', href: '/admin/users', icon: UserGroupIcon },
  { name: 'Create Course', href: '/create-course', icon: PlusIcon },
      ];
    }

    return commonItems;
  };

  const navigation = getNavigationItems();

  // Pastel-colored initials avatar (stable per user)
  const avatarColors = useMemo(() => {
    if (!user) return { bg: '#e5e7eb', fg: '#374151' }; // fallback (gray-200 bg, slate-700 text)
    const key = user._id || user.email || `${user.firstName||''}${user.lastName||''}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    const bg = `hsl(${hue} 70% 85%)`;
    const fg = '#111827'; // gray-900 for legibility on light pastels
    return { bg, fg };
  }, [user]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
  <div className="flex items-center h-16 flex-shrink-0 px-4 bg-black">
        <BookOpenIcon className="h-8 w-8 text-white" />
  <span className="ml-2 text-xl font-semibold text-white">CourseMate</span>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                } flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-150`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="mr-3 h-6 w-6" />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: avatarColors.bg }}>
              <span className="text-sm font-medium" style={{ color: avatarColors.fg }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        {/* EXP Gauge */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[11px] text-gray-600">
          <span>Lvl {gamify.level}</span>
          <span className="font-mono">EXP {gamify.expPoints}/{gamify.neededForNext}</span>
                </div>
                <div className="w-48 h-2 bg-emerald-200 rounded overflow-hidden">
                          <div
                  className="h-2 bg-purple-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((gamify.expPoints / (gamify.neededForNext || 1)) * 100))}%` }}
                          />
                        </div>
        <div className="text-[11px] text-gray-600 mt-1">Coins: <span className="font-semibold text-yellow-600">{gamify.coins}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <SidebarContent />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
