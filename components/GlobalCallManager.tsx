'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import CallModal from '@/components/CallModal';
import { getStoredUser } from '@/lib/auth-api';
import {
    answerCall,
    getActiveCallInfo,
    getCallState,
    initWebRTCWithLoyaltyId,
    rejectCall,
    setCallActiveChangeCallback,
    setCallStateChangeCallback,
    type CallState,
} from '@/lib/webrtc-service';

function formatCallTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function GlobalCallManager() {
    const pathname = usePathname();
    const userMinimizedRef = useRef(false);

    const [callModalVisible, setCallModalVisible] = useState(false);
    const [callState, setCallState] = useState<CallState>('idle');
    const [callerName, setCallerName] = useState<string | null>(null);
    const [callSeconds, setCallSeconds] = useState(0);
    const [isCallActive, setIsCallActive] = useState(false);

    useEffect(() => {
        const user = getStoredUser();
        const loyaltyId = user?.loyaltyId || (user as { loyalty_id?: string })?.loyalty_id;
        if (!loyaltyId) return;

        try {
            initWebRTCWithLoyaltyId(loyaltyId);
        } catch (error) {
            console.error('GlobalCallManager: WebRTC init failed', error);
        }

        setCallStateChangeCallback((state, name) => {
            setCallState(state);
            setCallerName(name);

            if (state === 'ringing' || state === 'calling') {
                userMinimizedRef.current = false;
                setCallModalVisible(true);
                return;
            }

            if (state === 'idle' || state === 'ended' || state === 'rejected') {
                userMinimizedRef.current = false;
            }
        });

        setCallActiveChangeCallback((active) => {
            setIsCallActive(active);
        });

        return () => {
            setCallStateChangeCallback(() => {});
            setCallActiveChangeCallback(() => {});
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const state = getCallState();
            const info = getActiveCallInfo();

            setCallState(state.state);
            setCallerName(state.callerName);

            if (info.isActive && info.startedAt) {
                setIsCallActive(true);
                setCallSeconds(Math.floor((Date.now() - info.startedAt) / 1000));
            } else {
                setIsCallActive(false);
                setCallSeconds(0);
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (callState === 'ended' || callState === 'rejected') {
            const timer = setTimeout(() => setCallModalVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [callState]);

    if (pathname === '/login') return null;

    const showMiniBar = callState !== 'idle' && !callModalVisible;
    const callInfo = getCallState();

    const minimizeModal = () => {
        userMinimizedRef.current = true;
        setCallModalVisible(false);
    };

    const handleQuickAnswer = () => {
        if (callInfo.callUUID) {
            answerCall(callInfo.callUUID);
        }
        userMinimizedRef.current = false;
        setCallModalVisible(true);
    };

    const handleQuickReject = () => {
        if (callInfo.callUUID) {
            rejectCall(callInfo.callUUID);
        }
        setCallModalVisible(false);
    };

    return (
        <>
            <CallModal visible={callModalVisible} onClose={minimizeModal} />

            {showMiniBar ? (
                <div
                    style={{
                        position: 'fixed',
                        right: 20,
                        bottom: 20,
                        zIndex: 9998,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    {callState === 'ringing' ? (
                        <>
                            <button
                                type="button"
                                onClick={handleQuickReject}
                                title="Отклонить"
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                    color: '#fff',
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    boxShadow: '0 12px 30px rgba(220,38,38,0.45)',
                                }}
                            >
                                ✕
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickAnswer}
                                title="Ответить"
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                    color: '#fff',
                                    fontSize: 20,
                                    cursor: 'pointer',
                                    boxShadow: '0 12px 30px rgba(22,163,74,0.45)',
                                }}
                            >
                                ✓
                            </button>
                        </>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => {
                            userMinimizedRef.current = false;
                            setCallModalVisible(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 20px',
                            borderRadius: 999,
                            border: `2px solid ${
                                callState === 'answered' || callState === 'ringing'
                                    ? 'rgba(34,197,94,0.5)'
                                    : 'rgba(248,113,22,0.5)'
                            }`,
                            background:
                                'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
                            color: '#e5e7eb',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: `0 16px 40px ${
                                callState === 'answered' || callState === 'ringing'
                                    ? 'rgba(34,197,94,0.3)'
                                    : 'rgba(248,113,22,0.3)'
                            }`,
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor:
                                    callState === 'answered' || callState === 'ringing'
                                        ? '#22c55e'
                                        : '#f97316',
                                animation: callState === 'ringing' ? 'pulse 2s infinite' : 'none',
                            }}
                        />
                        <span style={{ whiteSpace: 'nowrap' }}>{callerName || 'Звонок'}</span>
                        {isCallActive ? (
                            <span
                                style={{
                                    fontFamily: 'SF Mono, ui-monospace, Menlo, Monaco, Consolas',
                                    fontSize: 13,
                                    color: '#fbbf24',
                                    fontWeight: 700,
                                }}
                            >
                                {formatCallTime(callSeconds)}
                            </span>
                        ) : null}
                        <span style={{ fontSize: 18 }}>📞</span>
                    </button>
                </div>
            ) : null}
        </>
    );
}
