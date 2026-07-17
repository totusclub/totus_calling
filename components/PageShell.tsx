'use client';

import { ReactNode } from 'react';

export default function PageShell({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                padding: '40px 20px',
                background: '#000000',
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(ellipse at top, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 50%, #000000 100%)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        width: '700px',
                        height: '700px',
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(254,115,46,0.25) 0%, rgba(254,115,46,0.08) 40%, transparent 70%)',
                        top: '-350px',
                        left: '-250px',
                        filter: 'blur(80px)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.06) 40%, transparent 70%)',
                        bottom: '-300px',
                        right: '-200px',
                        filter: 'blur(80px)',
                    }}
                />
            </div>
            <div
                style={{
                    width: '100%',
                    maxWidth: '1200px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                    position: 'relative',
                    zIndex: 10,
                }}
            >
                {children}
            </div>
        </div>
    );
}
