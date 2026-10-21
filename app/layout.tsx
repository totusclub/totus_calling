import type { Metadata } from 'next'
import { Golos_Text } from 'next/font/google'
import AuthGuard from '@/components/AuthGuard';
import SupportChatProvider from '@/components/SupportChatProvider';
import IncomingCallRingtone from '@/components/IncomingCallRingtone';
import ThemeProvider, { themeBootstrapScript } from '@/components/ThemeProvider';
import './globals.css'

// Шрифт дизайн-системы TOTUS CLUB.
const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Totus Web Calling',
  description: 'Панель звонков для агентов Totus Club',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={golos.className}>
        <ThemeProvider>
          <AuthGuard>
            {/* Счётчик непрочитанного и сокет чата поддержки; на /login ничего не делает */}
            <SupportChatProvider>{children}</SupportChatProvider>
            {/* Звук входящего звонка и мигание вкладки — на любой странице, пока звонят */}
            <IncomingCallRingtone />
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
