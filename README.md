# commit

[![Tags](https://img.shields.io/github/release/denosaurs/commit)](https://github.com/denosaurs/commit/releases)
[![CI Status](https://img.shields.io/github/workflow/status/denosaurs/commit/check)](https://github.com/denosaurs/commit/actions)
[![License](https://img.shields.io/github/license/denosaurs/commit)](https://github.com/denosaurs/commit/blob/master/LICENSE)

```typescript
import { parse } from "https://deno.land/x/commit/mod.ts";

const commit = parse("fix(std/io): utf-8 encoding");
console.log(commit);
/* {
  type: "fix",
  scope: "std/io",
  subject: "utf-8 encoding",
  merge: null,
  header: "fix(std/io): utf-8 encoding",
  body: null,
  footer: null,
  notes: [],
  references: [],
  mentions: [],
  revert: null
} */
```

## other

### contribution

Pull request, issues and feedback are very welcome. Code style is formatted with deno fmt and commit messages are done following Conventional Commits spec.

### licence

Copyright 2020-present, the denosaurs team. All rights reserved. MIT license.
