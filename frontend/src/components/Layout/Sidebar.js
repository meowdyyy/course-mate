import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon,
  HomeIcon,
  BookOpenIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  AcademicCapIcon,
  PlusIcon,
  CloudArrowUpIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  const getNavigationItems = () => {
    const commonItems = [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Courses', href: '/courses', icon: BookOpenIcon },
  { name: 'Resources', href: '/resources', icon: DocumentTextIcon },
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
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
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
