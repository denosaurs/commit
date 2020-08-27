import { parse, Options } from "./mod.ts";

import { assertEquals, assertThrows } from "./test_deps.ts";

const options: Options = {
  revertPattern: /^Revert\s"([\s\S]*)"\s*This reverts commit (.*)\.$/,
  revertCorrespondence: ["header", "hash"],
  fieldPattern: /^-(.*?)-$/,
  headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
  headerCorrespondence: ["type", "scope", "subject"],
  noteKeywords: ["BREAKING AMEND"],
  issuePrefixes: ["#", "gh-"],
  referenceActions: ["kill", "kills", "killed", "handle", "handles", "handled"],
};

Deno.test({
  name: "meta | expect raw commits",
  fn(): void {
    assertThrows(() => parse());
    assertThrows(() => parse(""));
    assertThrows(() => parse(" \n "));
  },
});

Deno.test({
  name: "parse | trim extra lines",
  fn(): void {
    assertEquals(
      parse(
        "\n\n\n\n\n\n\nfeat(scope): broadcast $destroy event on scope destruction\n\n\n" +
          "\n\n\nperf testing shows that in chrome this change adds 5-15% overhead\n" +
          "\n\n\nwhen destroying 10k nested scopes where each scope has a $destroy listener\n\n" +
          "\n\n\n\nBREAKING AMEND: some breaking change\n" +
          "\n\n\n\nBREAKING AMEND: An awesome breaking change\n\n\n```\ncode here\n```" +
          "\n\nKills #1\n" +
          "\n\n\nkilled #25\n\n\n\n\n",
        options,
      ),
      {
        merge: null,
        header: "feat(scope): broadcast $destroy event on scope destruction",
        body:
          "perf testing shows that in chrome this change adds 5-15% overhead\n\n\n\nwhen destroying 10k nested scopes where each scope has a $destroy listener",
        footer:
          "BREAKING AMEND: some breaking change\n\n\n\n\nBREAKING AMEND: An awesome breaking change\n\n\n```\ncode here\n```\n\nKills #1\n\n\n\nkilled #25",
        notes: [
          {
            title: "BREAKING AMEND",
            text: "some breaking change",
          },
          {
            title: "BREAKING AMEND",
            text: "An awesome breaking change\n\n\n```\ncode here\n```",
          },
        ],
        references: [
          {
            action: "Kills",
            owner: null,
            repository: null,
            issue: "1",
            raw: "#1",
            prefix: "#",
          },
          {
            action: "killed",
            owner: null,
            repository: null,
            issue: "25",
            raw: "#25",
            prefix: "#",
          },
        ],
        mentions: [],
        revert: null,
        scope: "scope",
        subject: "broadcast $destroy event on scope destruction",
        type: "feat",
      },
    );
  },
});

Deno.test({
  name: "parse | keep spaces",
  fn(): void {
    assertEquals(
      parse(
        " feat(scope): broadcast $destroy event on scope destruction \n" +
          " perf testing shows that in chrome this change adds 5-15% overhead \n\n" +
          " when destroying 10k nested scopes where each scope has a $destroy listener \n" +
          "         BREAKING AMEND: some breaking change         \n\n" +
          "   BREAKING AMEND: An awesome breaking change\n\n\n```\ncode here\n```" +
          "\n\n    Kills   #1\n",
        options,
      ),
      {
        merge: null,
        header: " feat(scope): broadcast $destroy event on scope destruction ",
        body:
          " perf testing shows that in chrome this change adds 5-15% overhead \n\n when destroying 10k nested scopes where each scope has a $destroy listener ",
        footer:
          "         BREAKING AMEND: some breaking change         \n\n   BREAKING AMEND: An awesome breaking change\n\n\n```\ncode here\n```\n\n    Kills   #1",
        notes: [
          {
            title: "BREAKING AMEND",
            text: "some breaking change         ",
          },
          {
            title: "BREAKING AMEND",
            text: "An awesome breaking change\n\n\n```\ncode here\n```",
          },
        ],
        references: [
          {
            action: "Kills",
            owner: null,
            repository: null,
            issue: "1",
            raw: "#1",
            prefix: "#",
          },
        ],
        mentions: [],
        revert: null,
        scope: null,
        subject: null,
        type: null,
      },
    );
  },
});

