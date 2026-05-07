import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Scan, QrCode, UserCheck, ShieldCheck, Zap, History, Search } from 'lucide-react'

export default function ScanPage() {
    return (
        <StudioDashboardShell 
            title="Scan & Check-in"
            description="Instantly check-in your clients by scanning their unique Studio QR codes. Perfect for mobile check-ins at the studio front desk."
            breadcrumbs={[{ label: 'Scan & Check-in' }]}
        >
            <div className="max-w-4xl mx-auto space-y-16">
                 {/* Main Scanner Simulator Interface */}
                 <div className="group bg-zinc-900 aspect-[16/10] md:aspect-[16/7] rounded-[4rem] border border-white/5 relative overflow-hidden shadow-2xl flex items-center justify-center">
                    {/* Simulated Camera Viewfinder */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 opacity-40" />
                    
                    {/* Viewfinder Overlay Frame */}
                    <div className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 border-2 border-white/10 rounded-[3rem] flex items-center justify-center p-8 group-hover:border-emerald-500/50 transition-all duration-700">
                         {/* Viewfinder Corners */}
                         <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                  
                         <div className="w-full h-full bg-white/5 rounded-3xl backdrop-blur-md flex items-center justify-center">
                            <QrCode className="w-16 h-16 sm:w-24 sm:h-24 text-white/20 group-hover:text-emerald-400 transition-colors animate-pulse" />
                         </div>
                    </div>

                    {/* Scanner Instructions Overlay */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 py-3 px-8 bg-black/60 border border-white/10 rounded-full backdrop-blur-xl">
                        <Scan className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Align QR Code to Scan</span>
                    </div>

                    {/* Decorative Scanner Line */}
                    <div className="absolute left-0 w-full h-[2px] bg-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,1)] blur-sm animate-scan top-0" />
                 </div>

                 {/* Check-in Logic Toggles */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-serif font-black text-zinc-900 tracking-tight">Manual Lookup</h3>
                            <Search className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Enter Customer Name or Email" 
                                className="w-full pl-6 pr-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button className="w-full py-5 bg-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-emerald-600 transition-all">
                                Search & Check-in
                            </button>
                        </div>
                     </div>

                     <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-serif font-black text-zinc-900 tracking-tight">Scan History</h3>
                            <History className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Maria Santos', time: '10:15 AM', type: 'Private' },
                                { name: 'Jason Chua', time: '09:42 AM', type: 'Group' }
                            ].map((scan, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100/50 transition-colors">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-zinc-900 tracking-tight">{scan.name}</p>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{scan.type}</p>
                                    </div>
                                    <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Checked OK</div>
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}} />
        </StudioDashboardShell>
    )
}
