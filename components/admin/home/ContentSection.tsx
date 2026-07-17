'use client';

import { useEffect, useRef, useState } from 'react';
import {
    createHomeDestination,
    createHomeHotel,
    deleteHomeDestination,
    deleteHomeHotel,
    getHomeDestinations,
    getHomeHotels,
    getHomeSections,
    saveHomeSections,
    updateHomeDestination,
    updateHomeHotel,
    type HomePopularDestination,
    type HomeRecommendedHotel,
    type HomeSections,
} from '@/lib/home-content-api';
import { inputStyle, sectionBox, sectionDesc, sectionTitle } from './styles';

export default function ContentSection() {
    const [sections, setSections] = useState<HomeSections | null>(null);
    const [hotels, setHotels] = useState<HomeRecommendedHotel[]>([]);
    const [destinations, setDestinations] = useState<HomePopularDestination[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSections, setSavingSections] = useState(false);

    useEffect(() => {
        Promise.all([getHomeSections(), getHomeHotels(), getHomeDestinations()])
            .then(([sectionsData, hotelsData, destinationsData]) => {
                setSections(sectionsData);
                setHotels(hotelsData);
                setDestinations(destinationsData);
            })
            .catch(() => alert('Не удалось загрузить контент'))
            .finally(() => setLoading(false));
    }, []);

    const handleSaveSections = async () => {
        if (!sections) return;
        try {
            setSavingSections(true);
            const saved = await saveHomeSections({
                recommended_title: sections.recommended_title,
                destinations_title: sections.destinations_title,
            });
            setSections(saved);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Не удалось сохранить заголовки');
        } finally {
            setSavingSections(false);
        }
    };

    if (loading) {
        return <section style={sectionBox}><p style={{ color: '#9ca3af' }}>Загрузка контента...</p></section>;
    }

    return (
        <>
            <section id="titles" style={sectionBox}>
                <h3 style={sectionTitle}>Заголовки секций</h3>
                <p style={sectionDesc}>Тексты над блоками отелей и направлений.</p>
                <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
                    <input value={sections?.recommended_title || ''} onChange={(e) => setSections((prev) => prev ? { ...prev, recommended_title: e.target.value } : prev)} placeholder="Начните планирование путешествия здесь" style={inputStyle} />
                    <input value={sections?.destinations_title || ''} onChange={(e) => setSections((prev) => prev ? { ...prev, destinations_title: e.target.value } : prev)} placeholder="Популярные направления" style={inputStyle} />
                </div>
                <button onClick={handleSaveSections} disabled={savingSections} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    {savingSections ? 'Сохранение...' : 'Сохранить заголовки'}
                </button>
            </section>

            <HotelsSection hotels={hotels} onChange={setHotels} />
            <DestinationsSection destinations={destinations} onChange={setDestinations} />
        </>
    );
}

function HotelsSection({ hotels, onChange }: { hotels: HomeRecommendedHotel[]; onChange: (hotels: HomeRecommendedHotel[]) => void }) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [hotelId, setHotelId] = useState('0');
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [rate, setRate] = useState('5');
    const [sortOrder, setSortOrder] = useState('0');
    const [imageUrl, setImageUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setHotelId('0');
        setName('');
        setCity('');
        setRate('5');
        setSortOrder(String(hotels.length + 1));
        setImageUrl('');
        setFile(null);
        setPreview('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const startEdit = (hotel: HomeRecommendedHotel) => {
        setEditingId(hotel.id);
        setHotelId(String(hotel.hotel_id));
        setName(hotel.name);
        setCity(hotel.city);
        setRate(String(hotel.rate));
        setSortOrder(String(hotel.sort_order));
        setImageUrl(hotel.image);
        setPreview(hotel.image);
        setFile(null);
        setShowCreate(false);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                hotel_id: Number(hotelId) || 0,
                name,
                city,
                rate: Number(rate) || 5,
                price: 0,
                review: 0,
                sort_order: Number(sortOrder) || 0,
                image: file,
                imageUrl: file ? undefined : imageUrl,
            };
            if (editingId) {
                const saved = await updateHomeHotel(editingId, payload);
                onChange(hotels.map((h) => (h.id === editingId ? saved : h)));
                setEditingId(null);
            } else {
                const saved = await createHomeHotel(payload);
                onChange([...hotels, saved].sort((a, b) => a.sort_order - b.sort_order));
                setShowCreate(false);
            }
            resetForm();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Не удалось сохранить отель');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section id="hotels" style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                    <h3 style={sectionTitle}>Рекомендуемые отели</h3>
                    <p style={{ ...sectionDesc, marginBottom: 0 }}>Блок «Начните планирование путешествия здесь».</p>
                </div>
                <button onClick={() => { setShowCreate((v) => !v); setEditingId(null); resetForm(); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', cursor: 'pointer', height: 'fit-content' }}>
                    {showCreate ? 'Скрыть' : 'Добавить'}
                </button>
            </div>
            {(showCreate || editingId) && (
                <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                    <div style={{ height: 120, borderRadius: 12, background: preview ? `center/cover url(${preview})` : 'rgba(15,23,42,0.6)' }} />
                    <label style={{ color: '#e5e7eb', cursor: 'pointer', width: 'fit-content' }}>
                        Выбрать фото
                        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            const next = e.target.files?.[0] || null;
                            if (!next) return;
                            setFile(next);
                            setPreview(URL.createObjectURL(next));
                        }} />
                    </label>
                    <input value={hotelId} onChange={(e) => setHotelId(e.target.value)} placeholder="ID отеля (Level Travel)" style={inputStyle} />
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" style={inputStyle} />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" style={inputStyle} />
                    <input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setPreview(e.target.value); }} placeholder="URL изображения (если без загрузки)" style={inputStyle} />
                    <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Рейтинг" style={inputStyle} />
                    <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="Порядок" style={inputStyle} />
                    <button onClick={handleSave} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff' }}>{saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}</button>
                </div>
            )}
            <div style={{ display: 'grid', gap: 12 }}>
                {hotels.map((hotel) => (
                    <div key={hotel.id} style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ width: 80, height: 60, borderRadius: 8, background: `center/cover url(${hotel.image})` }} />
                        <div style={{ flex: 1, minWidth: 180 }}>
                            <p style={{ margin: 0, color: '#f9fafb', fontWeight: 600 }}>{hotel.name}</p>
                            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>{hotel.city} · ID {hotel.hotel_id}</p>
                        </div>
                        <button onClick={() => startEdit(hotel)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#fff' }}>Изменить</button>
                        <button onClick={async () => { if (!confirm(`Удалить «${hotel.name}»?`)) return; await deleteHomeHotel(hotel.id); onChange(hotels.filter((h) => h.id !== hotel.id)); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Удалить</button>
                    </div>
                ))}
            </div>
        </section>
    );
}

