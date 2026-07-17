'use client';

import { useEffect, useRef, useState } from 'react';
import { createHomePartner, deleteHomePartner, getHomePartners, updateHomePartner, type HomePartner } from '@/lib/home-partners-api';
import { inputStyle, sectionBox, sectionDesc, sectionTitle } from './styles';

function PartnerForm({ initial, onSave, onCancel, saving }: { initial?: HomePartner | null; onSave: (values: { name: string; url: string; sort_order: number; image?: File | null }) => Promise<void>; onCancel?: () => void; saving: boolean }) {
    const [name, setName] = useState(initial?.name || '');
    const [url, setUrl] = useState(initial?.url || '');
    const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(initial?.image || '');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setName(initial?.name || '');
        setUrl(initial?.url || '');
        setSortOrder(String(initial?.sort_order ?? 0));
        if (!file) setPreview(initial?.image || '');
    }, [initial?.id, initial?.name, initial?.url, initial?.sort_order, initial?.image, file]);

    return (
        <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ height: 90, borderRadius: 12, background: preview ? `center/contain no-repeat url(${preview}) rgba(15,23,42,0.6)` : 'rgba(15,23,42,0.6)' }} />
            <label style={{ color: '#e5e7eb', cursor: 'pointer', width: 'fit-content' }}>
                {initial ? 'Заменить логотип' : 'Выбрать логотип'}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const next = e.target.files?.[0] || null; if (!next) return; setFile(next); setPreview(URL.createObjectURL(next)); }} />
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" style={inputStyle} />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ссылка" style={inputStyle} />
            <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" placeholder="Порядок" style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { if (!initial && !file) { alert('Загрузите логотип'); return; } await onSave({ name, url, sort_order: Number(sortOrder) || 0, image: file }); setFile(null); if (fileRef.current) fileRef.current.value = ''; }} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff' }}>{saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить'}</button>
                {onCancel && <button onClick={onCancel} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #555', background: 'transparent', color: '#fff' }}>Отмена</button>}
            </div>
        </div>
    );
}

export default function PartnersSection() {
    const [partners, setPartners] = useState<HomePartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        getHomePartners().then(setPartners).catch(() => alert('Не удалось загрузить партнёров')).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <section id="partners" style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                    <h3 style={sectionTitle}>Партнёры</h3>
                    <p style={{ ...sectionDesc, marginBottom: 0 }}>Логотипы партнёров на главной. Всего: {partners.length}</p>
                </div>
                <button onClick={() => { setShowCreate((v) => !v); setEditingId(null); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', cursor: 'pointer' }}>
                    {showCreate ? 'Скрыть' : 'Добавить'}
                </button>
            </div>
            {showCreate && (
                <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)' }}>
                    <PartnerForm saving={saving} onCancel={() => setShowCreate(false)} onSave={async (values) => {
                        if (!values.image) return;
                        setSaving(true);
                        try {
                            const created = await createHomePartner({ name: values.name, url: values.url, sort_order: values.sort_order, image: values.image });
                            setPartners((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
                            setShowCreate(false);
                        } catch (error) {
                            alert(error instanceof Error ? error.message : 'Ошибка');
                        } finally { setSaving(false); }
                    }} />
                </div>
            )}
            {loading ? <p style={{ color: '#9ca3af' }}>Загрузка...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {partners.map((item) => (
                        <div key={item.id} style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)' }}>
                            {editingId === item.id ? (
                                <PartnerForm initial={item} saving={saving} onCancel={() => setEditingId(null)} onSave={async (values) => {
                                    setSaving(true);
                                    try {
                                        const updated = await updateHomePartner(item.id, values);
                                        setPartners((prev) => prev.map((p) => (p.id === item.id ? updated : p)).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
                                        setEditingId(null);
                                    } catch (error) {
                                        alert(error instanceof Error ? error.message : 'Ошибка');
                                    } finally { setSaving(false); }
                                }} />
                            ) : (
                                <>
                                    <div style={{ height: 70, marginBottom: 10, background: `center/contain no-repeat url(${item.image})` }} />
                                    <p style={{ margin: '0 0 10px', color: '#f9fafb', fontWeight: 600 }}>{item.name || `Партнёр #${item.id}`}</p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => { setEditingId(item.id); setShowCreate(false); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#fff' }}>Изменить</button>
                                        <button onClick={async () => { if (!confirm('Удалить?')) return; await deleteHomePartner(item.id); setPartners((prev) => prev.filter((p) => p.id !== item.id)); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Удалить</button>
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
