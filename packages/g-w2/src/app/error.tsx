'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="font-sans grid min-h-screen place-items-center p-8">
      <div className="text-center">
        <h2 className="font-mono text-4xl font-bold">Something went wrong!</h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-block rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        >
          Try again
        </button>
      </div>
    </div>
  );
}








