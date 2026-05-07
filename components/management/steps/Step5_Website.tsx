'use client'

import { Upload, Check, Info, Bold, Italic, List, Link as LinkIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

interface Step5Props {
    data: any
    accountImage?: string
    updateData: (data: any) => void
}

export default function Step5_Website({ data, accountImage, updateData }: Step5Props) {
    return (
        <div className="space-y-12">
            <div className="space-y-4">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Do you want to display this staff on your website?</h2>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => updateData({ show_on_website: true })}
                        className={clsx(
                            "flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all text-left",
                            data.show_on_website ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200"
                        )}
                    >
                        <div className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            data.show_on_website ? "border-white" : "border-zinc-200"
                        )}>
                            {data.show_on_website && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-black tracking-tight">Yes</span>
                    </button>
                    <button 
                        onClick={() => updateData({ show_on_website: false })}
                        className={clsx(
                            "flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all text-left",
                            !data.show_on_website ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200"
                        )}
                    >
                         <div className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            !data.show_on_website ? "border-white" : "border-zinc-200"
                        )}>
                            {!data.show_on_website && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm font-black tracking-tight">No, I do not need to display</span>
                    </button>
                </div>
            </div>

            {data.show_on_website && (
                <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="pt-8 border-t border-zinc-100 space-y-8">
                        <div className="space-y-1">
                             <h3 className="text-sm font-black text-zinc-900 tracking-tight uppercase tracking-widest text-[11px]">Staff details</h3>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Profile display image</label>
                            <div className="flex items-center gap-8">
                                <div className="w-24 h-24 rounded-[2rem] bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center relative overflow-hidden group">
                                    {data.display_image_url || (data.use_account_image && accountImage) ? (
                                        <img src={data.use_account_image ? accountImage : data.display_image_url} alt="Display" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <button className="px-6 py-3 bg-[#2D3282] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-md active:scale-95 disabled:opacity-50" disabled={data.use_account_image}>
                                        Upload image
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="use_account_image"
                                            checked={data.use_account_image}
                                            onChange={(e) => updateData({ use_account_image: e.target.checked })}
                                            className="w-4 h-4 rounded-md border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                        />
                                        <label htmlFor="use_account_image" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Use account image</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Skilled in</label>
                                <input 
                                    type="text" 
                                    value={data.skills || ''}
                                    onChange={(e) => updateData({ skills: e.target.value })}
                                    placeholder="e.g. Reformer, Mat Pilates, Yoga"
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Hobbies (Optional)</label>
                                <input 
                                    type="text" 
                                    value={data.hobbies || ''}
                                    onChange={(e) => updateData({ hobbies: e.target.value })}
                                    placeholder="e.g. Hiking, Cooking"
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Description</label>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">{(data.description || '').length}/5000</span>
                                </div>
                                
                                {/* Mock Rich Text Editor Container */}
                                <div className="bg-zinc-50 border border-zinc-100 rounded-[2rem] overflow-hidden focus-within:ring-4 focus-within:ring-zinc-100/50 focus-within:bg-white transition-all">
                                    {/* Toolbar */}
                                    <div className="px-6 py-3 border-b border-zinc-100 flex items-center gap-4 bg-white/50">
                                        <div className="flex items-center gap-2 pr-4 border-r border-zinc-100">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Normal</span>
                                            <Info className="w-3 h-3 text-zinc-300" />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Bold className="w-4 h-4 text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors" />
                                            <Italic className="w-4 h-4 text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors" />
                                            <List className="w-4 h-4 text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors" />
                                            <LinkIcon className="w-4 h-4 text-zinc-400 hover:text-zinc-900 cursor-pointer transition-colors" />
                                        </div>
                                    </div>
                                    <textarea 
                                        rows={6}
                                        value={data.description || ''}
                                        onChange={(e) => updateData({ description: e.target.value })}
                                        className="w-full px-8 py-6 bg-transparent outline-none text-[13px] font-medium leading-relaxed resize-none"
                                        placeholder="A Kpop Spin instructor, Piloxing Barre Elite Star Instructor and a big foodie! During her classes, you can expect plenty of Trance, EDM, Techno, Hip-hop, and K-Pop hits while dancing to the beats."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
