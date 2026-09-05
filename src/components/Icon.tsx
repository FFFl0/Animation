import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'stats'
  | 'trophy'
  | 'medal'
  | 'user'
  | 'book'
  | 'character'
  | 'music'
  | 'quote'
  | 'swords'
  | 'globe'
  | 'star'
  | 'shuffle'
  | 'settings'
  | 'flame'
  | 'heart'
  | 'heartOutline'
  | 'bolt'
  | 'target'
  | 'moon'
  | 'eye'
  | 'chat'
  | 'film'
  | 'infinity'
  | 'calendar'
  | 'leaf'
  | 'wave'
  | 'sakura'
  | 'crown'
  | 'lock'
  | 'close'
  | 'arrowPath';

type Props = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export default function Icon({ name, size = 22, color, strokeWidth = 1.8 }: Props) {
  const common = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderIcon(name, common, color)}
    </Svg>
  );
}

function renderIcon(name: IconName, common: any, color: string) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M4 11 12 4l8 7" {...common} />
          <Path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" {...common} />
          <Rect x="10" y="14" width="4" height="6" {...common} />
        </>
      );
    case 'stats':
      return (
        <>
          <Line x1="6" y1="20" x2="6" y2="13" {...common} strokeWidth={3} />
          <Line x1="12" y1="20" x2="12" y2="9" {...common} strokeWidth={3} />
          <Line x1="18" y1="20" x2="18" y2="5" {...common} strokeWidth={3} />
        </>
      );
    case 'trophy':
      return (
        <>
          <Path d="M7 4h10v3a5 5 0 0 1-10 0V4z" {...common} />
          <Path d="M7 5H4.5A2.5 2.5 0 0 0 7 8.5" {...common} />
          <Path d="M17 5h2.5A2.5 2.5 0 0 1 17 8.5" {...common} />
          <Line x1="12" y1="13" x2="12" y2="19" {...common} />
          <Line x1="8" y1="20" x2="16" y2="20" {...common} />
        </>
      );
    case 'medal':
      return (
        <>
          <Circle cx="12" cy="8.5" r="5.5" {...common} />
          <Line x1="9" y1="13.3" x2="6.3" y2="21" {...common} />
          <Line x1="15" y1="13.3" x2="17.7" y2="21" {...common} />
          <Line x1="6.3" y1="21" x2="12" y2="17.5" {...common} />
          <Line x1="17.7" y1="21" x2="12" y2="17.5" {...common} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx="12" cy="8" r="3.5" {...common} />
          <Path d="M5 20c0-4 3-6 7-6s7 2 7 6" {...common} />
        </>
      );
    case 'character':
      return (
        <>
          <Path d="M12 3a6 6 0 0 0-6 6v3a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6z" {...common} />
          <Path d="M8 5.5c1.5-1 6-1 7.5 0" {...common} />
          <Circle cx="9.5" cy="11" r="0.9" fill={color} stroke="none" />
          <Circle cx="14.5" cy="11" r="0.9" fill={color} stroke="none" />
          <Path d="M9.5 15c1 1 4 1 5 0" {...common} />
        </>
      );
    case 'book':
      return (
        <>
          <Path d="M12 6c-1.5-1-4-1.5-6-1v13c2-.5 4.5 0 6 1 1.5-1 4-1.5 6-1V5c-2-.5-4.5 0-6 1z" {...common} />
          <Line x1="12" y1="6" x2="12" y2="19" {...common} />
        </>
      );
    case 'music':
      return (
        <>
          <Circle cx="7.5" cy="18" r="2.2" {...common} />
          <Circle cx="16.5" cy="16" r="2.2" {...common} />
          <Line x1="9.7" y1="18" x2="9.7" y2="5" {...common} />
          <Line x1="18.7" y1="16" x2="18.7" y2="3" {...common} />
          <Path d="M9.7 5l9-2v5l-9 2" {...common} />
        </>
      );
    case 'quote':
      return (
        <>
          <Path d="M10 8H7a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1c0 1.5-1 2.5-2 3" {...common} />
          <Path d="M19 8h-3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1c0 1.5-1 2.5-2 3" {...common} />
        </>
      );
    case 'swords':
      return (
        <>
          <Line x1="7" y1="17" x2="18" y2="6" {...common} />
          <Line x1="14.5" y1="6" x2="18" y2="6" {...common} />
          <Line x1="18" y1="6" x2="18" y2="9.5" {...common} />
          <Line x1="9.3" y1="14.7" x2="12.7" y2="11.3" {...common} />
          <Circle cx="7" cy="17" r="1.4" fill={color} stroke="none" />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...common} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
          <Path d="M12 4c3 4 3 12 0 16" {...common} />
          <Path d="M12 4c-3 4-3 12 0 16" {...common} />
        </>
      );
    case 'star':
      return <Path d="M12 3l2.6 5.6 6.2.6-4.6 4.2 1.3 6.1L12 16.9l-5.5 2.6 1.3-6.1L3.2 9.2l6.2-.6L12 3z" {...common} />;
    case 'shuffle':
      return (
        <>
          <Path d="M3 7h3l10 10h4" {...common} />
          <Path d="M17 4l3 3-3 3" {...common} />
          <Path d="M3 17h3l4-4.5" {...common} />
          <Path d="M17 20l3-3-3-3" {...common} />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="6.2" {...common} />
          <Circle cx="12" cy="12" r="2.3" {...common} />
          <Line x1="12" y1="2" x2="12" y2="5" {...common} />
          <Line x1="12" y1="19" x2="12" y2="22" {...common} />
          <Line x1="2" y1="12" x2="5" y2="12" {...common} />
          <Line x1="19" y1="12" x2="22" y2="12" {...common} />
          <Line x1="5" y1="5" x2="7.1" y2="7.1" {...common} />
          <Line x1="16.9" y1="16.9" x2="19" y2="19" {...common} />
          <Line x1="5" y1="19" x2="7.1" y2="16.9" {...common} />
          <Line x1="16.9" y1="7.1" x2="19" y2="5" {...common} />
        </>
      );
    case 'flame':
      return <Path d="M12 2c2 4-2 5-2 9a4 4 0 1 0 8 0c0-2-1-4-2-5 .3 2-1.2 3-2 2 1-2-.5-4-2-6z" {...common} />;
    case 'heart':
      return (
        <Path
          d="M12 20s-7-4.3-9.5-8.8A5.4 5.4 0 0 1 12 5.3a5.4 5.4 0 0 1 9.5 5.9C19 15.7 12 20 12 20z"
          stroke="none"
          fill={color}
        />
      );
    case 'heartOutline':
      return (
        <Path d="M12 20s-7-4.3-9.5-8.8A5.4 5.4 0 0 1 12 5.3a5.4 5.4 0 0 1 9.5 5.9C19 15.7 12 20 12 20z" {...common} />
      );
    case 'bolt':
      return <Path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" {...common} />;
    case 'target':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...common} />
          <Circle cx="12" cy="12" r="4.3" {...common} />
          <Circle cx="12" cy="12" r="1.1" fill={color} stroke="none" />
        </>
      );
    case 'moon':
      return <Path d="M20 14.5A8.5 8.5 0 1 1 11.5 4 6.5 6.5 0 0 0 20 14.5z" {...common} />;
    case 'eye':
      return (
        <>
          <Path d="M2.5 12S6.5 6 12 6s9.5 6 9.5 6-4 6-9.5 6-9.5-6-9.5-6z" {...common} />
          <Circle cx="12" cy="12" r="2.6" {...common} />
        </>
      );
    case 'chat':
      return <Path d="M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4.5 4V6.5z" {...common} />;
    case 'film':
      return (
        <>
          <Rect x="3" y="8" width="18" height="11" rx="1" {...common} />
          <Path d="M3.5 8 6 4h4L7.5 8z" {...common} />
          <Path d="M9.5 8 12 4h4L13.5 8z" {...common} />
          <Path d="M15.5 8 18 4h2.5L18 8z" {...common} />
        </>
      );
    case 'infinity':
      return (
        <Path
          d="M8 15.2a4.2 4.2 0 1 1 0-8.4c2.6 0 3.7 2.1 4 4.2.3-2.1 1.4-4.2 4-4.2a4.2 4.2 0 1 1 0 8.4c-2.6 0-3.7-2.1-4-4.2-.3 2.1-1.4 4.2-4 4.2z"
          {...common}
        />
      );
    case 'calendar':
      return (
        <>
          <Rect x="4" y="5" width="16" height="15" rx="2" {...common} />
          <Line x1="4" y1="10" x2="20" y2="10" {...common} />
          <Line x1="8" y1="3" x2="8" y2="7" {...common} />
          <Line x1="16" y1="3" x2="16" y2="7" {...common} />
        </>
      );
    case 'leaf':
      return (
        <>
          <Path d="M4 20c8 0 14-6 14-14V4h-2C8 4 4 10 4 18v2z" {...common} />
          <Line x1="4" y1="20" x2="11" y2="13" {...common} />
        </>
      );
    case 'wave':
      return (
        <>
          <Path d="M3 14.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0" {...common} />
          <Path d="M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0" {...common} />
        </>
      );
    case 'sakura':
      return (
        <>
          <Circle cx="12" cy="7.3" r="2.2" {...common} />
          <Circle cx="16.4" cy="10.3" r="2.2" {...common} />
          <Circle cx="14.7" cy="15.3" r="2.2" {...common} />
          <Circle cx="9.3" cy="15.3" r="2.2" {...common} />
          <Circle cx="7.6" cy="10.3" r="2.2" {...common} />
          <Circle cx="12" cy="11.5" r="1" fill={color} stroke="none" />
        </>
      );
    case 'crown':
      return (
        <>
          <Path d="M4 18h16l-1.5-8-4 3-2.5-5-2.5 5-4-3L4 18z" {...common} />
          <Line x1="4" y1="20.5" x2="20" y2="20.5" {...common} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x="6" y="11" width="12" height="9" rx="2" {...common} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...common} />
        </>
      );
    case 'close':
      return (
        <>
          <Line x1="5" y1="5" x2="19" y2="19" {...common} />
          <Line x1="19" y1="5" x2="5" y2="19" {...common} />
        </>
      );
    case 'arrowPath':
      return (
        <>
          <Path d="M4 12a8 8 0 0 1 14-5.3" {...common} />
          <Path d="M18 3v4.5h-4.5" {...common} />
          <Path d="M20 12a8 8 0 0 1-14 5.3" {...common} />
          <Path d="M6 21v-4.5h4.5" {...common} />
        </>
      );
  }
}
