'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, storeUser, type LoginCredentials } from '@/lib/auth-api';
import { t, radius, text, cardStyle, inputStyle, button } from '@/lib/theme';
import Icon from '@/components/Icon';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credentials: LoginCredentials = { email, password };
      const response = await login(credentials);

      if (response.ok && response.user) {
        // Store user data
        storeUser(response.user);

        // Redirect to home page
        router.push('/');
      } else {
        setError('Не удалось войти. Проверьте email и пароль.');
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось войти. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    ...text.caption,
    color: t.textSecondary,
    fontWeight: 500,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: t.bg,
      }}
    >
      <div style={{ ...cardStyle, width: '100%', maxWidth: 420 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 24,
            gap: 12,
          }}
        >
          <BrandLogo height={36} style={{ margin: '0 auto' }} />
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                ...text.pageTitle,
                fontSize: 24,
                lineHeight: '32px',
                margin: '0 0 4px',
              }}
            >
              Totus Web Calling
            </h1>
            <p style={{ ...text.caption, margin: 0 }}>
              Войдите как агент, чтобы управлять звонками
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 18,
              padding: '10px 12px',
              background: t.errorSoft,
              borderRadius: radius.sm,
              color: t.error,
              fontSize: 13,
              lineHeight: '18px',
            }}
          >
            <Icon name="info" size={16} style={{ marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="agent@totus.club"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Введите пароль агента"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...button('primary', 'lg'),
              width: '100%',
              ...(loading
                ? {
                    background: t.surfaceInset,
                    color: t.textDisabled,
                    border: `1px solid ${t.border}`,
                    cursor: 'not-allowed',
                  }
                : null),
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            padding: '10px 12px',
            borderRadius: radius.md,
            background: t.surfaceInset,
            border: `1px solid ${t.border}`,
            ...text.caption,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Только пользователи с ролью <strong>agent</strong> могут войти в
          систему.
        </div>
      </div>
    </div>
  );
}
