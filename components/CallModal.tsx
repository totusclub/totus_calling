'use client';

import { useEffect, useState } from 'react';
import {
  getCallState,
  getActiveCallInfo,
  answerCall,
  rejectCall,
  endCall,
  toggleMute,
  toggleSpeaker,
} from '@/lib/webrtc-service';
import { t, radius, text, badge, button } from '@/lib/theme';
import Icon from '@/components/Icon';

interface CallModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Круглая кнопка управления звонком: без градиентов, только токены. */
function circleButton(size: number, background: string, color: string, border?: string): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: radius.pill,
    background,
    border: border ? `1px solid ${border}` : '1px solid transparent',
    color,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  };
}

export default function CallModal({ visible, onClose }: CallModalProps) {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'answered' | 'ended' | 'rejected'>('idle');
  const [callInfo, setCallInfo] = useState<{
    state: typeof callState;
    callerName: string | null;
    isMuted: boolean;
    isSpeakerEnabled: boolean;
    callUUID: string | null;
  }>({
    state: 'idle',
    callerName: null,
    isMuted: false,
    isSpeakerEnabled: false,
    callUUID: null,
  });
  const [callSeconds, setCallSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Update state from service
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const state = getCallState();
      const activeInfo = getActiveCallInfo();
      setCallInfo(state);
      setCallState(state.state);
      setIsActive(activeInfo.isActive);
      if (activeInfo.isActive && activeInfo.startedAt) {
        const diffSec = Math.floor((Date.now() - activeInfo.startedAt) / 1000);
        setCallSeconds(diffSec);
      } else {
        setCallSeconds(0);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [visible]);

  const formatCallTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStateText = () => {
    switch (callState) {
      case 'calling':
        return 'Вызов...';
      case 'ringing':
        return 'Входящий звонок';
      case 'answered':
        return 'Разговор';
      case 'ended':
        return 'Звонок завершен';
      case 'rejected':
        return 'Звонок отклонен';
      default:
        return '';
    }
  };

  const getDisplayLabel = () => {
    if (callState === 'ringing') {
      return 'Вам звонят';
    } else if (callState === 'calling') {
      return 'Вызываете';
    } else {
      return '';
    }
  };

  const handleMute = () => {
    toggleMute();
  };

  const handleSpeaker = () => {
    toggleSpeaker();
  };

  const handleEndCall = () => {
    endCall();
    onClose();
  };

  const handleRejectCall = () => {
    if (callInfo.callUUID) {
      rejectCall(callInfo.callUUID);
    }
    onClose();
  };

  const handleAnswerCall = () => {
    if (callInfo.callUUID) {
      answerCall(callInfo.callUUID);
    }
  };

  if (!visible) return null;

  const effectiveState = callState;
  const isRinging = effectiveState === 'ringing';
  const isCalling = effectiveState === 'calling';
  const isAnswered = effectiveState === 'answered';
  const isEnded = effectiveState === 'ended';
  const isRejected = effectiveState === 'rejected';
  const isFinished = isEnded || isRejected;
  const callerInitial = ((callInfo.callerName || 'Неизвестный') as string)
    .charAt(0)
    .toUpperCase();

  const badgeTone = isCalling
    ? 'accent'
    : isRinging || isAnswered
    ? 'success'
    : isRejected
    ? 'error'
    : 'neutral';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: radius.lg,
          padding: '32px 28px 28px',
          background: t.surface,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadowRaised,
          color: t.textSecondary,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          position: 'relative',
        }}
      >
        {/* Minimize button - top right */}
        <button
          type="button"
          onClick={onClose}
          title="Свернуть"
          style={{
            ...circleButton(32, t.surfaceInset, t.textTertiary, t.border),
            position: 'absolute',
            top: 16,
            right: 16,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.surfaceHover;
            e.currentTarget.style.color = t.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = t.surfaceInset;
            e.currentTarget.style.color = t.textTertiary;
          }}
        >
          <Icon name="minimize" size={16} />
        </button>

        {/* Avatar */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.pill,
            background: t.accentSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            fontWeight: 600,
            color: t.accent,
          }}
        >
          {callerInitial}
        </div>

        {/* Caller Info */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div
            style={{
              ...text.caption,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            {getDisplayLabel() || 'Звонок'}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: '36px',
              fontWeight: 600,
              color: t.textPrimary,
              marginBottom: 12,
            }}
          >
            {callInfo.callerName || 'Неизвестный'}
          </div>
          <div style={badge(badgeTone)}>{getStateText()}</div>
        </div>

        {/* Timer */}
        {(isActive || isEnded) && (
          <div
            style={{
              fontFamily: text.mono.fontFamily,
              fontSize: 36,
              lineHeight: '44px',
              fontWeight: 600,
              letterSpacing: 2,
              color: isAnswered ? t.accent : t.textTertiary,
            }}
          >
            {formatCallTime(callSeconds)}
          </div>
        )}

        {/* Secondary Controls (Mute/Speaker) */}
        {(isAnswered || isCalling) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              width: '100%',
            }}
          >
            <button
              onClick={handleMute}
              style={circleButton(
                56,
                callInfo.isMuted ? t.errorSoft : t.surfaceInset,
                callInfo.isMuted ? t.error : t.textPrimary,
                callInfo.isMuted ? 'transparent' : t.border
              )}
              title={callInfo.isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              <Icon name="mic" size={24} />
            </button>

            <button
              onClick={handleSpeaker}
              style={circleButton(
                56,
                callInfo.isSpeakerEnabled ? t.infoSoft : t.surfaceInset,
                callInfo.isSpeakerEnabled ? t.info : t.textPrimary,
                callInfo.isSpeakerEnabled ? 'transparent' : t.border
              )}
              title={callInfo.isSpeakerEnabled ? 'Выключить динамик' : 'Включить динамик'}
            >
              <Icon name="volume" size={24} />
            </button>
          </div>
        )}

        {/* Main Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            width: '100%',
            marginTop: 4,
          }}
        >
          {/* Incoming Call: Reject & Answer */}
          {isRinging && (
            <>
              <button
                onClick={handleRejectCall}
                style={circleButton(72, t.error, '#ffffff')}
                title="Отклонить"
              >
                <Icon name="phoneOff" size={28} />
              </button>
              <button
                onClick={handleAnswerCall}
                style={circleButton(72, t.success, '#ffffff')}
                title="Ответить"
              >
                <Icon name="phone" size={28} />
              </button>
            </>
          )}

          {/* Active Call: End Call */}
          {(isAnswered || isCalling) && (
            <button
              onClick={handleEndCall}
              style={circleButton(72, t.error, '#ffffff')}
              title="Завершить звонок"
            >
              <Icon name="phoneOff" size={28} />
            </button>
          )}

          {/* Finished: Close the card */}
          {isFinished && (
            <button type="button" onClick={onClose} style={button('secondary')}>
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
