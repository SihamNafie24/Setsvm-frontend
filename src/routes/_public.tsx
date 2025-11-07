import { createFileRoute, Outlet } from '@tanstack/react-router';
import Navbar from '../components/Navbar';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          &copy; {new Date().getFullYear()} Setsvm. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
