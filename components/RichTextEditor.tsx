'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadEditorImage } from '@/lib/pages-api';

type Props = {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
};

type ToolAction =
    | 'undo'
    | 'redo'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikeThrough'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'p'
    | 'ul'
    | 'ol'
    | 'indent'
    | 'outdent'
    | 'alignLeft'
    | 'alignCenter'
    | 'alignRight'
    | 'justifyFull'
    | 'link'
    | 'unlink'
    | 'image'
    | 'hr'
    | 'quote'
    | 'removeFormat'
    | 'clearAll';

type ToolItem = {
    action: ToolAction;
    label: string;
    title: string;
};

type ToolGroup = {
    title: string;
    items: ToolItem[];
};

const TOOL_GROUPS: ToolGroup[] = [
    {
        title: 'История',
        items: [
            { action: 'undo', label: '↶', title: 'Отменить' },
            { action: 'redo', label: '↷', title: 'Повторить' },
        ],
    },
    {
        title: 'Текст',
        items: [
            { action: 'bold', label: 'B', title: 'Жирный' },
            { action: 'italic', label: 'I', title: 'Курсив' },
            { action: 'underline', label: 'U', title: 'Подчёркнутый' },
            { action: 'strikeThrough', label: 'S', title: 'Зачёркнутый' },
            { action: 'removeFormat', label: 'Tx', title: 'Убрать форматирование' },
        ],
    },
    {
        title: 'Заголовки',
        items: [
            { action: 'h1', label: 'H1', title: 'Заголовок 1' },
            { action: 'h2', label: 'H2', title: 'Заголовок 2' },
            { action: 'h3', label: 'H3', title: 'Заголовок 3' },
            { action: 'h4', label: 'H4', title: 'Заголовок 4' },
            { action: 'p', label: 'P', title: 'Обычный текст' },
        ],
    },
    {
        title: 'Списки',
        items: [
            { action: 'ul', label: '•', title: 'Маркированный список' },
            { action: 'ol', label: '1.', title: 'Нумерованный список' },
            { action: 'indent', label: '→', title: 'Увеличить отступ' },
            { action: 'outdent', label: '←', title: 'Уменьшить отступ' },
        ],
    },
    {
        title: 'Выравнивание',
        items: [
            { action: 'alignLeft', label: '⫷', title: 'По левому краю' },
            { action: 'alignCenter', label: '≡', title: 'По центру' },
            { action: 'alignRight', label: '⫸', title: 'По правому краю' },
            { action: 'justifyFull', label: '☰', title: 'По ширине' },
        ],
    },
    {
        title: 'Вставка',
        items: [
            { action: 'link', label: '🔗', title: 'Добавить ссылку' },
            { action: 'unlink', label: '⛓', title: 'Удалить ссылку' },
            { action: 'image', label: '🖼', title: 'Изображение' },
            { action: 'hr', label: '—', title: 'Горизонтальная линия' },
            { action: 'quote', label: '❝', title: 'Цитата' },
        ],
    },
    {
        title: 'Очистка',
        items: [{ action: 'clearAll', label: '⌫', title: 'Очистить всё содержимое' }],
    },
];

const EDITOR_SURFACE_BG = '#ffffff';

const TEXT_COLORS = ['#111827', '#374151', '#fe732e', '#0284c7', '#16a34a', '#dc2626', '#7c3aed'];
const HIGHLIGHT_COLORS = ['transparent', '#fef08a', '#fdba74', '#86efac', '#93c5fd', '#fca5a5'];

type ImageAlign = 'left' | 'center' | 'right';
type ImageWidthPreset = 25 | 50 | 75 | 100;

const IMAGE_WIDTH_PRESETS: ImageWidthPreset[] = [25, 50, 75, 100];

function buildImageStyle(width: number, align: ImageAlign): string {
    const safeWidth = Math.min(100, Math.max(10, width));
    const base = `width:${safeWidth}%;max-width:100%;height:auto;border-radius:12px;`;

    if (align === 'left') {
        return `${base}display:block;float:left;margin:4px 16px 12px 0;`;
    }
    if (align === 'right') {
        return `${base}display:block;float:right;margin:4px 0 12px 16px;`;
    }
    return `${base}display:block;float:none;margin:12px auto;`;
}

function buildImageHtml(url: string, width: number, align: ImageAlign): string {
    const safeWidth = Math.min(100, Math.max(10, Math.round(width)));
    const style = buildImageStyle(safeWidth, align);
    return `<img src="${encodeURI(url)}" alt="" data-cms-width="${safeWidth}" data-cms-align="${align}" style="${style}" />`;
}

