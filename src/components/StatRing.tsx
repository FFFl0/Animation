import Svg, { Circle } from 'react-native-svg';

type Props = {
  /** 0..100 */
  percent: number;
  size?: number;
  color: string;
  trackColor: string;
};

/** The accuracy dial on the stats screen: a ring filled clockwise from the top. */
export default function StatRing({ percent, size = 34, color, trackColor }: Props) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${filled} ${circumference}`}
        // start at twelve o'clock rather than three
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
