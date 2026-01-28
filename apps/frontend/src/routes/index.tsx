import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [message, setMessage] = useState<string>('Loading...')
  const [timestamp, setTimestamp] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('http://localhost:4000/api/hello')
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message)
        setTimestamp(data.timestamp)
        setError('')
      })
      .catch((err) => {
        setError('Failed to connect to backend: ' + err.message)
        console.error('Error fetching from backend:', err)
      })
  }, [])

  return (
    <div className="text-center">
      <header className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white text-[calc(10px+2vmin)]">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4 text-[#61dafb]">
            TanStack Start + Elysia
          </h1>
          {error ? (
            <div className="text-red-400 bg-red-900/20 px-6 py-4 rounded-lg">
              <p className="text-xl mb-2">⚠️ {error}</p>
              <p className="text-sm">Make sure the backend is running on port 4000</p>
            </div>
          ) : (
            <div className="bg-green-900/20 px-6 py-4 rounded-lg">
              <p className="text-3xl mb-2">🎉 {message}</p>
              {timestamp && (
                <p className="text-sm text-gray-400">Timestamp: {timestamp}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-6">
          <a
            className="text-[#61dafb] hover:underline"
            href="https://tanstack.com/router"
            target="_blank"
            rel="noopener noreferrer"
          >
            📚 TanStack Router
          </a>
          <a
            className="text-[#61dafb] hover:underline"
            href="https://elysiajs.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            🦊 Elysia.js
          </a>
        </div>
      </header>
    </div>
  )
}
