'use client';

import { useEffect, useMemo, useState } from 'react';
import { createFaqItem, deleteFaqItem, getFaqItems, updateFaqItem, type FaqItem } from '@/lib/faq-api';
import { inputStyle, sectionBox, sectionDesc, sectionTitle, textareaStyle } from './styles';

function FaqForm({ initial, onSave, onCancel, saving }: { initial?: FaqItem | null; onSave: (values: { question: string; answer: string }) => Promise<void>; onCancel?: () => void; saving: boolean }) {
    const [question, setQuestion] = useState(initial?.question || '');
    const [answer, setAnswer] = useState(initial?.answer || '');

    useEffect(() => {
        setQuestion(initial?.question || '');
        setAnswer(initial?.answer || '');
    }, [initial?.id, initial?.question, initial?.answer]);

    return (
        <div style={{ display: 'grid', gap: 10 }}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Вопрос" style={inputStyle} />
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ответ" style={textareaStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onSave({ question, answer })} disabled={saving || !question.trim() || !answer.trim()} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff' }}>{saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить'}</button>
                {onCancel && <button onClick={onCancel} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #555', background: 'transparent', color: '#fff' }}>Отмена</button>}
            </div>
        </div>
    );
}

export default function FaqSection() {
    const [items, setItems] = useState<FaqItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getFaqItems().then(setItems).catch(() => alert('Не удалось загрузить FAQ')).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q));
    }, [items, search]);

    return (
        <section id="faq" style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                    <h3 style={sectionTitle}>FAQ</h3>
                    <p style={{ ...sectionDesc, marginBottom: 0 }}>Вопросы и ответы на главной. Всего: {items.length}</p>
                </div>
                <button onClick={() => { setShowCreate((v) => !v); setEditingId(null); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', cursor: 'pointer' }}>
                    {showCreate ? 'Скрыть' : 'Добавить вопрос'}
                </button>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" style={{ ...inputStyle, marginBottom: 14 }} />
            {showCreate && (
                <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)' }}>
                    <FaqForm saving={saving} onCancel={() => setShowCreate(false)} onSave={async (values) => {
                        setSaving(true);
                        try {
                            const created = await createFaqItem(values);
                            setItems((prev) => [...prev, created].sort((a, b) => a.id - b.id));
                            setShowCreate(false);
                        } catch (error) {
                            alert(error instanceof Error ? error.message : 'Ошибка');
                        } finally { setSaving(false); }
                    }} />
                </div>
            )}
            {loading ? <p style={{ color: '#9ca3af' }}>Загрузка...</p> : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {filtered.map((item) => (
                        <div key={item.id} style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)' }}>
                            {editingId === item.id ? (
                                <FaqForm initial={item} saving={saving} onCancel={() => setEditingId(null)} onSave={async (values) => {
                                    setSaving(true);
                                    try {
                                        const updated = await updateFaqItem({ id: item.id, ...values });
                                        setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
                                        setEditingId(null);
                                    } catch (error) {
                                        alert(error instanceof Error ? error.message : 'Ошибка');
                                    } finally { setSaving(false); }
                                }} />
                            ) : (
                                <>
                                    <p style={{ margin: '0 0 8px', color: '#f9fafb', fontWeight: 600 }}>{item.question}</p>
                                    <p style={{ margin: '0 0 12px', color: '#9ca3af', fontSize: 14, whiteSpace: 'pre-wrap' }}>{item.answer}</p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => { setEditingId(item.id); setShowCreate(false); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#fff' }}>Изменить</button>
                                        <button onClick={async () => { if (!confirm('Удалить?')) return; await deleteFaqItem(item.id); setItems((prev) => prev.filter((row) => row.id !== item.id)); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Удалить</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
