'use client';

import { useEffect, useRef, useState } from 'react';
import { getHomeBanners, getHomeHero, saveHomeBanner, saveHomeHero, type HomeBanner, type HomeHero } from '@/lib/home-banners-api';
import { inputStyle, sectionBox, sectionDesc, sectionTitle } from './styles';

interface SlotState {
    url: string;
    file: File | null;
    preview: string;
    saving: boolean;
}

function HeroBlock({ hero, onSaved }: { hero?: HomeHero; onSaved: (hero: HomeHero) => void }) {
    const [title, setTitle] = useState(hero?.title || 'Путешествия начинаются здесь');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(hero?.image || '');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTitle(hero?.title || 'Путешествия начинаются здесь');
        if (!file) setPreview(hero?.image || '');
    }, [hero?.title, hero?.image, file]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const saved = await saveHomeHero({ title, image: file });
            onSaved(saved);
            setFile(null);
            setPreview(saved.image || preview);
            if (fileRef.current) fileRef.current.value = '';
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Не удалось сохранить hero-блок');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px', color: '#e5e7eb', fontSize: 15 }}>Hero-блок</h4>
            <div style={{ width: '100%', height: 180, borderRadius: 14, border: '1px dashed rgba(148,163,184,0.4)', background: preview ? `center/cover url(${preview})` : 'rgba(15,23,42,0.6)', marginBottom: 12 }} />
            <label style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(55,65,81,0.8)', color: '#e5e7eb', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                Выбрать фото
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const next = e.target.files?.[0] || null;
                    if (!next) return;
                    setFile(next);
                    setPreview(URL.createObjectURL(next));
                }} />
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок hero" style={{ ...inputStyle, marginBottom: 12 }} />
            <button onClick={handleSave} disabled={saving || !title.trim()} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Сохранение...' : 'Сохранить hero'}
            </button>
        </div>
    );
}

function BannerSlot({ position, banner, onSaved }: { position: number; banner?: HomeBanner; onSaved: (b: HomeBanner) => void }) {
    const [state, setState] = useState<SlotState>({ url: banner?.url || '', file: null, preview: banner?.image || '', saving: false });
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setState((prev) => ({ ...prev, url: banner?.url || '', preview: prev.file ? prev.preview : banner?.image || '' }));
    }, [banner?.url, banner?.image]);

    const handleSave = async () => {
        try {
            setState((prev) => ({ ...prev, saving: true }));
            const saved = await saveHomeBanner(position, { url: state.url, image: state.file });
            onSaved(saved);
            setState((prev) => ({ ...prev, file: null, saving: false, preview: saved.image || prev.preview }));
            if (fileRef.current) fileRef.current.value = '';
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Не удалось сохранить баннер');
            setState((prev) => ({ ...prev, saving: false }));
        }
    };

    return (
        <div style={{ flex: '1 1 300px', minWidth: 260, padding: 16, borderRadius: 14, border: '1px solid rgba(55,65,81,0.5)', background: 'rgba(15,23,42,0.4)' }}>
            <h4 style={{ margin: '0 0 12px', color: '#e5e7eb' }}>Баннер {position}</h4>
            <div style={{ width: '100%', height: 140, borderRadius: 12, border: '1px dashed rgba(148,163,184,0.4)', background: state.preview ? `center/cover url(${state.preview})` : 'rgba(15,23,42,0.6)', marginBottom: 12 }} />
            <label style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(55,65,81,0.8)', color: '#e5e7eb', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                Выбрать фото
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    setState((prev) => ({ ...prev, file, preview: URL.createObjectURL(file) }));
                }} />
            </label>
            <input value={state.url} onChange={(e) => setState((prev) => ({ ...prev, url: e.target.value }))} placeholder="Ссылка" style={{ ...inputStyle, marginBottom: 12 }} />
            <button onClick={handleSave} disabled={state.saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {state.saving ? 'Сохранение...' : 'Сохранить'}
            </button>
        </div>
    );
}

export default function HeroBannersSection() {
    const [banners, setBanners] = useState<HomeBanner[]>([]);
    const [hero, setHero] = useState<HomeHero | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getHomeBanners(), getHomeHero()])
            .then(([bannerData, heroData]) => {
                setBanners(bannerData);
                setHero(heroData);
            })
            .catch(() => alert('Не удалось загрузить баннеры'))
            .finally(() => setLoading(false));
    }, []);

    const handleSaved = (saved: HomeBanner) => {
        setBanners((prev) => {
            const exists = prev.some((b) => b.position === saved.position);
            if (exists) return prev.map((b) => (b.position === saved.position ? saved : b));
            return [...prev, saved].sort((a, b) => a.position - b.position);
        });
    };

    return (
        <section id="hero-banners" style={sectionBox}>
            <h3 style={sectionTitle}>Hero и баннеры</h3>
            <p style={sectionDesc}>Верхний блок и два баннера под поиском на главной.</p>
            {loading ? <p style={{ color: '#9ca3af' }}>Загрузка...</p> : (
                <>
                    <HeroBlock hero={hero || undefined} onSaved={setHero} />
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <BannerSlot position={1} banner={banners.find((b) => b.position === 1)} onSaved={handleSaved} />
                        <BannerSlot position={2} banner={banners.find((b) => b.position === 2)} onSaved={handleSaved} />
                    </div>
                </>
            )}
        </section>
    );
}
