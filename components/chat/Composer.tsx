'use client';

/**
 * Поле ввода ответа: авто-рост, Enter — отправить, Shift+Enter — перенос строки.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Icon from '@/components/Icon';
import { t, text, textareaStyle, button } from '@/lib/theme';

const MAX_LEN = 4000;
const TYPING_IDLE_MS = 2500;

interface ComposerProps {
    disabled?: boolean;
    sending: boolean;
    error: string | null;
    placeholder?: string;
    onSend: (body: string) => Promise<boolean>;
    onTyping?: (typing: boolean) => void;
}

export default function Composer({
    disabled = false,
    sending,
    error,
    placeholder = 'Напишите сообщение…',
    onSend,
    onTyping,
}: ComposerProps) {
    const [value, setValue] = useState('');
    const ref = useRef<HTMLTextAreaElement>(null);
    const typingRef = useRef(false);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setTyping = (on: boolean) => {
        if (typingRef.current === on) return;
        typingRef.current = on;
        onTyping?.(on);
    };

    // авто-рост
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [value]);

    // снять «печатает» при размонтировании
    useEffect(
        () => () => {
            if (typingTimer.current) clearTimeout(typingTimer.current);
            if (typingRef.current) onTyping?.(false);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const handleChange = (v: string) => {
        setValue(v);
        if (v.trim()) {
            setTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
        } else {
            setTyping(false);
        }
    };

    const submit = async () => {
        const body = value.trim();
        if (!body || sending || disabled) return;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        setTyping(false);
        const ok = await onSend(body);
        if (ok) {
            setValue('');
            ref.current?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
        }
    };

    const tooLong = value.length > MAX_LEN;
    const canSend = !!value.trim() && !sending && !disabled && !tooLong;

    return (
        <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${t.border}`, background: t.surface }}>
            {(error || tooLong) && (
                <div style={{ ...text.caption, color: t.error, marginBottom: 8 }}>
                    {tooLong ? 'Сообщение слишком длинное (до 4000 символов)' : error}
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <textarea
                    ref={ref}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={disabled ? 'Диалог недоступен' : placeholder}
                    rows={1}
                    aria-label="Текст сообщения"
                    style={{
                        ...textareaStyle,
                        minHeight: 44,
                        maxHeight: 200,
                        resize: 'none',
                        padding: '12px 14px',
                        lineHeight: '20px',
                        overflowY: 'auto',
                    }}
                />
                <button
                    type="button"
                    onClick={submit}
                    disabled={!canSend}
                    style={{
                        ...button('primary'),
                        height: 44,
                        ...(canSend
                            ? null
                            : { background: t.surfaceInset, color: t.textDisabled, cursor: 'not-allowed' }),
                    }}
                >
                    <Icon name="send" size={18} />
                    {sending ? 'Отправка…' : 'Отправить'}
                </button>
            </div>
            <div style={{ ...text.caption, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Enter — отправить, Shift+Enter — перенос строки</span>
                {value.length > MAX_LEN - 500 && (
                    <span style={{ color: tooLong ? t.error : t.textTertiary }}>
                        {value.length} / {MAX_LEN}
                    </span>
                )}
            </div>
        </div>
    );
}
