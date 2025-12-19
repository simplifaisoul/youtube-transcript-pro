import { Languages, RefreshCw } from 'lucide-react'

interface LanguageSelectorProps {
  value: string
  onChange: (lang: string) => void
  onReload: () => void
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
]

export default function LanguageSelector({ value, onChange, onReload }: LanguageSelectorProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Languages className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400/60" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-purple-800/50 text-purple-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-gray-900 text-purple-100">
              {lang.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={onReload}
        className="px-4 py-2 bg-purple-800 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/30"
        title="Reload transcript with selected language"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  )
}