Deno.test({
  name: "parse | ignore comments",
  fn(): void {
    var commentOptions = Object.assign({}, options, { commentChar: "#" });
    assertEquals(parse("# comment", commentOptions), {
      merge: null,
      header: null,
      body: null,
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
    assertEquals(parse(" # non-comment", commentOptions), {
      merge: null,
      header: " # non-comment",
      body: null,
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
    assertEquals(parse("header\n# comment\n\nbody", commentOptions), {
      merge: null,
      header: "header",
      body: "body",
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
  },
});

Deno.test({
  name: "parse | respect comments",
  fn(): void {
    var commentOptions = Object.assign({}, options, { commentChar: "*" });
    assertEquals(parse("* comment", commentOptions), {
      merge: null,
      header: null,
      body: null,
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
    assertEquals(parse("# non-comment", commentOptions), {
      merge: null,
      header: "# non-comment",
      body: null,
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
    assertEquals(parse(" * non-comment", commentOptions), {
      merge: null,
      header: " * non-comment",
      body: null,
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
    assertEquals(parse("header\n* comment\n\nbody", commentOptions), {
      merge: null,
      header: "header",
      body: "body",
      footer: null,
      notes: [],
      references: [],
      mentions: [],
      revert: null,
      scope: null,
      subject: null,
      type: null,
    });
  },
});

Deno.test({
  name: "parse | scissor line",
  fn(): void {
    assertEquals(
      parse(
        "this is some header before a scissors-line\n" +
          "# ------------------------ >8 ------------------------\n" +
          "this is a line that should be truncated\n",
        options,
      ).body,
      null,
    );
    assertEquals(
      parse(
        "this is some header before a scissors-line\n" +
          "# ------------------------ >8 ------------------------\n" +
          "this is a line that should be truncated\n",
        options,
      ).header,
      "this is some header before a scissors-line",
    );
    assertEquals(
      parse(
        "this is some header before a scissors-line\n" +
          "this is some body before a scissors-line\n" +
          "# ------------------------ >8 ------------------------\n" +
          "this is a line that should be truncated\n",
        options,
      ).body,
      "this is some body before a scissors-line",
    );
  },
});

Deno.test({
  name: "parse | mentions",
  fn(): void {
    let mentionOptions: Options = {
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      mergePattern: /^Merge pull request #(\d+) from (.*)$/,
      mergeCorrespondence: ["issueId", "source"],
    };
    assertEquals(
      parse(
        "@Steve\n" +
          "@conventional-changelog @someone" +
          "\n" +
          "perf testing shows that in chrome this change adds 5-15% overhead\n" +
          "@this is",
        mentionOptions,
      ).mentions,
      ["Steve", "conventional-changelog", "someone", "this"],
    );
  },
});

Deno.test({
  name: "parse | merge | general",
  fn(): void {
    let mergeOptions: Options = {
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      mergePattern: /^Merge branch '(\w+)'$/,
      mergeCorrespondence: ["source", "issueId"],
    };
    const general = parse("Merge branch 'feature'\nHEADER", mergeOptions);
    assertEquals(general.source, "feature");
    assertEquals(general.issueId, null);
  },
});

Deno.test({
  name: "parse | merge | github",
  fn(): void {
    let githubOptions = {
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      mergePattern: /^Merge pull request #(\d+) from (.*)$/,
      mergeCorrespondence: ["issueId", "source"],
    };

    const github = parse(
      "Merge pull request #1 from user/feature/feature-name\n" +
        "\n" +
        "feat(scope): broadcast $destroy event on scope destruction\n" +
        "\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener",
      githubOptions,
    );
    assertEquals(
      github.header,
      "feat(scope): broadcast $destroy event on scope destruction",
    );
    assertEquals(github.type, "feat");
    assertEquals(github.scope, "scope");
    assertEquals(
      github.subject,
      "broadcast $destroy event on scope destruction",
    );
    assertEquals(
      github.merge,
      "Merge pull request #1 from user/feature/feature-name",
    );
    assertEquals(github.issueId, "1");
    assertEquals(github.source, "user/feature/feature-name");
  },
});

Deno.test({
  name: "parse | merge | gitlab",
  fn(): void {
    let gitlabOptions = {
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      mergePattern: /^Merge branch '([^']+)' into '[^']+'$/,
      mergeCorrespondence: ["source"],
    };

    const gitlab = parse(
      "Merge branch 'feature/feature-name' into 'master'\r\n" +
        "\r\n" +
        "feat(scope): broadcast $destroy event on scope destruction\r\n" +
        "\r\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\r\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\r\n" +
        "\r\n" +
        "See merge request !1",
      gitlabOptions,
    );
    assertEquals(
      gitlab.header,
      "feat(scope): broadcast $destroy event on scope destruction",
    );
    assertEquals(gitlab.type, "feat");
    assertEquals(gitlab.scope, "scope");
    assertEquals(
      gitlab.subject,
      "broadcast $destroy event on scope destruction",
    );
    assertEquals(
      gitlab.merge,
      "Merge branch 'feature/feature-name' into 'master'",
    );
    assertEquals(gitlab.source, "feature/feature-name");
  },
});

Deno.test({
  name: "parse | header | allow : in scope",
  fn(): void {
    let msg = parse("feat(ng:list): Allow custom separator", {
      headerPattern: /^(\w*)(?:\(([:\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
    });
    assertEquals(msg.scope, "ng:list");
  },
});

Deno.test({
  name: "parse | header | null if not parsed",
  fn(): void {
    let msg = parse("header", options);
    assertEquals(msg.type, null);
    assertEquals(msg.scope, null);
    assertEquals(msg.subject, null);
  },
});

Deno.test({
  name: "parse | header | parse",
  fn(): void {
    let msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND: some breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3 kills repo#77\n" +
        "kills stevemao/conventional-commits-parser#1",
      options,
    );
    assertEquals(msg.type, "feat");
    assertEquals(msg.scope, "scope");
    assertEquals(msg.subject, "broadcast $destroy event on scope destruction");
  },
});

Deno.test({
  name: "parse | header | correspondence",
  fn(): void {
    let msg = parse("scope(my subject): fix this", {
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["scope", "subject", "type"],
    });
    assertEquals(msg.type, "fix this");
    assertEquals(msg.scope, "scope");
    assertEquals(msg.subject, "my subject");
  },
});

Deno.test({
  name: "parse | header | undefined correspondence",
  fn(): void {
    let msg = parse("scope(my subject): fix this", {
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["scop", "subject"],
    });
    assertEquals(msg.scope, undefined);
  },
});

Deno.test({
  name: "parse | header | reference issue with an owner",
  fn(): void {
    let msg = parse("handled angular/angular.js#1", options);
    assertEquals(msg.references, [
      {
        action: "handled",
        owner: "angular",
        repository: "angular.js",
        issue: "1",
        raw: "angular/angular.js#1",
        prefix: "#",
      },
    ]);
  },
});

Deno.test({
  name: "parse | header | reference issue with a repository",
  fn(): void {
    let msg = parse("handled angular.js#1", options);
    assertEquals(msg.references, [
      {
        action: "handled",
        owner: null,
        repository: "angular.js",
        issue: "1",
        raw: "angular.js#1",
        prefix: "#",
      },
    ]);
  },
});

Deno.test({
  name: "parse | header | reference issue",
  fn(): void {
    let msg = parse("handled gh-1", options);
    assertEquals(msg.references, [
      {
        action: "handled",
        owner: null,
        repository: null,
        issue: "1",
        raw: "gh-1",
        prefix: "gh-",
      },
    ]);
  },
});

Deno.test({
  name: "parse | header | reference issue without action",
  fn(): void {
    let options = {
      revertPattern: /^Revert\s"([\s\S]*)"\s*This reverts commit (.*)\.$/,
      revertCorrespondence: ["header", "hash"],
      fieldPattern: /^-(.*?)-$/,
      headerPattern: /^(\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
      noteKeywords: ["BREAKING AMEND"],
      issuePrefixes: ["#", "gh-"],
    };

    let msg = parse("This is gh-1", options);
    assertEquals(msg.references, [
      {
        action: null,
        owner: null,
        repository: null,
        issue: "1",
        raw: "This is gh-1",
        prefix: "gh-",
      },
    ]);
  },
});

Deno.test({
  name: "parse | body | null if not parsed",
  fn(): void {
    let msg = parse("header", options);
    assertEquals(msg.body, null);
  },
});

Deno.test({
  name: "parse | body | parse",
  fn(): void {
    let msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND: some breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3 kills repo#77\n" +
        "kills stevemao/conventional-commits-parser#1",
      options,
    );
    assertEquals(
      msg.body,
      "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener",
    );
  },
});

Deno.test({
  name: "parse | footer | null if not parsed",
  fn(): void {
    let msg = parse("header", options);
    assertEquals(msg.footer, null);
  },
});

Deno.test({
  name: "parse | footer | parse",
  fn(): void {
    let msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND: some breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3 kills repo#77\n" +
        "kills stevemao/conventional-commits-parser#1",
      options,
    );
    assertEquals(
      msg.footer,
      "BREAKING AMEND: some breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3 kills repo#77\n" +
        "kills stevemao/conventional-commits-parser#1",
    );
    assertEquals(msg.notes[0], {
      title: "BREAKING AMEND",
      text: "some breaking change",
    });
  },
});

Deno.test({
  name: "parse | footer | notes",
  fn(): void {
    let simpleMsg = parse("chore: some chore");
    assertEquals(simpleMsg.notes, []);
    let msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND: some breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3 kills repo#77\n" +
        "kills stevemao/conventional-commits-parser#1",
      options,
    );
    assertEquals(msg.notes[0], {
      title: "BREAKING AMEND",
      text: "some breaking change",
    });
    let longMsg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND:\n" +
        "some breaking change\n" +
        "some other breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3",
      options,
    );
    assertEquals(longMsg.notes[0], {
      title: "BREAKING AMEND",
      text: "some breaking change\nsome other breaking change",
    });
  },
});

Deno.test({
  name: "parse | footer | references",
  fn(): void {
    let simpleMsg = parse("chore: some chore");
    assertEquals(simpleMsg.references, []);
    let msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND: some breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3 kills repo#77\n" +
        "kills stevemao/conventional-commits-parser#1",
      options,
    );
    assertEquals(msg.references, [
      {
        action: "Kills",
        owner: null,
        repository: null,
        issue: "1",
        raw: "#1",
        prefix: "#",
      },
      {
        action: "Kills",
        owner: null,
        repository: null,
        issue: "123",
        raw: ", #123",
        prefix: "#",
      },
      {
        action: "killed",
        owner: null,
        repository: null,
        issue: "25",
        raw: "#25",
        prefix: "#",
      },
      {
        action: "handle",
        owner: null,
        repository: null,
        issue: "33",
        raw: "#33",
        prefix: "#",
      },
      {
        action: "handle",
        owner: null,
        repository: null,
        issue: "100",
        raw: ", Closes #100",
        prefix: "#",
      },
      {
        action: "Handled",
        owner: null,
        repository: null,
        issue: "3",
        raw: "#3",
        prefix: "#",
      },
      {
        action: "kills",
        owner: null,
        repository: "repo",
        issue: "77",
        raw: "repo#77",
        prefix: "#",
      },
      {
        action: "kills",
        owner: "stevemao",
        repository: "conventional-commits-parser",
        issue: "1",
        raw: "stevemao/conventional-commits-parser#1",
        prefix: "#",
      },
    ]);
    let longMsg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "BREAKING AMEND:\n" +
        "some breaking change\n" +
        "some other breaking change\n" +
        "Kills #1, #123\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3",
      options,
    );
    assertEquals(longMsg.notes[0], {
      title: "BREAKING AMEND",
      text: "some breaking change\nsome other breaking change",
    });
  },
});

Deno.test({
  name: "parse | footer | after references in footer",
  fn(): void {
    var msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "Kills #1, #123\n" +
        "what\n" +
        "killed #25\n" +
        "handle #33, Closes #100, Handled #3\n" +
        "other",
      options,
    );

    assertEquals(
      msg.footer,
      "Kills #1, #123\nwhat\nkilled #25\nhandle #33, Closes #100, Handled #3\nother",
    );
  },
});

Deno.test({
  name: "parse | footer | after references in footer",
  fn(): void {
    var msg = parse(
      "feat(scope): broadcast $destroy event on scope destruction\n" +
        "perf testing shows that in chrome this change adds 5-15% overhead\n" +
        "when destroying 10k nested scopes where each scope has a $destroy listener\n" +
        "Kills #1, #123\n" +
        "BREAKING AMEND: some breaking change\n",
      options,
    );

    assertEquals(msg.notes[0], {
      title: "BREAKING AMEND",
      text: "some breaking change",
    });
    assertEquals(msg.references, [
      {
        action: "Kills",
        owner: null,
        repository: null,
        issue: "1",
        raw: "#1",
        prefix: "#",
      },
      {
        action: "Kills",
        owner: null,
        repository: null,
        issue: "123",
        raw: ", #123",
        prefix: "#",
      },
    ]);
    assertEquals(
      msg.footer,
      "Kills #1, #123\nBREAKING AMEND: some breaking change",
    );
  },
});

Deno.test({
  name: "other | parse hash",
  fn(): void {
    var msg = parse(
      "My commit message\n" +
        "-hash-\n" +
        "9b1aff905b638aa274a5fc8f88662df446d374bd",
      options,
    );

    assertEquals(msg.hash, "9b1aff905b638aa274a5fc8f88662df446d374bd");
  },
});

Deno.test({
  name: "other | parse sideNotes",
  fn(): void {
    var msg = parse(
      "My commit message\n" +
        "-sideNotes-\n" +
        "It should warn the correct unfound file names.\n" +
        "Also it should continue if one file cannot be found.\n" +
        "Tests are added for these",
      options,
    );

    assertEquals(
      msg.sideNotes,
      "It should warn the correct unfound file names.\n" +
        "Also it should continue if one file cannot be found.\n" +
        "Tests are added for these",
    );
  },
});

Deno.test({
  name: "other | parse committer name and email",
  fn(): void {
    var msg = parse(
      "My commit message\n" +
        "-committerName-\n" +
        "Steve Mao\n" +
        "- committerEmail-\n" +
        "test@github.com",
      options,
    );

    assertEquals(msg.committerName, "Steve Mao");
    assertEquals(msg[" committerEmail"], "test@github.com");
  },
});

Deno.test({
  name: "revert | parse",
  fn(): void {
    var msg = parse(
      'Revert "throw an error if a callback is passed to animate methods"\n\n' +
        "This reverts commit 9bb4d6ccbe80b7704c6b7f53317ca8146bc103ca.",
      options,
    );

    assertEquals(msg.revert, {
      header: "throw an error if a callback is passed to animate methods",
      hash: "9bb4d6ccbe80b7704c6b7f53317ca8146bc103ca",
    });
  },
});

Deno.test({
  name: "revert | parse lazy",
  fn(): void {
    var msg = parse('Revert ""\n\n' + "This reverts commit .", options);

    assertEquals(msg.revert, {
      header: null,
      hash: null,
    });
  },
});
