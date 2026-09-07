'use client';

import { useEffect, useState } from 'react';
import {
    initWebRTCWithLoyaltyId,
    startOutgoingVoiceCallByLoyaltyId,
    getActiveCallInfo,
    getCallState,
    setCallStateChangeCallback,
    setCallActiveChangeCallback,
    checkAllServersStatus,
    type ServerStatus,
} from '@/lib/webrtc-service';
import { getAllUsers, getUserDisplayName, updateUserAccess, type User } from '@/lib/users-api';
import { getStoredUser } from '@/lib/auth-api';
import { useRouter } from 'next/navigation';
import CallModal from '@/components/CallModal';
import Icon from '@/components/Icon';
import AppHeader from '@/components/AppHeader';
import { t, radius, text, layout, cardStyle, button, badge } from '@/lib/theme';

export default function Home() {
    const router = useRouter();
    const [currentLoyaltyId, setCurrentLoyaltyId] = useState<string>('');
    const [loggedInUser, setLoggedInUser] = useState<any>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [callSeconds, setCallSeconds] = useState(0);
    const [isCallActive, setIsCallActive] = useState(false);
    const [callModalVisible, setCallModalVisible] = useState(false);
    const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'answered' | 'ended' | 'rejected'>('idle');
    const [callerName, setCallerName] = useState<string | null>(null);
    const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([]);
    const [checkingServers, setCheckingServers] = useState(false);
    const [showServerStatus, setShowServerStatus] = useState(false);

    // Load users from database
    const loadUsers = async () => {
        try {
            setLoading(true);
            const allUsers = await getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Failed to load users:', error);
            alert('Не удалось загрузить список пользователей');
        } finally {
            setLoading(false);
        }
    };

    // Initialize with logged-in user's loyalty_id
    useEffect(() => {
        const user = getStoredUser();
        if (user) {
            setLoggedInUser(user);
            // Support both camelCase and snake_case for loyaltyId
            const loyaltyId = user.loyaltyId || (user as any).loyalty_id;
            if (loyaltyId) {
                console.log('Initializing WebRTC with loyaltyId:', loyaltyId);
                setCurrentLoyaltyId(loyaltyId);
                try {
                    initWebRTCWithLoyaltyId(loyaltyId);
                    console.log('WebRTC initialized successfully');
                } catch (e) {
                    console.error('Failed to initialize WebRTC:', e);
                    alert('Ошибка инициализации WebRTC: ' + (e instanceof Error ? e.message : String(e)));
                }
            } else {
                console.error('User object does not have loyaltyId:', user);
                alert('Ошибка: у пользователя нет loyaltyId. Пожалуйста, войдите снова.');
            }
        } else {
            // Not logged in, redirect to login
            router.push('/login');
        }

        // Set up call state callbacks
        setCallStateChangeCallback((state, name) => {
            console.log('Call state changed:', state, 'caller:', name);
            setCallState(state);
            setCallerName(name);
            // Show modal for any non-idle state (calling, ringing, answered, etc.)
            const shouldShow = state !== 'idle';
            setCallModalVisible(shouldShow);
            console.log('Modal visibility set to:', shouldShow, 'for state:', state);
        });

        setCallActiveChangeCallback((isActive, startedAt) => {
            setIsCallActive(isActive);
        });

        // Звонок мог быть начат на другой странице (чат поддержки → «Позвонить»):
        // подхватываем текущее состояние, чтобы сразу показать карточку звонка.
        const current = getCallState();
        if (current.state !== 'idle') {
            setCallState(current.state);
            setCallerName(current.callerName);
            setCallModalVisible(true);
        }

        // Load users on mount
        loadUsers();

        // Refresh users every 10 seconds
        const interval = setInterval(loadUsers, 10000);
        return () => clearInterval(interval);
    }, []);

    // Save loyalty_id when changed
    useEffect(() => {
        if (currentLoyaltyId) {
            localStorage.setItem('webLoyaltyId', currentLoyaltyId);
        }
    }, [currentLoyaltyId]);

    // Timer for active calls
    useEffect(() => {
        const interval = setInterval(() => {
            const info = getActiveCallInfo();
            if (info.isActive && info.startedAt) {
                setIsCallActive(true);
                const diffSec = Math.floor((Date.now() - info.startedAt) / 1000);
                setCallSeconds(diffSec);
            } else {
                setIsCallActive(false);
                setCallSeconds(0);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-close modal after call ends
    useEffect(() => {
        if (callState === 'ended' || callState === 'rejected') {
            const timer = setTimeout(() => {
                setCallModalVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [callState]);

    const formatCallTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const checkServers = async () => {
        setCheckingServers(true);
        try {
            const statuses = await checkAllServersStatus();
            setServerStatuses(statuses);
            setShowServerStatus(true);
        } catch (error) {
            console.error('Failed to check servers:', error);
        } finally {
            setCheckingServers(false);
        }
    };

    // access 1 = Заблок. (blocked), access 0 = Доступ (has access)
    const hasAccess = (u: User) => u.access === 0 || u.access === false;
    const handleToggleAccess = async (user: User) => {
        const newAccess = hasAccess(user) ? 1 : 0;
        try {
            await updateUserAccess(user.id, newAccess === 1);
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, access: newAccess } : u))
            );
        } catch (error) {
            console.error('Failed to update access:', error);
            alert('Не удалось обновить доступ');
        }
    };

    const handleCallUser = async (user: User) => {
        // Check if WebRTC is initialized
        const storedUser = getStoredUser();
        if (!storedUser) {
            alert('Ошибка: пользователь не авторизован');
            router.push('/login');
            return;
        }

        // Get loyaltyId from stored user (support both camelCase and snake_case)
        const myLoyaltyId = storedUser.loyaltyId || (storedUser as any).loyalty_id;
        if (!myLoyaltyId) {
            alert('Ошибка: loyalty_id не установлен. Пожалуйста, войдите снова.');
            return;
        }

        // Ensure WebRTC is initialized
        if (!currentLoyaltyId) {
            console.log('WebRTC not initialized, initializing now with loyaltyId:', myLoyaltyId);
            try {
                initWebRTCWithLoyaltyId(myLoyaltyId);
                setCurrentLoyaltyId(myLoyaltyId);
                // Wait a bit for initialization to complete
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.error('Failed to initialize WebRTC:', e);
                alert('Ошибка инициализации WebRTC: ' + (e instanceof Error ? e.message : String(e)));
                return;
            }
        }

        if (user.loyaltyId === myLoyaltyId) {
            alert('Вы не можете позвонить себе');
            return;
        }

        // Allow calling offline users if they have voipToken (can receive VoIP push)
        // If user is offline and has no voipToken, show error
        if (!user.online && !user.hasVoipToken) {
            alert('Пользователь не в сети и не может принимать звонки');
            return;
        }

        try {
            const displayName = getUserDisplayName(user);
            console.log('Calling user:', user.loyaltyId, 'online:', user.online, 'hasVoipToken:', user.hasVoipToken);
            await startOutgoingVoiceCallByLoyaltyId(user.loyaltyId, displayName);
        } catch (e: any) {
            console.error('Failed to start call', e);
            const errorMsg = e?.message || 'Unknown error';
            alert('Не удалось начать звонок: ' + errorMsg);

            // If error is about initialization, try to re-initialize
            if (errorMsg.includes('not initialized')) {
                console.log('Attempting to re-initialize WebRTC...');
                try {
                    initWebRTCWithLoyaltyId(myLoyaltyId);
                    setCurrentLoyaltyId(myLoyaltyId);
                } catch (initError) {
                    console.error('Re-initialization failed:', initError);
                }
            }
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: t.bg,
                padding: '32px 32px 64px',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: layout.contentMax,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 24,
                }}
            >
                {/* Шапка: логотип, вкладки «Звонки / Чат поддержки», тема, выход */}
                <AppHeader />

                {/* Карточка агента + статус звонка */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 2.1fr) minmax(0, 1.2fr)',
                        gap: 24,
                    }}
                >
                    {loggedInUser && (
                        <div
                            style={{
                                ...cardStyle,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        flexShrink: 0,
                                        borderRadius: radius.pill,
                                        background: t.accentSoft,
                                        color: t.accent,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 24,
                                        fontWeight: 600,
                                    }}
                                >
                                    {(loggedInUser.name ||
                                        loggedInUser.fName ||
                                        loggedInUser.email ||
                                        'U')
                                        .toString()
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            ...text.cardTitle,
                                            fontSize: 18,
                                            lineHeight: '26px',
                                            marginBottom: 4,
                                        }}
                                    >
                                        {loggedInUser.name ||
                                            loggedInUser.fName ||
                                            loggedInUser.email ||
                                            'Пользователь'}
                                    </div>
                                    <div
                                        style={{
                                            ...text.caption,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span>{loggedInUser.email}</span>
                                        <span>•</span>
                                        <span>
                                            ID:{' '}
                                            <strong style={{ color: t.accent, fontWeight: 600 }}>
                                                {loggedInUser.loyaltyId}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span style={badge('success')}>Агент онлайн</span>
                        </div>
                    )}

                    {/* Статус звонка */}
                    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div
                            style={{
                                ...text.caption,
                                textTransform: 'uppercase',
                                letterSpacing: 1.2,
                                fontWeight: 600,
                            }}
                        >
                            Статус звонка
                        </div>
                        <div
                            style={{
                                ...text.body,
                                fontSize: 15,
                                lineHeight: '22px',
                                fontWeight: 600,
                            }}
                        >
                            {isCallActive
                                ? 'Идет разговор'
                                : callState === 'calling'
                                    ? 'Исходящий вызов...'
                                    : callState === 'ringing'
                                        ? 'Входящий звонок...'
                                        : 'Нет активных звонков'}
                        </div>
                        <div
                            style={{
                                fontFamily: text.mono.fontFamily,
                                fontSize: 32,
                                lineHeight: '40px',
                                fontWeight: 600,
                                letterSpacing: 2,
                                color: isCallActive ? t.accent : t.textTertiary,
                            }}
                        >
                            {isCallActive ? formatCallTime(callSeconds) : '00:00'}
                        </div>
                    </div>
                </div>

                {/* Пользователи */}
                <div style={cardStyle}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20,
                            gap: 12,
                        }}
                    >
                        <div>
                            <h2 style={{ ...text.sectionTitle, margin: '0 0 4px' }}>
                                Пользователи
                            </h2>
                            <div style={text.caption}>
                                Онлайн и офлайн пользователи с поддержкой VoIP
                            </div>
                        </div>
                        <button
                            onClick={loadUsers}
                            disabled={loading}
                            style={{
                                ...button('secondary'),
                                cursor: loading ? 'not-allowed' : 'pointer',
                                color: loading ? t.textTertiary : t.textPrimary,
                            }}
                        >
                            <Icon name="refresh" size={18} />
                            {loading ? 'Обновление...' : 'Обновить список'}
                        </button>
                    </div>

                    {users.length === 0 ? (
                        <div
                            style={{
                                ...text.body,
                                padding: 24,
                                textAlign: 'center',
                                color: t.textTertiary,
                            }}
                        >
                            {loading
                                ? 'Загрузка пользователей...'
                                : 'Пользователи не найдены'}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {users.map((user) => {
                                const isMe = user.loyaltyId === currentLoyaltyId;
                                const isDisabled =
                                    !currentLoyaltyId ||
                                    isMe ||
                                    !hasAccess(user) ||
                                    (!user.online && !user.hasVoipToken);

                                return (
                                    <div
                                        key={user.id}
                                        style={{
                                            padding: '16px 20px',
                                            borderRadius: radius.md,
                                            border: `1px solid ${isMe ? t.accent : t.border}`,
                                            background: isMe ? t.accentSoft : t.surface,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 16,
                                            transition: 'background 0.15s, border-color 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isMe) {
                                                e.currentTarget.style.background = t.surfaceHover;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isMe) {
                                                e.currentTarget.style.background = t.surface;
                                            }
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        flexShrink: 0,
                                                        borderRadius: radius.pill,
                                                        background: t.accentSoft,
                                                        color: t.accent,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 18,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {getUserDisplayName(user)
                                                        .toString()
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 10,
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        <strong
                                                            style={{
                                                                ...text.cardTitle,
                                                                whiteSpace: 'nowrap',
                                                                textOverflow: 'ellipsis',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            {getUserDisplayName(user)}
                                                        </strong>
                                                        {user.online ? (
                                                            <span style={badge('success')}>Онлайн</span>
                                                        ) : (
                                                            <span style={badge('neutral')}>
                                                                Офлайн
                                                                {user.hasVoipToken && (
                                                                    <span style={{ marginLeft: 4 }}>• VoIP</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div
                                                        style={{
                                                            ...text.caption,
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 8,
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <span>
                                                            ID:{' '}
                                                            <strong style={{ color: t.accent, fontWeight: 600 }}>
                                                                {user.loyaltyId}
                                                            </strong>
                                                        </span>
                                                        {user.phone && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{user.phone}</span>
                                                            </>
                                                        )}
                                                        {user.email && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{user.email}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                cursor: 'pointer',
                                                marginRight: 12,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={hasAccess(user)}
                                                onChange={() => handleToggleAccess(user)}
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    accentColor: t.accent,
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    lineHeight: '16px',
                                                    fontWeight: 600,
                                                    color: hasAccess(user) ? t.success : t.error,
                                                }}
                                            >
                                                {hasAccess(user) ? 'Доступ' : 'Заблок.'}
                                            </span>
                                        </label>
                                        <button
                                            onClick={() => handleCallUser(user)}
                                            disabled={isDisabled}
                                            style={{
                                                ...button('primary', 'sm'),
                                                padding: '8px 14px',
                                                ...(isDisabled
                                                    ? {
                                                        background: t.surfaceInset,
                                                        color: t.textDisabled,
                                                        cursor: 'not-allowed',
                                                    }
                                                    : null),
                                            }}
                                        >
                                            <Icon name="phone" size={16} />
                                            Позвонить
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Статус серверов */}
                <div style={cardStyle}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <div>
                            <h3 style={{ ...text.sectionTitle, margin: '0 0 4px' }}>
                                Статус STUN/TURN серверов
                            </h3>
                            <div style={text.caption}>
                                Проверка доступности серверов для WebRTC
                            </div>
                        </div>
                        <button
                            onClick={checkServers}
                            disabled={checkingServers}
                            style={{
                                ...button('secondary'),
                                cursor: checkingServers ? 'not-allowed' : 'pointer',
                                color: checkingServers ? t.textTertiary : t.textPrimary,
                            }}
                        >
                            {checkingServers ? 'Проверка...' : 'Проверить серверы'}
                        </button>
                    </div>

                    {showServerStatus && serverStatuses.length > 0 && (
                        <div
                            style={{
                                marginTop: 16,
                                maxHeight: 400,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                            }}
                        >
                            {serverStatuses.map((server, index) => {
                                const statusTone =
                                    server.status === 'available'
                                        ? 'success'
                                        : server.status === 'unavailable' || server.status === 'error'
                                            ? 'error'
                                            : 'warning';
                                const statusText =
                                    server.status === 'available'
                                        ? 'Доступен'
                                        : server.status === 'unavailable'
                                            ? 'Недоступен'
                                            : server.status === 'error'
                                                ? 'Ошибка'
                                                : 'Проверка...';

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: radius.md,
                                            background: t.surfaceInset,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontFamily: text.mono.fontFamily,
                                                    fontSize: 13,
                                                    lineHeight: '18px',
                                                    color: t.textPrimary,
                                                    marginBottom: 6,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {server.url}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        ...badge('neutral'),
                                                        padding: '2px 8px',
                                                        fontSize: 10,
                                                        lineHeight: '14px',
                                                    }}
                                                >
                                                    {server.type === 'stun' ? 'STUN' : 'TURN'}
                                                </span>
                                                {server.latency && (
                                                    <span style={text.caption}>{server.latency}ms</span>
                                                )}
                                            </div>
                                        </div>
                                        <span style={{ ...badge(statusTone), whiteSpace: 'nowrap' }}>
                                            {statusText}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {showServerStatus && serverStatuses.length === 0 && !checkingServers && (
                        <div
                            style={{
                                ...text.caption,
                                marginTop: 16,
                                padding: 12,
                                textAlign: 'center',
                            }}
                        >
                            Нажмите «Проверить серверы» для проверки статуса
                        </div>
                    )}
                </div>

                {/* Модалка звонка */}
                {callModalVisible && (
                    <CallModal
                        visible={callModalVisible}
                        onClose={() => {
                            // Минимизировать модалку, не прерывая звонок
                            setCallModalVisible(false);
                        }}
                    />
                )}
            </div>

            {/* Свёрнутый звонок */}
            {callState !== 'idle' && !callModalVisible && (
                <div
                    style={{
                        position: 'fixed',
                        right: 20,
                        bottom: 20,
                        zIndex: 9998,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setCallModalVisible(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 20px',
                            borderRadius: radius.pill,
                            border: `1px solid ${t.border}`,
                            background: t.surface,
                            boxShadow: t.shadowRaised,
                            color: t.textPrimary,
                            fontSize: 14,
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: radius.pill,
                                background:
                                    callState === 'answered' || callState === 'ringing'
                                        ? t.success
                                        : t.accent,
                            }}
                        />
                        <span style={{ whiteSpace: 'nowrap' }}>{callerName || 'Звонок'}</span>
                        {isCallActive && (
                            <span
                                style={{
                                    fontFamily: text.mono.fontFamily,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: t.accent,
                                }}
                            >
                                {formatCallTime(callSeconds)}
                            </span>
                        )}
                        <Icon name="phone" size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
