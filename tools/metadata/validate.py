"""檢查 metadata.json 是否符合 SPEC.md 的格式，並列出還沒有 metadata 的衣服。

用法（在專案根目錄）：python tools/metadata/validate.py
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

COLORS = ['黑', '白', '米白', '灰', '卡其', '咖啡', '深藍', '藍', '綠', '粉', '紅', '黃', '紫', '橘', '金屬色', '多色']
PATTERNS = ['素色', '條紋', '格紋', '印花', '圓點', '拼色', '漸層', '其他']
TONES = ['中性', '柔和', '鮮豔']
SEASONS = ['春', '夏', '秋', '冬']
SLEEVES = ['無袖', '短袖', '七分袖', '長袖', '不適用']
STYLES = ['日常', '優雅', '正式', '甜美', '休閒', '復古', '度假', '個性']
FIELDS = {'color', 'secondaryColors', 'hex', 'pattern', 'tone', 'seasons', 'warmth', 'sleeve', 'styles', 'confidence'}


def check(item, meta):
    errors = []
    if set(meta) != FIELDS:
        errors.append(f'欄位不符 {sorted(set(meta) ^ FIELDS)}')
    if meta.get('color') not in COLORS:
        errors.append(f'color={meta.get("color")}')
    secondary = meta.get('secondaryColors')
    if not isinstance(secondary, list) or len(secondary) > 2 or any(
        c not in COLORS or c in ('多色', meta.get('color')) for c in secondary
    ):
        errors.append(f'secondaryColors={secondary}')
    if not re.fullmatch(r'#[0-9A-F]{6}', str(meta.get('hex', ''))):
        errors.append(f'hex={meta.get("hex")}')
    if meta.get('pattern') not in PATTERNS:
        errors.append(f'pattern={meta.get("pattern")}')
    if meta.get('tone') not in TONES:
        errors.append(f'tone={meta.get("tone")}')
    seasons = meta.get('seasons')
    if (
        not isinstance(seasons, list)
        or not seasons
        or any(s not in SEASONS for s in seasons)
        or seasons != sorted(set(seasons), key=SEASONS.index)
    ):
        errors.append(f'seasons={seasons}')
    warmth = meta.get('warmth')
    if not isinstance(warmth, int) or not 1 <= warmth <= 5:
        errors.append(f'warmth={warmth}')
    if meta.get('sleeve') not in SLEEVES:
        errors.append(f'sleeve={meta.get("sleeve")}')
    styles = meta.get('styles')
    if not isinstance(styles, list) or not 1 <= len(styles) <= 3 or any(s not in STYLES for s in styles):
        errors.append(f'styles={styles}')
    if meta.get('confidence') not in ('high', 'low'):
        errors.append(f'confidence={meta.get("confidence")}')

    if item['category'] == '下身' and meta.get('sleeve') != '不適用':
        errors.append('下身的 sleeve 應該是 不適用')
    # 內搭衣薄但冬天會穿在裡面，不套用厚度與季節的一致性檢查
    if isinstance(warmth, int) and isinstance(seasons, list) and '內搭' not in item['name']:
        if warmth <= 2 and '冬' in seasons:
            errors.append(f'warmth {warmth} 卻標了冬')
        if warmth >= 4 and '夏' in seasons:
            errors.append(f'warmth {warmth} 卻標了夏')
    return errors


def main():
    data = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
    metadata = json.load(open(os.path.join(ROOT, 'metadata.json'), encoding='utf-8'))
    by_id = {item['id']: item for item in data}

    missing = [item for item in data if item['id'] not in metadata]
    unknown = [i for i in metadata if i not in by_id]
    invalid = {i: check(by_id[i], meta) for i, meta in metadata.items() if i in by_id}
    invalid = {i: e for i, e in invalid.items() if e}

    print(f'metadata {len(metadata)} 筆 / 衣服 {len(data)} 件')
    for item in missing:
        print(f'  缺少 metadata：id {item["id"]} {item["name"]}')
    for i in unknown:
        print(f'  data.json 裡沒有這個 id：{i}')
    for i, errors in invalid.items():
        print(f'  id {i} {by_id[i]["name"]}：{"；".join(errors)}')

    if missing or unknown or invalid:
        sys.exit(1)
    print('全部通過')


if __name__ == '__main__':
    main()
