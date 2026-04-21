import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0b1728 0%, #06101b 100%)'
        }}
      >
        <div
          style={{
            width: 146,
            height: 146,
            borderRadius: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(18, 194, 185, 0.08)'
          }}
        >
          <svg viewBox="0 0 256 256" width="120" height="120" fill="none" aria-hidden="true">
            <path d="M52 166h152c14 0 25-11 25-25v-28c0-19-15-34-34-34H95L73 64H54" stroke="#12c2b9" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="86" cy="196" r="18" fill="#f5a524" />
            <circle cx="182" cy="196" r="18" fill="#f5a524" />
          </svg>
        </div>
      </div>
    ),
    size
  );
}
