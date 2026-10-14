import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { formatEuro, monthLongLabel, monthShortLabel } from '../lib/format';
import type { Slice } from '../lib/stats';
import { colors, otherColor, seriesColors } from '../lib/theme';

// Su web l'SVG userebbe un font con grazie: forziamo quello di sistema.
const svgFont = Platform.select({ web: 'system-ui, -apple-system, Roboto, sans-serif', default: undefined });

function compactEuro(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k`;
  return Math.round(v).toLocaleString('it-IT');
}

function niceMax(v: number): number {
  if (v <= 0) return 100;
  const exp = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * exp >= v) return m * exp;
  return 10 * exp;
}

/** Barra con angoli arrotondati solo in alto, appoggiata alla linea di base. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  const base = y + h;
  return `M${x},${base} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${base} Z`;
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: i.color }]} />
          <Text style={styles.legendText}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Entrate e uscite affiancate per mese. Tocca un mese per vedere i valori. */
export function MonthlyBars({ data }: { data: { key: string; income: number; expense: number }[] }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(data.length - 1);
  const height = 180;
  const axisW = 36;
  const bottom = 22;
  const plotH = height - bottom - 8;
  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense])));
  const plotW = Math.max(0, width - axisW);
  const groupW = plotW / data.length;
  const barW = Math.min(16, groupW * 0.3);
  const y = (v: number) => 8 + plotH - (v / max) * plotH;
  const sel = data[selected];

  return (
    <View>
      <Legend
        items={[
          { label: 'Entrate', color: colors.income },
          { label: 'Uscite', color: colors.expense },
        ]}
      />
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0, max / 2, max].map((t) => (
              <G key={t}>
                <Line x1={axisW} x2={width} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
                <SvgText fontFamily={svgFont} x={axisW - 6} y={y(t) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                  {compactEuro(t)}
                </SvgText>
              </G>
            ))}
            {data.map((d, i) => {
              const cx = axisW + groupW * i + groupW / 2;
              const active = i === selected;
              return (
                <G key={d.key} opacity={active ? 1 : 0.55}>
                  {active && <Rect x={cx - groupW / 2 + 2} y={4} width={groupW - 4} height={plotH + 6} rx={8} fill={colors.bg} />}
                  {d.income > 0 && (
                    <Path d={topRoundedBar(cx - barW - 1, y(d.income), barW, y(0) - y(d.income), 4)} fill={colors.income} />
                  )}
                  {d.expense > 0 && (
                    <Path d={topRoundedBar(cx + 1, y(d.expense), barW, y(0) - y(d.expense), 4)} fill={colors.expense} />
                  )}
                  <SvgText
                    fontFamily={svgFont}
                    x={cx}
                    y={height - 6}
                    fontSize={11}
                    fontWeight={active ? '700' : '400'}
                    fill={active ? colors.text : colors.textMuted}
                    textAnchor="middle"
                  >
                    {monthShortLabel(d.key)}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
        {/* Aree di tocco più grandi delle barre */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', marginLeft: axisW }]}>
          {data.map((d, i) => (
            <Pressable
              key={d.key}
              style={{ flex: 1 }}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={`${monthLongLabel(d.key)}: entrate ${formatEuro(d.income)}, uscite ${formatEuro(d.expense)}`}
            />
          ))}
        </View>
      </View>
      {sel && (
        <View style={styles.readout}>
          <Text style={styles.readoutTitle}>{monthLongLabel(sel.key)}</Text>
          <View style={styles.readoutRow}>
            <Text style={styles.readoutLabel}>Entrate</Text>
            <Text style={styles.readoutValue}>{formatEuro(sel.income)}</Text>
          </View>
          <View style={styles.readoutRow}>
            <Text style={styles.readoutLabel}>Uscite</Text>
            <Text style={styles.readoutValue}>{formatEuro(sel.expense)}</Text>
          </View>
          <View style={styles.readoutRow}>
            <Text style={styles.readoutLabel}>Saldo</Text>
            <Text style={[styles.readoutValue, { fontWeight: '700' }]}>{formatEuro(sel.income - sel.expense)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function arcPath(cx: number, cy: number, r: number, inner: number, start: number, end: number): string {
  const p = (radius: number, a: number) => [cx + radius * Math.sin(a), cy - radius * Math.cos(a)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = p(r, start);
  const [x2, y2] = p(r, end);
  const [x3, y3] = p(inner, end);
  const [x4, y4] = p(inner, start);
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`;
}

/** Ciambella delle spese per categoria, con legenda-tabella (nome, %, importo). */
export function CategoryDonut({ slices }: { slices: Slice[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 180;
  const r = 86;
  const inner = 56;
  const colorFor = (i: number, label: string) => (label === 'Altro' ? otherColor : seriesColors[i % seriesColors.length]);

  const arcs = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((sum, x) => sum + x.value, 0);
    const start = (before / total) * Math.PI * 2;
    const end = ((before + s.value) / total) * Math.PI * 2;
    return { ...s, start, end, color: colorFor(i, s.label) };
  });
  const focus = selected !== null ? slices[selected] : null;

  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size}>
          {arcs.length === 1 ? (
            <Circle cx={size / 2} cy={size / 2} r={(r + inner) / 2} stroke={arcs[0].color} strokeWidth={r - inner} fill="none" />
          ) : (
            arcs.map((a, i) => (
              <Path
                key={a.label}
                d={arcPath(size / 2, size / 2, selected === i ? r + 3 : r, inner, a.start, a.end)}
                fill={a.color}
                stroke={colors.card}
                strokeWidth={2}
                opacity={selected === null || selected === i ? 1 : 0.4}
                onPress={() => setSelected(selected === i ? null : i)}
              />
            ))
          )}
          <SvgText fontFamily={svgFont} x={size / 2} y={size / 2 - 4} fontSize={12} fill={colors.textSecondary} textAnchor="middle">
            {focus ? focus.label : 'Totale'}
          </SvgText>
          <SvgText fontFamily={svgFont} x={size / 2} y={size / 2 + 16} fontSize={16} fontWeight="700" fill={colors.text} textAnchor="middle">
            {formatEuro(focus ? focus.value : total)}
          </SvgText>
        </Svg>
      </View>
      <View style={{ marginTop: 12 }}>
        {arcs.map((a, i) => (
          <Pressable
            key={a.label}
            onPress={() => setSelected(selected === i ? null : i)}
            style={[styles.tableRow, selected === i && { backgroundColor: colors.bg }]}
            accessibilityRole="button"
          >
            <View style={[styles.swatch, { backgroundColor: a.color }]} />
            <Text style={[styles.legendText, { flex: 1 }]}>{a.label}</Text>
            <Text style={styles.pct}>{Math.round((a.value / total) * 100)}%</Text>
            <Text style={styles.readoutValue}>{formatEuro(a.value)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 14, color: colors.text },
  readout: { marginTop: 8, padding: 12, backgroundColor: colors.bg, borderRadius: 12, gap: 4 },
  readoutTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize', marginBottom: 2 },
  readoutRow: { flexDirection: 'row', justifyContent: 'space-between' },
  readoutLabel: { fontSize: 14, color: colors.textSecondary },
  readoutValue: { fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8 },
  pct: { fontSize: 13, color: colors.textMuted, width: 40, textAlign: 'right' },
});
