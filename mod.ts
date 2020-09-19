import { parser } from "./parser.ts";
import { regex } from "./regex.ts";

export type Actions = string[] | null;
export type Correspondence = string[] | null;
export type Keywords = string[] | null;
export type Pattern = RegExp | null;
export type Prefixes = string[] | null;

export interface Options {
  /**
   * Pattern to match merge headers. EG: branch merge, GitHub or GitLab like pull
   * requests headers. When a merge header is parsed, the next line is used for
   * conventional header parsing.
   *
   * For example, if we have a commit
   *
   * ```text
   * Merge pull request #1 from user/feature/feature-name
   *
   * feat(scope): broadcast $destroy event on scope destruction
   * ```
   *
   * We can parse it with these options and the default headerPattern:
   *
   * ```javascript
   * {
   *  mergePattern: /^Merge pull request #(\d+) from (.*)$/,
   *  mergeCorrespondence: ['id', 'source']
   * }
   * ```
   *
   * @default
   * null
   */
  mergePattern?: Pattern;

  /**
   * Used to define what capturing group of `mergePattern`.
   *
   * If it's a `string` it will be converted to an `array` separated by a comma.
   *
   * @default
   * null
   */
  mergeCorrespondence?: Correspondence;

  /**
   * Used to match header pattern.
   *
   * @default
   * /^(\w*)(?:\(([\w\$\.\-\* ]*)\))?\: (.*)$/
   */
  headerPattern?: Pattern;

  /**
   * Used to define what capturing group of `headerPattern` captures what header
   * part. The order of the array should correspond to the order of
   * `headerPattern`'s capturing group. If the part is not captured it is `null`.
   * If it's a `string` it will be converted to an `array` separated by a comma.
   *
   * @default
   * ['type', 'scope', 'subject']
   */
  headerCorrespondence?: Correspondence;

  /**
   * Keywords to reference an issue. This value is case __insensitive__. If it's a
   * `string` it will be converted to an `array` separated by a comma.
   *
   * Set it to `null` to reference an issue without any action.
   *
   * @default
   * ['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved']
   */
  referenceActions?: Actions;

  /**
   * The prefixes of an issue. EG: In `gh-123` `gh-` is the prefix.
   *
   * @default
   * ['#']
   */
  issuePrefixes?: Prefixes;

  /**
   * Used to define if `issuePrefixes` should be considered case sensitive.
   *
   * @default
   * false
   */
  issuePrefixesCaseSensitive?: boolean;

  /**
   * Keywords for important notes. This value is case __insensitive__. If it's a
   * `string` it will be converted to an `array` separated by a comma.
   *
   * @default
   * ['BREAKING CHANGE']
   */
  noteKeywords?: Keywords;

  /**
   * Pattern to match other fields.
   *
   * @default
   * /^-(.*?)-$/
   */
  fieldPattern?: Pattern;

  /**
   * Pattern to match what this commit reverts.
   *
   * @default
   * /^Revert\s"([\s\S]*)"\s*This reverts commit (\w*)\./
   */
  revertPattern?: Pattern;

  /**
   * Used to define what capturing group of `revertPattern` captures what reverted
   * commit fields. The order of the array should correspond to the order of
   * `revertPattern`'s capturing group.
   *
   * For example, if we had commit
   *
   * ```
   * Revert "throw an error if a callback is passed"
   *
   * This reverts commit 9bb4d6c.
   * ```
   *
   * If configured correctly, the parsed result would be
   *
   * ```
   * {
   *  revert: {
   *    header: 'throw an error if a callback is passed',
   *    hash: '9bb4d6c'
   *  }
   * }
   * ```
   *
   * It implies that this commit reverts a commit with header `'throw an error if
   * a callback is passed'` and hash `'9bb4d6c'`.
   *
   * If it's a `string` it will be converted to an `array` separated by a comma.
   *
   * @default
   * ['header', 'hash']
   */
  revertCorrespondence?: Correspondence;

  /**
   * What commentChar to use. By default it is `null`, so no comments are stripped.
   * Set to `#` if you pass the contents of `.git/COMMIT_EDITMSG` directly.
   *
   * If you have configured the git commentchar via git config `core.commentchar`
   * you'll want to pass what you have set there.
   *
   * @default
   * null
   */
  commentChar?: string | null;

  /**
   * What warn function to use. For example, `console.warn.bind(console)` or
   * `grunt.log.writeln`. By default, it's a noop. If it is `true`, it will error
   * if commit cannot be parsed (strict).
   *
   * @default
   * function () {}
   */
  warn?: (message?: string) => void | boolean;
}

export type Commit<
  Fields extends string | number | symbol = string | number | symbol,
> = CommitBase & { [Field in Exclude<Fields, keyof CommitBase>]?: Field };

export type Field = string | null;

export interface Note {
  title: string;
  text: string;
}

export interface Reference {
  issue: string;

  /**
   * @default
   * null
   */
  action: Field;

  /**
   * @default
   * null
   */
  owner: Field;

  /**
   * @default
   * null
   */
  repository: Field;

  prefix: string;
  raw: string;
}

export interface Revert {
  hash?: Field;
  header?: Field;
  [field: string]: Field | undefined;
}

export interface CommitBase {
  /**
   * @default
   * null
   */
  merge: Field;

  /**
   * @default
   * null
   */
  header: Field;

  /**
   * @default
   * null
   */
  body: Field;

  /**
   * @default
   * null
   */
  footer: Field;

  /**
   * @default
   * []
   */
  notes: Note[];

  /**
   * @default
   * []
   */
  references: Reference[];

  /**
   * @default
   * []
   */
  mentions: string[];

  /**
   * @default
   * null
   */
  revert: Revert | null;

  type?: Field;
  scope?: Field;
  subject?: Field;
}

function assignOpts(options?: Options): Required<Options> {
  options = Object.assign(
    {
      headerPattern: /^(\w*)(?:\(([\w$.\-*/ ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      referenceActions: [
        "close",
        "closes",
        "closed",
        "fix",
        "fixes",
        "fixed",
        "resolve",
        "resolves",
        "resolved",
      ],
      issuePrefixes: ["#"],
      noteKeywords: ["BREAKING CHANGE"],
      fieldPattern: /^-(.*?)-$/,
      revertPattern: /^Revert\s"([\s\S]*)"\s*This reverts commit (\w*)\./,
      revertCorrespondence: ["header", "hash"],
      warn: function () {},
      mergePattern: null,
      mergeCorrespondence: null,
    },
    options,
  );

  return options as Required<Options>;
}

/**
 * The sync version. Useful when parsing a single commit. Returns the result.
 *
 * @param commit  A single commit to be parsed.
 * @param options Same as the `options` of `conventionalCommitsParser`.
 */
export function parse(commit?: string, options?: Options): Commit {
  options = assignOpts(options);
  const reg = regex(options);

  return parser(commit, options as Required<Options>, reg);
}
