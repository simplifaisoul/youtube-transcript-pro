import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (query: string) => void
  resultCount: number
  totalCount: number
}

export default function SearchBar({ value, onChange, resultCount, totalCount }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400/60" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search in transcript..."
        className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-purple-800/50 text-purple-100 placeholder-purple-500/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400/60 hover:text-purple-300"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {value && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-purple-400/70">
          {resultCount} / {totalCount}
        </div>
      )}
    </div>
  )
}
