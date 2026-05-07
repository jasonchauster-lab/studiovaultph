'use client'

import React, { memo } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'

interface StorefrontBlogsProps {
    config: any
    theme?: any
    isMobile?: boolean
    posts?: any[]
    studioSlug?: string
    branchSlug?: string
}

function StorefrontBlogs({ config, theme, isMobile = false, posts = [], studioSlug, branchSlug, isPreview = false, onNavigate }: StorefrontBlogsProps & { isPreview?: boolean, onNavigate?: (id: string) => void }) {
    const content = config?.content || {}
    
    // Filter only published posts
    const publishedPosts = posts.filter(p => p.status === 'published')

    // Fallback data if no posts exist
    const displayPosts = publishedPosts.length > 0 ? publishedPosts : [
        { 
            title: '5 Benefits of Pilates for Better Posture', 
            category: 'Wellness', 
            date: 'Oct 10, 2024',
            image_url: 'https://images.unsplash.com/photo-1549476464-37392f71752a?q=80&w=1974',
            slug: '#'
        },
        { 
            title: 'The Ultimate Guide to Reformer Pilates', 
            category: 'Guide', 
            date: 'Oct 05, 2024',
            image_url: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069',
            slug: '#'
        },
        { 
            title: 'Healthy Morning Routines for Busy Professionals', 
            category: 'Lifestyle', 
            date: 'Sep 28, 2024',
            image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=2062',
            slug: '#'
        }
    ]

    return (
        <section id="blogs" className={clsx(
            "py-24 px-6",
            !isMobile && "md:px-12"
        )}>
            <div className="max-w-7xl mx-auto space-y-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-12">
                    <div className="space-y-4 max-w-2xl">
                        <h2 
                            className={clsx(
                                "font-serif font-bold leading-tight",
                                isMobile ? "text-3xl" : "text-4xl md:text-5xl"
                            )}
                            style={{ color: 'var(--global-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            {content.title || 'Insights & Wellness Journal'}
                        </h2>
                        <p className="text-base md:text-lg opacity-60 font-medium leading-relaxed">
                            {content.description || 'Blogs are efficient in helping to increase your web traffic and connect with the community.'}
                        </p>
                    </div>
                </div>

                <div className={clsx(
                    "grid gap-12",
                    isMobile ? "grid-cols-1" : "md:grid-cols-3"
                )}>
                    {displayPosts.map((blog, i) => {
                        const postUrl = (studioSlug && branchSlug && blog.slug && blog.slug !== '#')
                            ? `/s/${studioSlug}/${branchSlug}/blog/${blog.slug}`
                            : '#'
                        
                        const CardWrapper = isPreview ? 'div' : Link
                        
                        return (
                            <CardWrapper 
                                href={isPreview ? undefined : postUrl} 
                                key={i} 
                                onClick={() => {
                                    if (isPreview) {
                                        onNavigate?.('blog')
                                    }
                                }}
                                className="group cursor-pointer space-y-6 block"
                            >
                                <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-sm relative">
                                    <Image 
                                        loader={supabaseLoader}
                                        src={blog.image_url || '/images/placeholders/blog-default.png'} 
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                                        alt={blog.title} 
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                    />
                                    <div className="absolute top-6 left-6">
                                        <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-900 shadow-sm">
                                            {blog.category || 'News'}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-3 px-2">
                                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{blog.date}</span>
                                    <h4 className="text-2xl font-bold text-zinc-900 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                                        {blog.title}
                                    </h4>
                                    <p className="text-[13px] font-black uppercase tracking-widest text-zinc-900 pt-2 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                        Read Story <span className="text-indigo-600">→</span>
                                    </p>
                                </div>
                            </CardWrapper>
                        )
                    })}
                </div>

                {content.showButtons !== false && (
                    <div className="flex justify-center pt-8">
                        <button 
                            onClick={() => {
                                const link = content.btnLink || '/blog'
                                if (isPreview) {
                                    onNavigate?.('blog')
                                    return
                                }
                                if (link.startsWith('#')) {
                                    document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                                } else {
                                    window.location.href = link
                                }
                            }}
                            className="px-12 py-5 border-2 border-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-zinc-900 hover:text-white active:scale-95"
                            style={{ borderRadius: 'var(--button-radius)', borderColor: 'var(--button-color)' }}
                        >
                            {content.btnText || 'Explore Blog'}
                        </button>

                    </div>
                )}
            </div>
        </section>
    )
}

export default memo(StorefrontBlogs)
