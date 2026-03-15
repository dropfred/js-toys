# Secret Pad

Super simple encrypt/decrypt pad.

The code looks a bit odd because I tried to balance between readable and minifier friendly code.

## Usage

Assuming default options:

- `📋` / `Ctrl-C`: Encrypt text and copy to clipboard.
- `💾` / `Ctrl-S`: Encrypt text and save to file.
- `Ctrl-V`: Decrypt clipboard file or text if necessary, and insert it at cursor position.
- `Drop`: Decrypt dropped file or text if necessary, and replace current text.

[live](https://dropfred.github.io/js-toys/ez-lock/test.html)

## Code customization:

- `MAGIC`: Prefix string used to distinguish Base64-encoded encrypted text from plain text. Defaults to `🔒`.
- `BOOKMARKLET`: Specify whether the code is intended to be used as a bookmarklet. Default to `true`.
- `DOTS`: Use `password` inputs if `true`, plain text otherwise. Default to `true`.
- `FMT`: Boolean specifying if encrypted data is formatted or not. Default to `true`.
- `DND`: Drag and drop support if `true`. Default to `true`.
- `KBD`: Support for `ctrl-c` / `ctrl-v` and `ctrl-s` support if `true`. Default to `true`.
- `DBG`: Log errors if `true`. Default to `false`.
- `SETTINGS`: specify default text area size, and Base64-encoded data line length (if `FMT` is on). Defaults to `{cols: 40, rows: 30, fmt: 80}`

Disabling options reduces the minified size.

If you prefer to run the script as a page instead of a bookmarklet, set `BOOKMARKLET` to `false`, and add `<script>import("./ez-log.js");</script>` in the HTML code.