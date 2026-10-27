import { Link } from 'react-router-dom';
import { Hotel, Home, Search } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('404 Page Not Found');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
          <Hotel className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Sorry, the page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="btn-primary inline-flex items-center justify-center gap-2 text-sm py-3 min-h-[48px]"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </Link>
          <Link
            to="/"
            className="btn-secondary inline-flex items-center justify-center gap-2 text-sm py-3 min-h-[48px]"
          >
            <Search className="w-4 h-4" />
            Search Rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
