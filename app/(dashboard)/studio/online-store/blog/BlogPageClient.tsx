'use client'

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Plus, Trash2, Save, Loader2, X, Image as ImageIcon, User, Calendar } from 'lucide-react'
import { updateStudioWebsite, uploadStudioAsset } from '@/app/(dashboard)/studio/studio-actions'
import { useToast } from '@/components/ui/Toast'
import { clsx } from 'clsx'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'

interface BlogPageClientProps {
    studio: {
        id: string
        slug: string
        name?: string | null
        website_config?: {
            blog?: BlogPost[]
            [key: string]: unknown
        } | null
    }
}

interface BlogPost {
    id: string
    title: string
    slug: string
    content: string
    author: string
    date: string
    image_url?: string
    category?: string
    status: 'published' | 'draft'
}

export default function BlogPageClient({ studio }: BlogPageClientProps) {
    const { toast } = useToast()
    const [config, setConfig] = useState(studio.website_config || { blog: [] })
    const [isSaving, setIsSaving] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const nextPostId = useRef(1000)

    const posts: BlogPost[] = config.blog || [
        { id: 'b1', title: 'Why Pilates is the ultimate core workout', slug: 'ultimate-core-workout', author: 'Emma M', date: '08 Apr 2026', status: 'published', content: 'Long form content here...' },
        { id: 'b2', title: '5 tips for your first reformer session', slug: 'first-reformer-session', author: 'Emma M', date: '05 Apr 2026', status: 'published', content: 'Long form content here...' }
    ]

    const handleSaveConfig = async (newPosts: BlogPost[]) => {
        setIsSaving(true)
        const newConfig = { ...config, blog: newPosts }
        const formData = new FormData()
        formData.append('studioId', studio.id)
        formData.append('slug', studio.slug)
        formData.append('websiteConfig', JSON.stringify(newConfig))

        const result = await updateStudioWebsite(formData)
        if (result.success) {
            setConfig(newConfig)
            toast('Blog posts updated!', 'success')
            setIsModalOpen(false)
        } else {
            toast(result.error || 'Failed to update blog', 'error')
        }
        setIsSaving(false)
    }

    const handleAddOrEdit = (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        const title = formData.get('title') as string
        if (!editingPost) {
            nextPostId.current += 1
        }
        const postData: BlogPost = {
            id: editingPost?.id || `blog-post-${nextPostId.current}`,
            title: title,
            slug: editingPost?.slug || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
            author: formData.get('author') as string,
            category: formData.get('category') as string,
            status: ((formData.get('status') as string) || 'published') as BlogPost['status'],
            content: formData.get('content') as string,
            image_url: editingPost?.image_url || '',
            date: editingPost?.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        }

        const newPosts = editingPost 
            ? posts.map(p => p.id === editingPost.id ? postData : p)
            : [...posts, postData]
        
        handleSaveConfig(newPosts)
    }

    const handleDelete = (id: string) => {
        if (confirm('Delete this blog post?')) {
            handleSaveConfig(posts.filter(p => p.id !== id))
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('studioId', studio.id)
        formData.append('type', 'blog')
        
        const res = await uploadStudioAsset(formData)
        if (res.success && res.url) {
            if (editingPost) {
                setEditingPost({ ...editingPost, image_url: res.url })
            }
        }
        setIsUploading(false)
    }

    const actions = (
        <button 
            onClick={() => { setEditingPost(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-[#2D3282] rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all shadow-xl"
        >
            <Plus className="w-4 h-4" />
            New Post
        </button>
    )

    return (
        <StudioDashboardShell
            title="Blog"
            description="Publish studio news and expert pilates tips for your community."
            breadcrumbs={[{ label: 'Online Store', href: '/studio/online-store' }, { label: 'Blog' }]}
            actions={actions}
        >
            <div className="space-y-8">
                <OnlineStorePageIntro
                    eyebrow="Content"
                    title="Publish stories and updates that make the storefront feel active and credible."
                    description="Use blog posts for education, offers, instructor spotlights, and studio news. Keep posts aligned with the same brand voice and visual identity as the rest of the storefront."
                    primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    secondaryAction={{ label: 'View Live Site', href: `/s/${studio.slug}` }}
                    metrics={[
                        { label: 'Total Posts', value: String(posts.length) },
                        { label: 'Published', value: String(posts.filter((post) => post.status === 'published').length) },
                    ]}
                />

                {/* Posts List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <div key={post.id} className="group bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden hover:shadow-2xl hoverShadow-zinc-200/50 transition-all duration-700 flex flex-col">
                            <div className="aspect-[16/10] bg-zinc-50 relative overflow-hidden">
                                {post.image_url ? (
                                    <img src={post.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={post.title} />
                                ) : (
                                    <img src="/images/placeholders/blog-default.png" className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" alt="Placeholder" />
                                )}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <span className={clsx(
                                        "px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest border backdrop-blur-md",
                                        post.status === 'published' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                                    )}>
                                        {post.status}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8 space-y-4 flex-1 flex flex-col">
                                <h4 className="text-xl font-black text-zinc-900 tracking-tight leading-tight group-hover:text-[#2D3282] transition-colors">{post.title}</h4>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5"><User className="w-3 h-3" /> {post.author}</div>
                                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {post.date}</div>
                                </div>
                                <div className="pt-6 mt-auto flex items-center justify-between border-t border-zinc-50">
                                    <button 
                                        onClick={() => { setEditingPost(post); setIsModalOpen(true); }}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282] hover:text-indigo-900 transition-colors"
                                    >
                                        Edit Post
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(post.id)}
                                        className="text-zinc-200 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
                        <div className="px-12 py-8 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
                             <div className="space-y-1">
                                <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{editingPost ? 'Edit Blog Post' : 'New Blog Post'}</h3>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Content Management</p>
                             </div>
                             <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-full transition-all border border-transparent hover:border-zinc-200 shadow-sm">
                                <X className="w-6 h-6 text-zinc-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddOrEdit} className="p-12 overflow-y-auto space-y-10">
                            <div className="grid grid-cols-12 gap-10">
                                <div className="col-span-8 space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Post Title</label>
                                        <input 
                                            name="title" 
                                            defaultValue={editingPost?.title} 
                                            required 
                                            className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-lg font-black tracking-tight focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Content Body</label>
                                        <textarea 
                                            name="content" 
                                            defaultValue={editingPost?.content}
                                            required
                                            rows={12}
                                            className="w-full px-8 py-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] text-sm leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-4 space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Featured Image</label>
                                        <div className="group aspect-video bg-zinc-50 rounded-[2rem] border-2 border-dashed border-zinc-100 overflow-hidden relative flex flex-col items-center justify-center hover:border-[#2D3282] transition-all">
                                            {editingPost?.image_url ? (
                                                <>
                                                    <img src={editingPost.image_url} className="w-full h-full object-cover" alt={editingPost.title || 'Featured image'} />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <label className="cursor-pointer bg-white text-zinc-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Change Image</label>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center text-zinc-300">
                                                    <ImageIcon className="w-12 h-12 mb-2" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Upload 1200x800</span>
                                                </div>
                                            )}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                                            {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-black animate-pulse uppercase tracking-[0.2em] text-[#2D3282]">Uploading...</div>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Author Name</label>
                                        <input 
                                            name="author" 
                                            defaultValue={editingPost?.author || studio.name || ''} 
                                            required 
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Category</label>
                                        <input 
                                            name="category" 
                                            defaultValue={editingPost?.category || 'Wellness'} 
                                            placeholder="e.g. Wellness, Guide, lifestyle"
                                            required 
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Status</label>
                                        <select 
                                            name="status" 
                                            defaultValue={editingPost?.status || 'published'}
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold focus:bg-white focus:outline-none appearance-none transition-all"
                                        >
                                            <option value="published">Published</option>
                                            <option value="draft">Draft</option>
                                        </select>
                                    </div>

                                    <div className="pt-6 space-y-4">
                                        <button 
                                            type="submit" 
                                            disabled={isSaving || isUploading}
                                            className="w-full py-5 bg-[#2D3282] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {editingPost ? 'Save Changes' : 'Publish Post'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsModalOpen(false)}
                                            className="w-full py-5 bg-zinc-100 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                                        >
                                            Discard Draft
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </StudioDashboardShell>
    )
}

