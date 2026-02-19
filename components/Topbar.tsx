import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { ModeToggle } from './ModeToggle'
import { NotificationCenter } from './NotificationCenter'

export function Topbar() {
    return (
        <div className="h-[60px] bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--border)] flex items-center px-[28px] gap-4 shrink-0 z-40 sticky top-0 transition-colors duration-300">
            <div className="flex-1 max-w-[380px] relative">
                <MagnifyingGlassIcon className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[var(--text4)] w-[14px] h-[14px]" />
                <input
                    type="text"
                    placeholder="Quick search employees, departments..."
                    className="w-full pl-[40px] pr-[16px] py-[9px] bg-[var(--bg)] border border-[#00000014] rounded-[10px] text-[13px] text-[var(--text)] outline-none transition-all duration-200 focus:border-[var(--accent)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)] placeholder-[var(--text4)] dark:border-[var(--border)] dark:focus:bg-[var(--surface2)] dark:focus:border-[var(--accent)]"
                />
            </div>

            <div className="ml-auto flex items-center gap-[14px]">
                <ModeToggle />
                <NotificationCenter />

                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center text-white text-[12px] font-bold cursor-pointer border-2 border-transparent transition-all duration-200 shadow-[0_2px_8px_var(--glow)] hover:border-[var(--accent)] hover:scale-105">
                    AD
                </div>
            </div>
        </div>
    )
}
