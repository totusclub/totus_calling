import type { CSSProperties } from 'react';

export const cardStyle: CSSProperties = {
    padding: 24,
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.97))',
    border: '1px solid rgba(55,65,81,0.6)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,23,42,0.8)',
    backdropFilter: 'blur(20px)',
};

export const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(55,65,81,0.8)',
    background: 'rgba(15,23,42,0.8)',
    color: '#f9fafb',
    fontSize: 14,
    boxSizing: 'border-box',
};

export const textareaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: 120,
    resize: 'vertical',
    fontFamily: 'inherit',
};

export const sectionBox: CSSProperties = {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    border: '1px solid rgba(55,65,81,0.6)',
    background: 'rgba(2,6,23,0.5)',
};

export const sectionTitle: CSSProperties = {
    margin: '0 0 6px',
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: 700,
};

export const sectionDesc: CSSProperties = {
    margin: '0 0 16px',
    color: '#9ca3af',
    fontSize: 13,
};
