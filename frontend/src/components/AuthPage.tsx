import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import type { AuthUser } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export default function AuthPage() {
  const { login } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !password.trim()) {
      setError('이름과 비밀번호를 모두 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await axios.post<AuthUser>(`${API}${endpoint}`, {
        name: name.trim(),
        password,
      })
      login(res.data)
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.detail ?? '오류가 발생했습니다.')
      } else {
        setError('오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #f2f2f7 0%, #e5e5ea 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.12)' }}
      >
        {/* Logo */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)' }}
          >
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Together</h1>
          <p className="text-[12px] text-gray-400 mt-1">함께하는 프로젝트</p>
        </div>

        {/* Tab */}
        <div className="flex mx-6 mb-6 bg-gray-100 rounded-2xl p-1">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-xl transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              {t === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">
              이름
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="홍길동"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="비밀번호 입력"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 mt-2"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            {loading ? '처리 중...' : tab === 'login' ? '로그인' : '가입하기'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