function readImageWidth(img: HTMLImageElement): number {
    const fromData = Number(img.getAttribute('data-cms-width'));
    if (fromData >= 10 && fromData <= 100) return fromData;

    const fromStyle = img.style.width;
    if (fromStyle.endsWith('%')) {
        const parsed = Number(fromStyle.replace('%', ''));
        if (parsed >= 10 && parsed <= 100) return parsed;
    }

    return 100;
}

function readImageAlign(img: HTMLImageElement): ImageAlign {
    const align = img.getAttribute('data-cms-align');
    if (align === 'left' || align === 'center' || align === 'right') return align;
    if (img.style.float === 'left') return 'left';
    if (img.style.float === 'right') return 'right';
    return 'center';
}

function applyImageSettings(img: HTMLImageElement, width: number, align: ImageAlign) {
    const safeWidth = Math.min(100, Math.max(10, Math.round(width)));
    img.setAttribute('data-cms-width', String(safeWidth));
    img.setAttribute('data-cms-align', align);
    img.setAttribute('alt', img.getAttribute('alt') || '');
    img.style.cssText = buildImageStyle(safeWidth, align);
}

function cleanStyleAttribute(style: string): string {
    return style
        .split(';')
        .map((part) => part.trim())
        .filter((part) => {
            if (!part) return false;
            const lower = part.toLowerCase();
            return !lower.startsWith('mso-');
        })
        .join('; ');
}

function sanitizeEditorHtml(html: string): string {
    if (!html) return '';

    const cleaned = html.replace(/mso-[^:;]+:[^;]+;?/gi, '');

    if (typeof document === 'undefined') return cleaned;

    const container = document.createElement('div');
    container.innerHTML = cleaned;

    container.querySelectorAll('*').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;

        node.removeAttribute('background');

        if (node.hasAttribute('style')) {
            const nextStyle = cleanStyleAttribute(node.getAttribute('style') || '');
            if (nextStyle) node.setAttribute('style', nextStyle);
            else node.removeAttribute('style');
        }
    });

    return container.innerHTML;
}

