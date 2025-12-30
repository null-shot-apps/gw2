import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="font-sans grid min-h-screen place-items-center p-8">
      <div className="text-center">
        <h1 className="font-mono text-6xl font-bold">404</h1>
        <p className="mt-4 text-lg">Page not found</p>
        <Link 
          href="/" 
          className="mt-8 inline-block rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}




