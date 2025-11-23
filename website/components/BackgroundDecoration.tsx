'use client'

import { useEffect, useState } from 'react'

export default function BackgroundDecoration() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Top Right Blob */}
            <div
                className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow"
                style={{
                    background: 'radial-gradient(circle, var(--color-igusa-pale) 0%, transparent 70%)',
                }}
            />

            {/* Bottom Left Blob */}
            <div
                className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slower"
                style={{
                    background: 'radial-gradient(circle, var(--color-sakura-pale) 0%, transparent 70%)',
                    animationDelay: '-2s'
                }}
            />

            {/* Center Right Accent */}
            <div
                className="absolute top-[40%] -right-[5%] w-[300px] h-[300px] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float-slow"
                style={{
                    background: 'radial-gradient(circle, var(--color-kin-light) 0%, transparent 70%)',
                    animationDelay: '-4s'
                }}
            />
        </div>
    )
}
