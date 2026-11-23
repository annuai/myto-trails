"""One-off pass that moved Dashline's layouts onto the Myto tokens.

    python3 tools/tokenize-layouts.py app/src/main/res

- text sizes become the type scale (@dimen/type_*), the way Myto's <Text variant> does;
- bold text becomes Geist semibold (Myto has no 700 weight in its UI);
- padding and margins snap to the 4dp space scale (6->8, 10->12, 14->16, 18->20...),
  the rule in the Myto design-token doc: snap, don't add a step.
Kept in the repo so the mapping is visible; safe to rerun (already-tokenised
values are left alone).
"""
import re
import sys
from pathlib import Path

TYPE = {11: "caption", 12: "caption", 13: "caption", 14: "label", 15: "label", 16: "body",
        17: "body", 18: "body", 19: "section", 20: "section", 21: "section", 22: "section",
        24: "title", 26: "hero", 28: "hero", 30: "hero"}
SPACE = [(0, None), (2, "space_half"), (4, "space_1"), (8, "space_2"), (12, "space_3"), (16, "space_4"),
         (20, "space_5"), (24, "space_6"), (32, "space_8"), (48, "space_12")]
SPACING_ATTR = re.compile(r'(android:(?:padding|layout_margin)(?:Start|End|Top|Bottom|Left|Right|Horizontal|Vertical)?)="(\d+)dp"')


def snap(value: int) -> str:
    # Halves round up (6->8, 10->12), as the token doc says.
    best = min(SPACE, key=lambda s: (abs(s[0] - value), -s[0]))
    return "0dp" if best[1] is None else f"@dimen/{best[1]}"


def convert(text: str) -> str:
    text = re.sub(r'android:textSize="(\d+)sp"',
                  lambda m: f'android:textSize="@dimen/type_{TYPE.get(int(m.group(1)), "body")}"', text)
    text = SPACING_ATTR.sub(lambda m: f'{m.group(1)}="{snap(int(m.group(2)))}"', text)
    text = re.sub(r'android:textStyle="bold"', 'android:fontFamily="@font/geist_semibold"', text)
    return text


def main(root: str) -> None:
    for path in sorted(Path(root).glob("layout*/*.xml")):
        before = path.read_text()
        after = convert(before)
        if after != before:
            path.write_text(after)
            print(f"tokenised {path}")


if __name__ == "__main__":
    main(sys.argv[1])