const editorStyles = {
    wrap: {
        display: 'flex',
        flexDirection: 'column' as const,
        borderRadius: 18,
        border: '1px solid rgba(55,65,81,0.7)',
        background: '#020617',
        overflow: 'hidden',
    },
    toolbar: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid rgba(55,65,81,0.55)',
        background: 'rgba(15,23,42,0.85)',
    },
    group: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        alignItems: 'center',
        gap: 8,
    },
    groupLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: '#9ca3af',
        minWidth: 88,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.04em',
    },
    toolBtn: {
        minWidth: 36,
        height: 36,
        borderRadius: 10,
        border: '1px solid rgba(75,85,99,0.55)',
        background: 'rgba(15,23,42,0.9)',
        color: '#e5e7eb',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        padding: '0 10px',
    },
    colorBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '2px solid rgba(75,85,99,0.55)',
        cursor: 'pointer',
        padding: 0,
    },
    editor: {
        minHeight: 420,
        padding: '18px 20px',
        color: '#111827',
        fontSize: 15,
        lineHeight: 1.7,
        outline: 'none',
        overflowY: 'auto' as const,
        background: '#ffffff',
    },
    hint: {
        padding: '0 16px 14px',
        fontSize: 12,
        color: '#9ca3af',
    },
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [imageWidth, setImageWidth] = useState<ImageWidthPreset | number>(100);
    const [imageAlign, setImageAlign] = useState<ImageAlign>('center');
    const lastValueRef = useRef(value);

    const markSelectedImage = useCallback((img: HTMLImageElement | null) => {
        editorRef.current?.querySelectorAll('img.cms-image-selected').forEach((node) => {
            node.classList.remove('cms-image-selected');
        });

        if (!img) {
            setSelectedImage(null);
            return;
        }

        img.classList.add('cms-image-selected');
        setSelectedImage(img);
        setImageWidth(readImageWidth(img));
        setImageAlign(readImageAlign(img));
    }, []);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        if (value !== lastValueRef.current && el.innerHTML !== value) {
            const cleaned = sanitizeEditorHtml(value || '');
            el.innerHTML = cleaned;
            lastValueRef.current = cleaned;
        }
    }, [value]);

    const syncValue = useCallback(() => {
        const html = sanitizeEditorHtml(editorRef.current?.innerHTML || '');
        if (editorRef.current && editorRef.current.innerHTML !== html) {
            editorRef.current.innerHTML = html;
        }
        lastValueRef.current = html;
        onChange(html);
    }, [onChange]);

    const focusEditor = () => {
        editorRef.current?.focus();
    };

    const runCommand = (action: ToolAction) => {
        focusEditor();

        if (action === 'link') {
            const url = window.prompt('Введите ссылку (https://...)');
            if (!url) return;
            document.execCommand('createLink', false, url);
            syncValue();
            return;
        }

        if (action === 'image') {
            fileInputRef.current?.click();
            return;
        }

        if (action === 'clearAll') {
            if (!window.confirm('Очистить всё содержимое страницы?')) return;
            if (editorRef.current) editorRef.current.innerHTML = '';
            syncValue();
            return;
        }

        const commandMap: Record<string, () => void> = {
            undo: () => document.execCommand('undo'),
            redo: () => document.execCommand('redo'),
            bold: () => document.execCommand('bold'),
            italic: () => document.execCommand('italic'),
            underline: () => document.execCommand('underline'),
            strikeThrough: () => document.execCommand('strikeThrough'),
            h1: () => document.execCommand('formatBlock', false, 'h1'),
            h2: () => document.execCommand('formatBlock', false, 'h2'),
            h3: () => document.execCommand('formatBlock', false, 'h3'),
            h4: () => document.execCommand('formatBlock', false, 'h4'),
            p: () => document.execCommand('formatBlock', false, 'p'),
            ul: () => document.execCommand('insertUnorderedList'),
            ol: () => document.execCommand('insertOrderedList'),
            indent: () => document.execCommand('indent'),
            outdent: () => document.execCommand('outdent'),
            alignLeft: () => document.execCommand('justifyLeft'),
            alignCenter: () => document.execCommand('justifyCenter'),
            alignRight: () => document.execCommand('justifyRight'),
            justifyFull: () => document.execCommand('justifyFull'),
            unlink: () => document.execCommand('unlink'),
            hr: () => document.execCommand('insertHorizontalRule'),
            quote: () => document.execCommand('formatBlock', false, 'blockquote'),
            removeFormat: () => document.execCommand('removeFormat'),
        };

        commandMap[action]?.();
        syncValue();
    };

    const applyColor = (command: 'foreColor' | 'hiliteColor', color: string) => {
        focusEditor();
        document.execCommand(command, false, color);
        syncValue();
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        focusEditor();

        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');

        if (html) {
            const clean = sanitizeEditorHtml(html);
            document.execCommand('insertHTML', false, clean);
        } else {
            document.execCommand('insertText', false, text);
        }

        syncValue();
    };

    const updateSelectedImage = useCallback(
        (width: number, align: ImageAlign) => {
            const safeWidth = Math.min(100, Math.max(10, Math.round(width)));
            setImageWidth(safeWidth);
            setImageAlign(align);
            if (!selectedImage) return;
            applyImageSettings(selectedImage, safeWidth, align);
            syncValue();
        },
        [selectedImage, syncValue],
    );

    const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target;
        if (target instanceof HTMLImageElement && editorRef.current?.contains(target)) {
            markSelectedImage(target);
            return;
        }
        markSelectedImage(null);
    };

    const handleImageUpload = async (file?: File | null) => {
        if (!file) return;
        try {
            setUploading(true);
            const url = await uploadEditorImage(file);
            focusEditor();
            document.execCommand('insertHTML', false, buildImageHtml(url, imageWidth, imageAlign));
            syncValue();

            requestAnimationFrame(() => {
                const images = editorRef.current?.querySelectorAll('img');
                const lastImage = images?.[images.length - 1];
                if (lastImage instanceof HTMLImageElement) {
                    applyImageSettings(lastImage, imageWidth, imageAlign);
                    markSelectedImage(lastImage);
                    syncValue();
                }
            });
        } catch (error) {
            console.error(error);
            alert('Не удалось загрузить изображение');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div style={editorStyles.wrap}>
            <div style={editorStyles.toolbar}>
                {TOOL_GROUPS.map((group) => (
                    <div key={group.title} style={editorStyles.group}>
                        <span style={editorStyles.groupLabel}>{group.title}</span>
                        {group.items.map((tool) => (
                            <button
                                key={tool.action}
                                type="button"
                                title={tool.title}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => runCommand(tool.action)}
                                style={editorStyles.toolBtn}
                            >
                                {tool.label}
                            </button>
                        ))}
                    </div>
                ))}

                <div style={editorStyles.group}>
                    <span style={editorStyles.groupLabel}>Цвет текста</span>
                    {TEXT_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            title={`Цвет текста ${color}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyColor('foreColor', color)}
                            style={{
                                ...editorStyles.colorBtn,
                                background: color,
                            }}
                        />
                    ))}
                </div>

                <div style={editorStyles.group}>
                    <span style={editorStyles.groupLabel}>Фон текста</span>
                    {HIGHLIGHT_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            title="Цвет фона текста"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                if (color === 'transparent') {
                                    focusEditor();
                                    document.execCommand('removeFormat');
                                    syncValue();
                                    return;
                                }
                                applyColor('hiliteColor', color);
                            }}
                            style={{
                                ...editorStyles.colorBtn,
                                background: color === 'transparent' ? 'rgba(15,23,42,0.9)' : color,
                            }}
                        >
                            {color === 'transparent' ? '∅' : ''}
                        </button>
                    ))}
                </div>

                <div style={editorStyles.group}>
                    <span style={editorStyles.groupLabel}>Изображение</span>
                    {IMAGE_WIDTH_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            title={`Ширина ${preset}%`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => updateSelectedImage(preset, imageAlign)}
                            style={{
                                ...editorStyles.toolBtn,
                                borderColor:
                                    imageWidth === preset
                                        ? '#FE732E'
                                        : 'rgba(75,85,99,0.55)',
                            }}
                        >
                            {preset}%
                        </button>
                    ))}
                    <input
                        type="number"
                        min={10}
                        max={100}
                        value={imageWidth}
                        onChange={(e) => {
                            const next = Number(e.target.value);
                            if (Number.isNaN(next)) return;
                            updateSelectedImage(next, imageAlign);
                        }}
                        title="Ширина изображения в %"
                        style={{
                            width: 72,
                            height: 36,
                            borderRadius: 10,
                            border: '1px solid rgba(75,85,99,0.55)',
                            background: 'rgba(15,23,42,0.9)',
                            color: '#e5e7eb',
                            padding: '0 10px',
                        }}
                    />
                    {(
                        [
                            { align: 'left' as const, label: '⫷', title: 'Слева' },
                            { align: 'center' as const, label: '≡', title: 'По центру' },
                            { align: 'right' as const, label: '⫸', title: 'Справа' },
                        ] as const
                    ).map((item) => (
                        <button
                            key={item.align}
                            type="button"
                            title={item.title}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => updateSelectedImage(imageWidth, item.align)}
                            style={{
                                ...editorStyles.toolBtn,
                                borderColor:
                                    imageAlign === item.align
                                        ? '#FE732E'
                                        : 'rgba(75,85,99,0.55)',
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>
                        {selectedImage ? 'Изображение выбрано' : `Новое: ${imageWidth}% · ${imageAlign}`}
                    </span>
                </div>

                {uploading ? (
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>Загрузка изображения...</span>
                ) : null}
            </div>

            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncValue}
                onBlur={syncValue}
                onClick={handleEditorClick}
                onPaste={handlePaste}
                data-placeholder={placeholder || 'Начните писать текст страницы...'}
                style={editorStyles.editor}
                className="cms-rich-editor"
            />

            <div style={editorStyles.hint}>
                Изображения: выберите картинку в тексте, затем задайте размер (%) и выравнивание (слева / центр / справа).
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />

            <style jsx global>{`
                .cms-rich-editor {
                    background: ${EDITOR_SURFACE_BG} !important;
                    color: #111827;
                    color-scheme: light;
                }
                .cms-rich-editor:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                }
                .cms-rich-editor h1 {
                    font-size: 1.75rem;
                    margin: 1rem 0 0.6rem;
                    color: #111827;
                }
                .cms-rich-editor h2 {
                    font-size: 1.35rem;
                    margin: 1rem 0 0.5rem;
                    color: #111827;
                }
                .cms-rich-editor h3 {
                    font-size: 1.1rem;
                    margin: 0.85rem 0 0.4rem;
                    color: #1f2937;
                }
                .cms-rich-editor h4 {
                    font-size: 1rem;
                    margin: 0.75rem 0 0.35rem;
                    color: #1f2937;
                }
                .cms-rich-editor p {
                    margin: 0 0 0.85rem;
                }
                .cms-rich-editor ul,
                .cms-rich-editor ol {
                    margin: 0 0 0.85rem 1.25rem;
                }
                .cms-rich-editor blockquote {
                    margin: 0 0 0.85rem;
                    padding: 0.75rem 1rem;
                    border-left: 3px solid #fe732e;
                    background: rgba(254, 115, 46, 0.08);
                    border-radius: 0 10px 10px 0;
                }
                .cms-rich-editor a {
                    color: #2563eb;
                    text-decoration: underline;
                }
                .cms-rich-editor img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                }
                .cms-rich-editor img.cms-image-selected {
                    outline: 2px solid #fe732e;
                    outline-offset: 2px;
                }
                .cms-rich-editor img[data-cms-align='left'] {
                    float: left;
                    margin: 4px 16px 12px 0;
                }
                .cms-rich-editor img[data-cms-align='right'] {
                    float: right;
                    margin: 4px 0 12px 16px;
                }
                .cms-rich-editor img[data-cms-align='center'] {
                    display: block;
                    float: none;
                    margin-left: auto;
                    margin-right: auto;
                }
                .cms-rich-editor hr {
                    border: none;
                    border-top: 1px solid rgba(156, 163, 175, 0.45);
                    margin: 1rem 0;
                }
            `}</style>
        </div>
    );
}
