import { getStudioBySlug } from '@/lib/studio/website'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import { Calendar, User, ArrowLeft, Clock, Share2 } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

export default async function BlogPostPage(props: {
    params: Promise<{ slug: string, branchSlug: string, postSlug: string }>
}) {
    const { slug, branchSlug, postSlug } = await props.params
    const studio = await getStudioBySlug(slug)

    if (!studio) notFound()
    
    // 1. Resolve the specific branch
    const supabase = await createClient()
    const { data: outlet } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('slug', branchSlug)
        .eq('is_active', true)
        .eq('status', 'published')
        .single()
    
    if (!outlet) notFound()

    // 2. Resolve the specific blog post
    const blogPosts = studio.website_config?.blog || []
    const post = blogPosts.find((p: any) => p.slug === postSlug)

    if (!post || post.status !== 'published') notFound()

    // 3. Header Profile Data
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    let profile = null
    let avatarUrl = ''
    if (user) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        profile = profileData
        avatarUrl = profileData?.avatar_url || ''
    }

    const config = studio.website_config || {}
    const theme = config.theme || { primaryColor: '#2D3282' }

    return (
        <div 
            className="flex flex-col min-h-screen bg-white"
            style={{ 
                '--primary-brand': theme.primaryColor,
                '--button-color': theme.buttonColor || theme.primaryColor || '#2D3282',
                '--button-radius': theme.buttonRadius || '9999px',
                '--section-padding': theme.sectionPadding || '5rem',
                '--card-shadow': theme.cardShadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                '--font-heading': theme.headingFont ? theme.headingFont : 'var(--font-serif)',
                '--font-body': theme.bodyFont ? theme.bodyFont : 'var(--font-sans)',
                '--global-text': theme.textColor || '#1b1c19',
                '--global-bg': theme.background || '#faf9f6',
                backgroundColor: 'var(--global-bg)',
                color: 'var(--global-text)'
            } as any}
        >
            <StorefrontHeader 
                studioName={studio.name} 
                logoUrl={config.header?.logoUrl} 
                theme={theme} 
                config={config} 
                profile={profile}
                avatarUrl={avatarUrl}
                currentBranchName={outlet.name}
                hasMultipleBranches={(studio.outlets || []).filter((o: any) => o.is_active && (o.status === 'published' || !o.status)).length > 1}
            />

            <main className="flex-1">
                {/* Hero Section */}
                <div className="relative pt-32 pb-20 px-6 overflow-hidden">
                    <div className="max-w-4xl mx-auto relative z-10 space-y-8">
                        <Link 
                            href={`/s/${slug}/${branchSlug}`}
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-[#2D3282] transition-colors group"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>

                        <div className="space-y-6">
                            <span className="px-4 py-2 bg-zinc-900/5 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-600 border border-zinc-100">
                                {post.category || 'News'}
                            </span>
                            <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tightest leading-[1.1]" style={{ fontFamily: 'var(--font-heading)' }}>
                                {post.title}
                            </h1>
                            
                            <div className="flex flex-wrap items-center gap-8 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-100">
                                        <User className="w-5 h-5 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Written by</p>
                                        <p className="text-sm font-bold text-zinc-900">{post.author}</p>
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-zinc-100" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Published</p>
                                    <p className="text-sm font-bold text-zinc-900">{post.date}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Featured Image */}
                <div className="px-6 pb-20">
                    <div className="max-w-6xl mx-auto aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl border border-zinc-100 relative bg-zinc-50">
                        <img 
                            src={post.image_url || '/images/placeholders/blog-default.png'} 
                            className="w-full h-full object-cover" 
                            alt={post.title} 
                        />
                    </div>
                </div>

                {/* Content */}
                <article className="px-6 pb-32">
                    <div className="max-w-3xl mx-auto">
                        <div className="prose prose-zinc prose-lg max-w-none">
                            <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed font-medium">
                                {post.content}
                            </p>
                        </div>

                        {/* Social Share / Interaction Bar */}
                        <div className="mt-20 pt-12 border-t border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Share Story</span>
                                <div className="flex gap-4">
                                    <button className="p-3 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-all active:scale-95 text-zinc-600">
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                </div>
                             </div>
                             
                             <Link 
                                href={`/s/${slug}/${branchSlug}`}
                                className="group flex items-center gap-6 p-1 pr-8 bg-zinc-900 text-white rounded-full hover:bg-[#2D3282] transition-all shadow-xl active:scale-95"
                             >
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                    <ArrowLeft className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Return to Home</span>
                             </Link>
                        </div>
                    </div>
                </article>

                {/* Related Posts? (Mock for now or can filter from config.blog) */}
                {blogPosts.length > 1 && (
                    <section className="py-32 bg-zinc-50 px-6">
                        <div className="max-w-7xl mx-auto space-y-16">
                            <div className="flex items-end justify-between border-b border-zinc-200 pb-12">
                                <div className="space-y-4">
                                    <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Keep Reading</h2>
                                    <p className="text-sm font-medium text-zinc-500">More insights and wellness stories from our community.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                {blogPosts
                                    .filter((p: any) => p.slug !== postSlug && p.status === 'published')
                                    .slice(0, 3)
                                    .map((p: any, i: number) => (
                                        <Link 
                                            key={i} 
                                            href={`/s/${slug}/${branchSlug}/blog/${p.slug}`}
                                            className="group block space-y-6"
                                        >
                                            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden border border-zinc-200 shadow-sm relative">
                                                <img src={p.image_url || '/images/placeholders/blog-default.png'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={p.title} />
                                            </div>
                                            <div className="space-y-2 px-2">
                                                <h4 className="text-xl font-bold text-zinc-900 group-hover:text-[#2D3282] transition-colors">{p.title}</h4>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{p.date}</p>
                                            </div>
                                        </Link>
                                    ))
                                }
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <StorefrontFooter studio={studio} config={config} theme={theme} />
        </div>
    )
}
