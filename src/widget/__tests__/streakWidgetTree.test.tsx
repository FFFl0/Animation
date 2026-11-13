import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';
import { StreakWidget } from '../StreakWidget';

/**
 * The widget library turns the JSX into a tree for Android by walking it
 * itself, and it knows less than React does — a fragment, for one, breaks
 * it. So the widget is put through the library's own walk, at every state
 * and the sizes that switch layouts.
 */
type Node = { type: string; props: Record<string, unknown>; children?: Node[] };

function texts(node: Node): string[] {
  const own = node.type === 'TextWidget' ? [String(node.props.text)] : [];
  return own.concat(...(node.children ?? []).map(texts));
}

describe('the widget as Android receives it', () => {
  const kinds = ['done', 'pending', 'frozen', 'start'] as const;
  const sizes: [number, number][] = [
    [168, 81],
    [263, 185],
    [180, 170],
  ];

  it('builds for every state and size, with the number and a status in it', () => {
    for (const kind of kinds) {
      for (const [width, height] of sizes) {
        const tree = buildWidgetTree(
          <StreakWidget state={{ kind, count: 4 }} language="ru" width={width} height={height} variant={3} />
        ) as unknown as Node;
        const words = texts(tree);
        expect(words).toContain('4');
        expect(words.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('turns off the phone font scale on every line', () => {
    const tree = buildWidgetTree(
      <StreakWidget state={{ kind: 'done', count: 4 }} language="ru" width={168} height={81} variant={3} />
    ) as unknown as Node;
    const lines: Node[] = [];
    const walk = (n: Node) => {
      if (n.type === 'TextWidget') lines.push(n);
      (n.children ?? []).forEach(walk);
    };
    walk(tree);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.props.allowFontScaling).toBe(false);
  });
});
