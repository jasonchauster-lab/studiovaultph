'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, Calendar, ChevronDown, MoreVertical, Trash2, User, Clock, Loader2 } from 'lucide-react'
import { getClientNotes, addClientNote, deleteClientNote } from '@/app/(dashboard)/studio/customers/[id]/actions'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'

interface NotesTabProps {
    clientId: string
    studioId: string
}

export default function NotesTab({ clientId, studioId }: NotesTabProps) {
    const [notes, setNotes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newNoteContent, setNewNoteContent] = useState('')
    const { toast } = useToast()

    useEffect(() => {
        fetchNotes()
    }, [clientId, studioId])

    const fetchNotes = async () => {
        try {
            const data = await getClientNotes(clientId, studioId)
            setNotes(data)
        } catch (err) {
            console.error('Error fetching notes:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return
        setIsAdding(true)
        try {
            await addClientNote({
                clientId,
                studioId,
                content: newNoteContent
            })
            setNewNoteContent('')
            fetchNotes()
            toast('Note added successfully', 'success')
        } catch (err) {
            toast('Failed to add note', 'error')
        } finally {
            setIsAdding(false)
        }
    }

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this note?')) return
        try {
            await deleteClientNote(noteId, clientId)
            fetchNotes()
            toast('Note deleted', 'success')
        } catch (err) {
            toast('Failed to delete note', 'error')
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 md:max-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                        type="text"
                        placeholder="Search notes..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                    />
                </div>
                
                <div className="ml-auto">
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="px-8 py-3 bg-[#2D3282] text-white rounded-full text-xs font-black shadow-lg shadow-[#2D3282]/10 uppercase tracking-widest flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" /> Add Note
                    </button>
                </div>
            </div>

            {/* Add Note Form */}
            {isAdding && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">New Note Content</label>
                        <textarea 
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Type your note here..."
                            rows={4}
                            className="w-full px-6 py-5 bg-zinc-50 border-none rounded-3xl text-sm font-medium text-zinc-900 focus:ring-2 focus:ring-[#2D3282]/10 outline-none transition-all resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="px-8 py-3 bg-zinc-100 text-zinc-400 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddNote}
                            disabled={!newNoteContent.trim() || isAdding}
                            className="px-8 py-3 bg-[#2D3282] text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#1e225a] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white border border-zinc-100 rounded-[3rem] shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
                </div>
            ) : notes.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {notes.map((note) => (
                        <div key={note.id} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center overflow-hidden border border-zinc-100">
                                        {note.author?.avatar_url ? (
                                            <img src={note.author.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-zinc-300" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-zinc-900 tracking-tight">{note.author?.full_name || 'Staff Member'}</span>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(note.created_at), 'dd MMM yyyy • hh:mm aa')}
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-sm font-medium text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                {note.content}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 bg-white border border-zinc-100 rounded-[3rem] shadow-sm">
                    <span className="text-4xl mb-4">🧐</span>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Write a note.</h3>
                    <p className="text-sm font-bold text-zinc-400 mt-2">Notes are a great way to remember your customer's progress and experience.</p>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="mt-4 text-[#2D3282] text-sm font-black uppercase tracking-widest hover:underline underline-offset-4"
                    >
                        + Add a note
                    </button>
                </div>
            )}
        </div>
    )
}
