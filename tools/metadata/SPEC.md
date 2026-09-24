# Clothing metadata tagging spec

You are tagging items from a personal wardrobe catalog (Traditional Chinese). For each item in your input file,
produce one JSON object. Output a JSON array of these objects, in the same order as the input.

## Input
Each input row: `id`, `name`, `category` (上衣/下身/洋裝/外套), `note`, `image` (absolute path to a JPG, or null).

If `image` is not null, open it with the Read tool and LOOK at the garment. The photo is the primary evidence for
color, pattern, sleeve and thickness. The name/note are secondary evidence. If the photo and name disagree on color,
trust the name's color word only when the photo is ambiguous (lighting, shadows).

## Output fields — use ONLY the allowed values, spelled exactly as shown

| field | type | allowed values |
|---|---|---|
| `id` | string | copy from input |
| `color` | string | exactly one of: 黑, 白, 米白, 灰, 卡其, 咖啡, 深藍, 藍, 綠, 粉, 紅, 黃, 紫, 橘, 金屬色, 多色 |
| `secondaryColors` | string[] | 0–2 values from the same color list (not including `color` itself; never 多色) |
| `hex` | string | `#RRGGBB` uppercase, your best estimate of the garment's main fabric color in the photo (ignore background, skin, hanger). If no image, pick a typical hex for `color`. |
| `pattern` | string | one of: 素色, 條紋, 格紋, 印花, 圓點, 拼色, 漸層, 其他 |
| `tone` | string | one of: 中性, 柔和, 鮮豔 |
| `seasons` | string[] | 1–4 values from: 春, 夏, 秋, 冬 — in that order |
| `warmth` | integer | 1–5 (1 = sheer/very thin, 2 = light, 3 = medium, 4 = thick, 5 = heavy/very warm) |
| `sleeve` | string | one of: 無袖, 短袖, 七分袖, 長袖, 不適用 |
| `styles` | string[] | 1–3 values from: 日常, 優雅, 正式, 甜美, 休閒, 復古, 度假, 個性 |
| `confidence` | string | `high` if you looked at a photo, `low` if image was null |

## Rules
- `color`: the single dominant color of the garment. Use 多色 only when no single color covers roughly half the garment.
  Map near-colors: 杏/奶茶/駝 → 卡其; 棕/咖 → 咖啡; 米/象牙 → 米白; 海軍藍/藏青 → 深藍; 淺藍/天藍/水藍 → 藍;
  墨綠/橄欖/薄荷 → 綠; 酒紅 → 紅; 金/銀/亮片 → 金屬色.
- `tone`: 中性 = 黑白灰米白卡其咖啡深藍 and other low-saturation colors; 柔和 = pastel/dusty/muted colors;
  鮮豔 = saturated, eye-catching colors.
- `seasons` and `warmth` must agree with each other: warmth 1–2 is almost never 冬; warmth 4–5 is almost never 夏.
  Use the note as a hint: 「春夏」→ 春/夏; 「春秋」→ 春/秋; 「微涼」→ usually 春/秋 and often 冬 if warmth ≥ 3.
- `sleeve`: for 下身 always 不適用. For 洋裝/上衣/外套 read it from the photo; the name often says it (無袖/短袖/七分袖/長袖).
  吊帶/細肩 → 無袖.
- `styles`: pick what a fashion-savvy friend would say. Don't pad — 1 or 2 is fine.
- No extra fields. No comments. No trailing commas. Valid JSON only.

## Example output element
{"id":"1","color":"黑","secondaryColors":[],"hex":"#1C1C1E","pattern":"素色","tone":"中性","seasons":["春","秋","冬"],"warmth":3,"sleeve":"不適用","styles":["日常","優雅"],"confidence":"high"}
