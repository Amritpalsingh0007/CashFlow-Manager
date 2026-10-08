export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-700 p-6">
      <img
        src="/icons/icon-192.png"
        alt="Brook logo"
        width={96}
        height={96}
        className="mb-4"
      />
      <h1 className="text-2xl font-bold mb-4">You're offline</h1>
      <p className="text-center mb-6">
        It looks like you've lost your internet connection. Please check your
        connection and try again.
      </p>
      <a
        href="/"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        Go home
      </a>
    </div>
  )
}