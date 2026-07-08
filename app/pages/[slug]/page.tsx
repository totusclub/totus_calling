'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import AdminNav from '@/components/AdminNav';
import RichTextEditor from '@/components/RichTextEditor';
import {
    FOOTER_PAGE_BY_SLUG,
    PUBLIC_SITE_URL,
    SECTION_LABELS,
    type FooterSection,
} from '@/lib/footer-pages-catalog';
import {
    getCmsPageBySlug,
    saveCmsPage,
    type SaveCmsPageInput,
} from '@/lib/pages-api';

const cardStyle: React.CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
    border: '1px solid rgba(55,65,81,0.6)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
};

const fieldLabel: React.CSSProperties = {
    display: 'block',
    marginBottom: 8,
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: 600,
};

const fieldInput: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(75,85,99,0.55)',
    background: '#020617',
    backgroundColor: '#020617',
    color: '#f9fafb',
    fontSize: 14,
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
};

const SECTION_OPTIONS: FooterSection[] = ['company', 'contact', 'more', 'legal'];

export default function CmsPageEditorPage() {
    const params = useParams();
    const router = useRouter();
    const slug = String(params?.slug || '');

    const catalog = FOOTER_PAGE_BY_SLUG[slug];

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    const [form, setForm] = useState<SaveCmsPageInput>({
        name: '',
        slug,
        seo_title: '',
        seo_desc: '',
        seo_keywords: '',
        section: 'company',
        breadcrumb_label: '',
        mobile_header_title: '',
        content: '',
    });

    useEffect(() => {
        if (!catalog) {
            setLoading(false);
            return;
        }

        const emptyForm: SaveCmsPageInput = {
            name: '',
            slug: catalog.slug,
            seo_title: '',
            seo_desc: '',
            seo_keywords: '',
            section: catalog.section,
            breadcrumb_label: '',
            mobile_header_title: '',
            content: '',
        };

        getCmsPageBySlug(slug)
            .then((page) => {
                if (!page) {
                    setForm(emptyForm);
                    return;
                }
                setForm({
                    id: page.id,
                    name: page.name || '',
                    slug: page.slug || catalog.slug,
                    seo_title: page.seo_title || '',
                    seo_desc: page.seo_desc || '',
                    seo_keywords: page.seo_keywords || '',
                    section: (page.section as FooterSection) || catalog.section,
                    breadcrumb_label: page.breadcrumb_label || '',
                    mobile_header_title: page.mobile_header_title || '',
                    content: page.content || '',
                });
            })
            .catch((error) => {
                console.error(error);
                setForm(emptyForm);
            })
            .finally(() => setLoading(false));
    }, [catalog, slug]);

    const sectionLabel = useMemo(() => {
        const section = form.section as FooterSection;
        return SECTION_LABELS[section] || section;
    }, [form.section]);

    const updateField = <K extends keyof SaveCmsPageInput>(key: K, value: SaveCmsPageInput[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!catalog) return;
        try {
            setSaving(true);
            const saved = await saveCmsPage(form);
            setForm((prev) => ({ ...prev, id: saved.id }));
            setSavedAt(new Date().toLocaleTimeString('ru-RU'));
        } catch (error) {
            console.error(error);
            alert('Не удалось сохранить страницу');
        } finally {
            setSaving(false);
        }
    };

    if (!catalog) {
        return (
            <PageShell>
                <AdminNav />
                <div style={cardStyle}>
                    <h1 style={{ color: '#f9fafb' }}>Страница не найдена</h1>
                    <button
                        type="button"
                        onClick={() => router.push('/pages')}
                        style={{
                            marginTop: 12,
                            padding: '10px 14px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#FE732E',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        Назад к списку
                    </button>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <AdminNav />

            <div style={cardStyle}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16,
                        flexWrap: 'wrap',
                        marginBottom: 24,
                    }}
                >
                    <div>
                        <button
                            type="button"
                            onClick={() => router.push('/pages')}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: 0,
                                marginBottom: 8,
                            }}
                        >
                            ← Все страницы
                        </button>
                        <h1 style={{ margin: 0, color: '#f9fafb', fontSize: 28, fontWeight: 700 }}>
                            {catalog.title}
                        </h1>
                        <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: 14 }}>
                            /{slug} · {sectionLabel}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <a
                            href={`${PUBLIC_SITE_URL}${catalog.publicPath}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                padding: '10px 14px',
                                borderRadius: 12,
                                border: '1px solid rgba(75,85,99,0.55)',
                                color: '#e5e7eb',
                                textDecoration: 'none',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                            }}
                        >
                            Открыть на сайте
                        </a>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loading}
                            style={{
                                padding: '10px 18px',
                                borderRadius: 12,
                                border: 'none',
                                background: saving ? '#9a3412' : '#FE732E',
                                color: '#fff',
                                cursor: saving || loading ? 'wait' : 'pointer',
                                fontWeight: 700,
                            }}
                        >
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>

                {savedAt ? (
                    <div
                        style={{
                            marginBottom: 18,
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: 'rgba(34,197,94,0.12)',
                            border: '1px solid rgba(34,197,94,0.35)',
                            color: '#86efac',
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        Сохранено в {savedAt}
                    </div>
                ) : null}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 14,
                        }}
                    >
                        <div>
                            <label style={fieldLabel}>Заголовок страницы (H1)</label>
                            <input
                                style={fieldInput}
                                value={form.name}
                                onChange={(e) => updateField('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={fieldLabel}>Хлебные крошки</label>
                            <input
                                style={fieldInput}
                                value={form.breadcrumb_label}
                                onChange={(e) => updateField('breadcrumb_label', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={fieldLabel}>Мобильный заголовок</label>
                            <input
                                style={fieldInput}
                                value={form.mobile_header_title}
                                onChange={(e) => updateField('mobile_header_title', e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={fieldLabel}>Раздел</label>
                            <select
                                style={fieldInput}
                                value={form.section}
                                onChange={(e) =>
                                    updateField('section', e.target.value as FooterSection)
                                }
                            >
                                {SECTION_OPTIONS.map((section) => (
                                    <option key={section} value={section}>
                                        {SECTION_LABELS[section]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div
                        style={{
                            padding: 16,
                            borderRadius: 16,
                            border: '1px solid rgba(55,65,81,0.45)',
                            background: 'rgba(15,23,42,0.35)',
                        }}
                    >
                        <h3 style={{ margin: '0 0 12px', color: '#e5e7eb', fontSize: 15 }}>
                            SEO настройки
                        </h3>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <label style={fieldLabel}>SEO заголовок</label>
                                <input
                                    style={fieldInput}
                                    value={form.seo_title}
                                    onChange={(e) => updateField('seo_title', e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={fieldLabel}>SEO описание</label>
                                <textarea
                                    style={{ ...fieldInput, minHeight: 80, resize: 'vertical' }}
                                    value={form.seo_desc}
                                    onChange={(e) => updateField('seo_desc', e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={fieldLabel}>SEO ключевые слова</label>
                                <input
                                    style={fieldInput}
                                    value={form.seo_keywords}
                                    onChange={(e) => updateField('seo_keywords', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={fieldLabel}>Содержимое страницы</label>
                        <RichTextEditor
                            value={form.content}
                            onChange={(html) => updateField('content', html)}
                            placeholder="Напишите текст страницы. Можно использовать заголовки, списки, ссылки и изображения."
                        />
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
