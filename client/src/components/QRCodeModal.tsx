import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LanInfo } from '@shared/types.js';

interface QRCodeModalProps {
  roomCode: string;
  lanInfo: LanInfo | null;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, lanInfo, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Determine join link using detected LAN IP or fallback to window.location.origin
  const baseUrl = lanInfo?.lanUrl || window.location.origin;
  const joinUrl = `${baseUrl}/?join=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', color: '#fff' }}>
          Scan to Join Room
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Point another phone's camera at this QR code on the same Wi-Fi.
        </p>

        <div className="qr-box">
          <QRCodeSVG
            value={joinUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#0a0c10"
            level="M"
            marginSize={2}
          />
        </div>

        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
            LAN Address:
          </div>
          <code
            style={{
              fontSize: '0.85rem',
              color: 'var(--accent-gold)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              wordBreak: 'break-all'
            }}
          >
            {joinUrl}
          </code>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleCopy} style={{ flex: 1 }}>
            {copied ? '✓ Copied Link' : 'Copy Join Link'}
          </button>
          <button className="btn btn-primary" onClick={onClose} style={{ width: '90px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
