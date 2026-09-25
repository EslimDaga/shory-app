import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { MusicSource } from '@/types/music';

type Props = { source: MusicSource; size?: number };

export function SourceLogo({ source, size = 24 }: Props) {
  if (source === 'spotify') return <SpotifyLogo size={size} />;
  if (source === 'youtube-music') return <YouTubeMusicLogo size={size} />;
  return <AppleMusicLogo size={size} />;
}

function SpotifyLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Circle cx={128} cy={128} r={118} fill="#000000" />
      <Path
        d="M128 0C57.308 0 0 57.309 0 128c0 70.696 57.309 128 128 128 70.697 0 128-57.304 128-128C256 57.314 198.697.007 127.998.007l.001-.006Zm58.699 184.614c-2.293 3.76-7.215 4.952-10.975 2.644-30.053-18.357-67.885-22.515-112.44-12.335a7.981 7.981 0 0 1-9.552-6.007 7.968 7.968 0 0 1 6-9.553c48.76-11.14 90.583-6.344 124.323 14.276 3.76 2.308 4.952 7.215 2.644 10.975Zm15.667-34.853c-2.89 4.695-9.034 6.178-13.726 3.289-34.406-21.148-86.853-27.273-127.548-14.92-5.278 1.594-10.852-1.38-12.454-6.649-1.59-5.278 1.386-10.842 6.655-12.446 46.485-14.106 104.275-7.273 143.787 17.007 4.692 2.89 6.175 9.034 3.286 13.72v-.001Zm1.345-36.293C162.457 88.964 94.394 86.71 55.007 98.666c-6.325 1.918-13.014-1.653-14.93-7.978-1.917-6.328 1.65-13.012 7.98-14.935C93.27 62.027 168.434 64.68 215.929 92.876c5.702 3.376 7.566 10.724 4.188 16.405-3.362 5.69-10.73 7.565-16.4 4.187h-.006Z"
        fill="#1ED760"
      />
    </Svg>
  );
}

function YouTubeMusicLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="4 4 184 184">
      <Circle cx={96} cy={96} r={88} fill="#FF0000" />
      <Path
        fill="#FFFFFF"
        d="M96 50.32c25.19 0 45.68 20.49 45.68 45.68S121.19 141.68 96 141.68 50.32 121.19 50.32 96 70.81 50.32 96 50.32m0-6.4c-28.76 0-52.08 23.32-52.08 52.08 0 28.76 23.32 52.08 52.08 52.08s52.08-23.32 52.08-52.08c0-28.76-23.32-52.08-52.08-52.08z"
      />
      <Path fill="#FFFFFF" d="m79 122 45-26-45-26z" />
    </Svg>
  );
}

function AppleMusicLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="am" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FA5C74" />
          <Stop offset="1" stopColor="#FA233B" />
        </LinearGradient>
      </Defs>
      <Rect width={24} height={24} rx={5.4} fill="url(#am)" />
      <Path d="M9.2 7.6 17.4 5.8v2.3L9.2 9.9Z" fill="#FFFFFF" />
      <Rect x={9.2} y={7.6} width={1.5} height={8.6} fill="#FFFFFF" />
      <Rect x={15.9} y={5.9} width={1.5} height={8.6} fill="#FFFFFF" />
      <Path
        d="M9.95 16.1c0 1.05-1.02 1.95-2.3 1.95-1.1 0-1.8-.62-1.8-1.45 0-1.02 1.02-1.9 2.3-1.9.72 0 1.3.2 1.8.62Z"
        fill="#FFFFFF"
      />
      <Path
        d="M16.65 14.4c0 1.05-1.02 1.95-2.3 1.95-1.1 0-1.8-.62-1.8-1.45 0-1.02 1.02-1.9 2.3-1.9.72 0 1.3.2 1.8.62Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}
