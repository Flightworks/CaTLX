import type { ReactNode } from 'react';
import Header from './Header';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="workspace-shell min-h-screen md:flex">
      <Header />
      <main className="mx-auto w-full min-w-0 max-w-screen-xl px-4 py-5 sm:px-6 md:flex-1 lg:px-8 lg:py-7">
        {children}
      </main>
    </div>
  );
}
