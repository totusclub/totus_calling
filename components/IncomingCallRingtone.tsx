'use client';

/**
 * Звук входящего звонка и мигание вкладки на любой странице панели (/, /chat).
 *
 * Карточка звонка (CallModal) живёт только на главной и перестаёт опрашивать
 * состояние, когда её сворачивают, поэтому звук держит отдельный компонент
 * в app/layout.tsx: опрашивает сервис звонков и звонит, пока state === 'ringing'
 * (до ответа, отклонения или отбоя). Звук — lib/incomingRingtone.ts.
 */
import { useEffect, useState } from 'react';
import { getCallState, type CallState } from '@/lib/webrtc-service';
import { installAudioUnlock, startIncomingRingtone, stopIncomingRingtone } from '@/lib/incomingRingtone';

const POLL_MS = 400;

export default function IncomingCallRingtone() {
  const [state, setState] = useState<CallState>('idle');

  // Звук разблокируется первым нажатием на странице; компонент ушёл — тишина.
  useEffect(() => {
    installAudioUnlock();
    const id = setInterval(() => setState(getCallState().state), POLL_MS);
    return () => {
      clearInterval(id);
      stopIncomingRingtone();
    };
  }, []);

  useEffect(() => {
    if (state === 'ringing') startIncomingRingtone();
    else stopIncomingRingtone();
  }, [state]);

  return null;
}
