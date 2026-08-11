
## Commit kuralları

Commit mesajları İngilizce yazılır ve yardımcı araç atfı (`Co-authored-by`,
Claude/Anthropic satırları) içermez. Kural iki yerde zorlanır:

- **Yerel:** `.githooks/commit-msg`. Klon başına bir kez etkinleştir:
  `git config core.hooksPath .githooks`
- **Uzak:** CI'daki `commit-lint` işi, hem PR'larda hem `main`'e doğrudan
  push'larda kontrol eder.