function DestinationsSection({ destinations, onChange }: { destinations: HomePopularDestination[]; onChange: (destinations: HomePopularDestination[]) => void }) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [toCountry, setToCountry] = useState('');
    const [sortOrder, setSortOrder] = useState('0');
    const [imageUrl, setImageUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setName(''); setToCountry(''); setSortOrder(String(destinations.length + 1)); setImageUrl(''); setFile(null); setPreview('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = { name, to_country: toCountry, sort_order: Number(sortOrder) || 0, image: file, imageUrl: file ? undefined : imageUrl };
            if (editingId) {
                const saved = await updateHomeDestination(editingId, payload);
                onChange(destinations.map((d) => (d.id === editingId ? saved : d)));
                setEditingId(null);
            } else {
                const saved = await createHomeDestination(payload);
                onChange([...destinations, saved].sort((a, b) => a.sort_order - b.sort_order));
                setShowCreate(false);
            }
            resetForm();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Не удалось сохранить направление');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section id="destinations" style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                    <h3 style={sectionTitle}>Популярные направления</h3>
                    <p style={{ ...sectionDesc, marginBottom: 0 }}>Карточки направлений на главной.</p>
                </div>
                <button onClick={() => { setShowCreate((v) => !v); setEditingId(null); resetForm(); }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff', cursor: 'pointer', height: 'fit-content' }}>
                    {showCreate ? 'Скрыть' : 'Добавить'}
                </button>
            </div>
            {(showCreate || editingId) && (
                <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                    <div style={{ height: 120, borderRadius: 12, background: preview ? `center/cover url(${preview})` : 'rgba(15,23,42,0.6)' }} />
                    <label style={{ color: '#e5e7eb', cursor: 'pointer' }}>Выбрать фото<input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const next = e.target.files?.[0] || null; if (!next) return; setFile(next); setPreview(URL.createObjectURL(next)); }} /></label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" style={inputStyle} />
                    <input value={toCountry} onChange={(e) => setToCountry(e.target.value)} placeholder="Код страны (EG, TR...)" style={inputStyle} />
                    <input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setPreview(e.target.value); }} placeholder="URL изображения" style={inputStyle} />
                    <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="Порядок" style={inputStyle} />
                    <button onClick={handleSave} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FE732E', color: '#fff' }}>{saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}</button>
                </div>
            )}
            <div style={{ display: 'grid', gap: 12 }}>
                {destinations.map((item) => (
                    <div key={item.id} style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(55,65,81,0.5)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ width: 80, height: 60, borderRadius: 8, background: `center/cover url(${item.image})` }} />
                        <div style={{ flex: 1, minWidth: 180 }}>
                            <p style={{ margin: 0, color: '#f9fafb', fontWeight: 600 }}>{item.name}</p>
                            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>{item.to_country}</p>
                        </div>
                        <button onClick={() => { setEditingId(item.id); setName(item.name); setToCountry(item.to_country); setSortOrder(String(item.sort_order)); setImageUrl(item.image); setPreview(item.image); setFile(null); setShowCreate(false); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#fff' }}>Изменить</button>
                        <button onClick={async () => { if (!confirm(`Удалить «${item.name}»?`)) return; await deleteHomeDestination(item.id); onChange(destinations.filter((d) => d.id !== item.id)); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Удалить</button>
                    </div>
                ))}
            </div>
        </section>
    );
}
