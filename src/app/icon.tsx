import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0b1728 0%, #06101b 100%)',
          color: '#12c2b9',
          fontSize: 240,
          fontWeight: 700,
          fontFamily: 'Space Grotesk, sans-serif'
        }}
      >
        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(18, 194, 185, 0.08)',
            boxShadow: '0 0 0 2px rgba(18, 194, 185, 0.22), 0 28px 90px rgba(0, 0, 0, 0.35)'
          }}
        >
          <svg viewBox="0 0 256 256" width="230" height="230" fill="none" aria-hidden="true">
            <path d="M52 166h152c14 0 25-11 25-25v-28c0-19-15-34-34-34H95L73 64H54" stroke="#12c2b9" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M70 166l18 30" stroke="#f5a524" strokeWidth="16" strokeLinecap="round" />
            <path d="M180 166l18 30" stroke="#f5a524" strokeWidth="16" strokeLinecap="round" />
            <circle cx="86" cy="196" r="18" fill="#f5a524" />
            <circle cx="182" cy="196" r="18" fill="#f5a524" />
            <path d="M92 94h64l14 24H104l-12-24Z" fill="#12c2b9" opacity="0.16" />
          </svg>
        </div>
      </div>
    ),
    size
  );
}
