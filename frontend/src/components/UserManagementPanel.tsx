import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2, Shield, ShieldHalf, UserCheck, KeyRound, Check } from 'lucide-react'
import axios from 'axios'
import type { ProjectMeta } from '../App'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

type AppUser = {
  id: string
  name: string
  role: 'admin' | 'sub_admin' | 'member'
  projectIds: string[]
}

type Props = {
  projects: ProjectMeta[]
  onClose: () => void
}

export default function UserManagementPanel({ projects, onClose }: Props) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pwEdit, setPwEdit] = useState<Record<string, string>>({})
  const [pwSaved, setPwSaved] = useState<Record<string, boolean>>({})

  const loadUsers = async () => {
    const res = await axios.get<{ users: AppUser[] }>(`${API}/api/users`)
    setUsers(res.data.users)
  }

  useEffect(() => { loadUsers() }, [])

  const toggleProject = async (user: AppUser, projectId: string) => {
    const current = user.projectIds ?? []
    const next = current.includes(projectId)
      ? current.filter(id => id !== projectId)
      : [...current, projectId]
    await axios.put(`${API}/api/users/${user.id}/projects`, { projectIds: next })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, projectIds: next } : u))
  }

  const deleteUser = async (userId: string) => {
    await axios.delete(`${API}/api/users/${userId}`)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  const changePassword = async (userId: string) => {
    const newPw = pwEdit[userId]?.trim()
    if (!newPw) return
    await axios.put(`${API}/api/users/${userId}/password`, { password: newPw })
    setPwEdit(prev => ({ ...prev, [userId]: '' }))
    setPwSaved(prev => ({ ...prev, [userId]: true }))
    setTimeout(() => setPwSaved(prev => ({ ...prev, [userId]: false })), 2000)
  }

  const toggleSubAdmin = async (user: AppUser) => {
    const newRole = user.role === 'sub_admin' ? 'member' : 'sub_admin'
    await axios.put(`${API}/api/users/${user.id}/role`, { role: newRole })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
  }

  const roleLabel = (role: AppUser['role']) => {
    if (role === 'admin') return '관리자 (전체 접근)'
    if (role === 'sub_admin') return '부관리자 (전체 접근)'
    return '일반 멤버'
  }

  const roleColor = (role: AppUser['role']) => {
    if (role === 'admin') return 'linear-gradient(135deg, #007aff, #5856d6)'
    if (role === 'sub_admin') return 'linear-gradient(135deg, #ff9500, #ff6b00)'
    return 'linear-gradient(135deg, #34c759, #30d158)'
  }

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 260 }}
      className="w-80 flex-shrink-0 h-full flex flex-col bg-white border-l border-gray-100"
      style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #5856d6, #007aff)' }}
          >
            <UserCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">사용자 관리</h3>
            <p className="text-[10px] text-gray-400">프로젝트 접근 권한 설정</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {users.length === 0 && (
          <p className="text-[12px] text-gray-400 text-center pt-8">등록된 사용자가 없습니다.</p>
        )}
        {users.map(user => (
          <div key={user.id} className="rounded-2xl border border-gray-100 overflow-hidden">
            {/* User row */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold"
                style={{ background: roleColor(user.role) }}
              >
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{user.name}</p>
                  {user.role === 'admin' && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                  {user.role === 'sub_admin' && <ShieldHalf className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-gray-400">{roleLabel(user.role)}</p>
              </div>
              {user.role !== 'admin' && (
                <button
                  onClick={e => { e.stopPropagation(); deleteUser(user.id) }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Expanded settings */}
            {expandedId === user.id && (
              <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50 space-y-3">

                {/* Sub-admin toggle — non-admin only */}
                {user.role !== 'admin' && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">권한</p>
                    <button
                      onClick={() => toggleSubAdmin(user)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all border ${
                        user.role === 'sub_admin'
                          ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
                      }`}
                    >
                      <ShieldHalf className="w-3.5 h-3.5" />
                      {user.role === 'sub_admin' ? '부관리자 권한 회수' : '부관리자 권한 부여'}
                    </button>
                  </div>
                )}

                {/* Password change */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">비밀번호 변경</p>
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      value={pwEdit[user.id] ?? ''}
                      onChange={e => setPwEdit(prev => ({ ...prev, [user.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && changePassword(user.id)}
                      placeholder="새 비밀번호"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-400 transition-colors"
                    />
                    <button
                      onClick={() => changePassword(user.id)}
                      disabled={!pwEdit[user.id]?.trim()}
                      className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                        pwSaved[user.id]
                          ? 'bg-green-500 text-white'
                          : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-30'
                      }`}
                    >
                      {pwSaved[user.id] ? <Check className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Project toggles — member only (sub_admin has full access) */}
                {user.role === 'member' && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">접근 가능 프로젝트</p>
                    {projects.length === 0 && (
                      <p className="text-[11px] text-gray-400">프로젝트가 없습니다.</p>
                    )}
                    {projects.map(proj => {
                      const checked = (user.projectIds ?? []).includes(proj.id)
                      return (
                        <label
                          key={proj.id}
                          className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white cursor-pointer transition-colors"
                        >
                          <div
                            onClick={() => toggleProject(user, proj.id)}
                            className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                              checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {checked && (
                              <svg viewBox="0 0 12 10" className="w-2.5 h-2" fill="none">
                                <polyline points="1,5 4.5,8.5 11,1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[12px] text-gray-700 font-medium flex-1">{proj.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {user.role === 'sub_admin' && (
                  <p className="text-[11px] text-gray-400 px-1">부관리자는 모든 프로젝트에 접근할 수 있습니다.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
